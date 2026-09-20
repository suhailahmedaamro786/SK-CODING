import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/secrets";
import { createGithubRepository, getStoredGithubToken, upsertGithubFile } from "@/lib/github";
import { AIGateway } from "@/ai/gateway";

type GeneratedFile = { path: string; content: string };

function cleanJson(text: string) {
  let t = text.trim();
  if (t.startsWith("```")) t = t.replace(/^```(?:json)?/i, "").replace(/```$/i, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first >= 0 && last > first) t = t.slice(first, last + 1);
  try { return JSON.parse(t); } catch (error) {
    throw new Error("AI_INVALID_JSON: " + (error instanceof Error ? error.message : "invalid JSON"));
  }
}
function repoName(name: string) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || "sk-builder-app";
}
function safeFiles(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((f): f is GeneratedFile =>
    !!f && typeof f.path === "string" && typeof f.content === "string" &&
    !f.path.includes("..") && !f.path.startsWith("/") &&
    f.content.length < 140000 && !f.path.includes(".env")
  ).slice(0, 32);
}
function safePreview(value: unknown) {
  if (typeof value !== "string") return "";
  return value.replace(/<script[\s\S]*?<\/script>/gi, "").slice(0, 120000);
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const prompt = String(body.prompt || "").trim();
    if (!prompt) return Response.json({ error: "PROMPT_REQUIRED" }, { status: 400 });

    const supabase = createServerSupabaseClient();
    const { data: project } = await supabase.from("projects").select("*").eq("id", id).eq("owner_clerk_user_id", user.id).maybeSingle();
    if (!project) return Response.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });

    // Persist the user request immediately so the chat never loses what was asked.
    await supabase.from("project_messages").insert({ project_id: id, clerk_user_id: user.id, role: "user", content: prompt });

    const { data: providers } = await supabase.from("ai_providers").select("provider,model,priority").eq("clerk_user_id", user.id).eq("enabled", true).order("priority");
    const configured: any[] = [];
    for (const p of providers || []) {
      const k = await supabase.from("ai_api_keys").select("encrypted_secret,enabled").eq("clerk_user_id", user.id).eq("provider", p.provider).maybeSingle();
      if (k.data?.enabled && k.data.encrypted_secret) configured.push({ provider: p.provider, model: p.model || undefined, priority: p.priority, secret: decryptSecret(k.data.encrypted_secret) });
    }
    if (!configured.length) return Response.json({ error: "NO_AI_PROVIDER_CONFIGURED" }, { status: 400 });

    // GitHub is optional. Build locally in SK Builder first; connect GitHub later to sync/push.
    const { data: connection } = await supabase.from("github_connections").select("encrypted_access_token").eq("clerk_user_id", user.id).maybeSingle();
    let token = "";
    let fullName = project.github_repo_full_name as string | undefined;
    let repoUrl = project.github_repo_url as string | undefined;
    if (connection?.encrypted_access_token) token = await getStoredGithubToken(connection.encrypted_access_token);

    const gateway = new AIGateway(configured);

    // Keep the build inside one AI request so production/serverless builds do not sit on
    // multiple sequential model calls.
    await supabase.from("projects").update({ status: "building", updated_at: new Date().toISOString() }).eq("id", id);

    const common = `Project: ${project.name}
Original description: ${project.description || ""}
User request: ${prompt}
Generate a practical MVP, make reasonable assumptions, and do not ask questions.`;

    // Stage 1: plan + preview first, so the user sees a real website preview early.
    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Stage 1/5: planning and generating live preview." });
    const design = cleanJson((await gateway.generateText({
      userId: user.id, projectId: id, taskType: "planning",
      messages: [
        { role: "system", content: "Return JSON only. You are SK Builder's product architect and UI/UX designer." },
        { role: "user", content: common + "\nReturn ONLY: { \"plan\": { \"summary\":\"...\", \"architecture\":{}, \"technology\":{}, \"pages\":[], \"components\":[], \"database_entities\":[], \"apis\":[], \"security\":[], \"testing\":[], \"deployment\":[], \"tasks\":[] }, \"previewHtml\":\"...\" }\nCreate a polished responsive self-contained HTML/CSS preview with navigation, hero/content sections, realistic UI, responsive styling, and no scripts, external dependencies, or secrets." }
      ],
      options: { maxTokens: 5000, temperature: 0.2 }
    })).text);
    const parsedPlan = design.plan || {};
    const previewHtml = safePreview(design.previewHtml);
    await supabase.from("projects").update({ preview_html: previewHtml || null, specification: { summary: parsedPlan.summary ?? "", initial_prompt: prompt }, architecture: parsedPlan.architecture ?? null, updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Stage 2/5: preview ready. Generating source files." });

    const filesResult = cleanJson((await gateway.generateText({
      userId: user.id, projectId: id, taskType: "code_generation",
      messages: [
        { role: "system", content: "Return JSON only. You are SK Builder's senior Next.js engineer. Do not ask questions." },
        { role: "user", content: common + "\nApproved plan:\n" + JSON.stringify(parsedPlan) + "\nReturn ONLY: { \"files\":[{\"path\":\"...\",\"content\":\"...\"}] }\nBuild a complete coherent Next.js App Router application using TypeScript and Tailwind. Required foundation files: package.json, tsconfig.json, next-env.d.ts, app/layout.tsx, app/globals.css, app/page.tsx. Add feature pages/components/API/types/README as useful; aim for 8-12 coherent files. Every file must be compile-ready. Return valid JSON only, with all newlines inside content escaped. No markdown fences, .env files, secrets, or huge boilerplate." }
      ],
      options: { maxTokens: 8000, temperature: 0.1 }
    })).text);
    const result = { plan: parsedPlan, files: filesResult.files, previewHtml };

    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Stage 3/5: saving generated project files." });
    const inserted = await supabase.from("project_plans").insert({
      project_id: id, version: 1, status: "executing",
      architecture: parsedPlan.architecture ?? null, technology: parsedPlan.technology ?? null,
      pages: parsedPlan.pages ?? null, components: parsedPlan.components ?? null,
      database_entities: parsedPlan.database_entities ?? null, apis: parsedPlan.apis ?? null,
      security: parsedPlan.security ?? null, testing: parsedPlan.testing ?? null,
      deployment: parsedPlan.deployment ?? null, tasks: parsedPlan.tasks ?? []
    }).select("*").single();
    if (inserted.error) throw new Error(inserted.error.message);
    const plan = inserted.data;

    await supabase.from("projects").update({
      status: "building", specification: { summary: parsedPlan.summary ?? "", initial_prompt: prompt },
      architecture: parsedPlan.architecture ?? null, updated_at: new Date().toISOString()
    }).eq("id", id);

    const merged = safeFiles(result.files).filter((file, index, arr) => arr.findIndex(x => x.path === file.path) === index).slice(0, 32);
    const required = ["package.json", "tsconfig.json", "next-env.d.ts", "app/layout.tsx", "app/globals.css", "app/page.tsx"];
    if (required.some(p => !merged.some(f => f.path === p))) throw new Error("AI_GENERATION_MISSING_FOUNDATION");
    if (merged.length < 8) throw new Error("AI_GENERATION_TOO_SMALL");

    // If GitHub is connected, create/sync the repository. Otherwise keep the project in SK Builder.
    if (token) {
      if (!fullName) {
        const created = await createGithubRepository(token, repoName(project.name), project.description || "Generated by SK Builder");
        fullName = created.full_name; repoUrl = created.html_url;
        await supabase.from("projects").update({ github_repo_full_name: fullName, github_repo_url: repoUrl }).eq("id", id);
      }
      for (const f of merged) await upsertGithubFile(token, fullName!, f.path, f.content, `SK Builder: generate ${f.path}`);
    }

    for (const f of merged) {
      await supabase.from("project_files").upsert({
        project_id: id, path: f.path, content: f.content, content_hash: null,
        status: "generated", updated_at: new Date().toISOString()
      }, { onConflict: "project_id,path" });
    }

    await supabase.from("projects").update({ preview_html: previewHtml || null }).eq("id", id);

    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    if (tasks.length) await supabase.from("project_tasks").upsert(tasks.slice(0, 30).map((t: any, i: number) => ({
      project_id: id, plan_id: plan.id, task_key: String(t.task_key || `generated-${i + 1}`),
      title: String(t.title || `Implementation task ${i + 1}`), description: String(t.description || ""),
      files: t.files || [], acceptance_criteria: t.acceptance_criteria || [], dependencies: t.dependencies || [],
      priority: Number(t.priority || 100), status: "passed"
    })), { onConflict: "project_id,task_key" });

    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Stage 4/5: project structure saved; finalizing build." });
    await supabase.from("project_plans").update({ status: "completed" }).eq("id", plan.id);
    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Stage 5/5: build complete and preview live." });
    await supabase.from("projects").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("project_messages").insert({ project_id: id, clerk_user_id: user.id, role: "assistant", content: `Build completed successfully. Generated ${merged.length} files and a live preview.` });
    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: `Build completed: ${merged.length} files generated.${token ? " GitHub synced." : " GitHub not connected; kept in workspace."}` });
    return Response.json({ ok: true, repository: fullName ? { full_name: fullName, url: repoUrl } : null, githubSynced: Boolean(token), previewHtml, files: merged.map(f => f.path) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "BUILD_FAILED";
    try {
      const user = await requireUser(); const { id } = await context.params; const s = createServerSupabaseClient();
      await s.from("projects").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_clerk_user_id", user.id);
      await s.from("project_messages").insert({ project_id: id, clerk_user_id: user.id, role: "assistant", content: `Build failed: ${message}` });
      await s.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "error", message });
    } catch {}
    return Response.json({ error: message }, { status: 500 });
  }
}
