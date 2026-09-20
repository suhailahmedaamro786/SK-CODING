import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/secrets";
import { createGithubRepository, getStoredGithubToken, upsertGithubFile } from "@/lib/github";
import { AIGateway } from "@/ai/gateway";

type GeneratedFile = { path: string; content: string };

function cleanJson(text: string) {
  const t = text.replace(/^\u0060\u0060\u0060json\s*/i, "").replace(/\s*\u0060\u0060\u0060$/i, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : t);
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
    let { data: plan } = await supabase.from("project_plans").select("*").eq("project_id", id).order("version", { ascending: false }).limit(1).maybeSingle();

    if (!plan) {
      const planText = await gateway.generateText({
        userId: user.id, projectId: id, taskType: "planning",
        messages: [
          { role: "system", content: "Return JSON only. You are SK Builder's product architect." },
          { role: "user", content: `Create a practical MVP plan from this user's request. Do not ask questions. Make reasonable minimal assumptions. Use Next.js App Router, TypeScript, Tailwind and Supabase where useful. Return keys: summary, architecture, technology, pages, components, database_entities, apis, security, testing, deployment, tasks. User request: ${prompt}` }
        ],
        options: { maxTokens: 5000, temperature: 0.1 }
      });
      const parsed = cleanJson(planText.text);
      const inserted = await supabase.from("project_plans").insert({
        project_id: id, version: 1, status: "draft",
        architecture: parsed.architecture ?? null, technology: parsed.technology ?? null,
        pages: parsed.pages ?? null, components: parsed.components ?? null,
        database_entities: parsed.database_entities ?? null, apis: parsed.apis ?? null,
        security: parsed.security ?? null, testing: parsed.testing ?? null,
        deployment: parsed.deployment ?? null, tasks: parsed.tasks ?? []
      }).select("*").single();
      if (inserted.error) throw new Error(inserted.error.message);
      plan = inserted.data;
      await supabase.from("projects").update({
        status: "planning", specification: { summary: parsed.summary ?? "", initial_prompt: prompt },
        architecture: parsed.architecture ?? null, updated_at: new Date().toISOString()
      }).eq("id", id);
    }

    await supabase.from("projects").update({ status: "building", updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("project_plans").update({ status: "executing" }).eq("id", plan.id);

    const common = `Project: ${project.name}
Original description: ${project.description || ""}
User request: ${prompt}
Plan: ${JSON.stringify(plan)}
Generate production-minded, compile-ready code. No secrets. No .env. Use only dependencies declared in package.json.`;

    const core = cleanJson((await gateway.generateText({
      userId: user.id, projectId: id, taskType: "code_generation",
      messages: [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: `You are the senior engineer in SK Builder. ${common}
Generate a complete coherent Next.js application and a browser-safe visual preview.
Return ONLY {"files":[{"path":"...","content":"..."}],"previewHtml":"..."}.
Required files: package.json, tsconfig.json, next-env.d.ts, app/layout.tsx, app/globals.css, app/page.tsx.
previewHtml must be a polished static HTML/CSS representation of the requested website, with no script tags, no external dependencies and no secrets. It is only for the SK Builder preview pane.
Use Next.js App Router, TypeScript and Tailwind. It must run with npm install && npm run build. No markdown fences.` }
      ],
      options: { maxTokens: 11000, temperature: 0.1 }
    })).text);

    const features = cleanJson((await gateway.generateText({
      userId: user.id, projectId: id, taskType: "code_generation",
      messages: [
        { role: "system", content: "Return JSON only." },
        { role: "user", content: `You are the implementation engineer in SK Builder. ${common}
The foundation is generated separately. Return ONLY {"files":[{"path":"...","content":"..."}]}.
Generate additional feature files, components, pages, types, API routes where useful and README. Do not repeat package.json, tsconfig.json, next-env.d.ts, app/layout.tsx, app/globals.css, app/page.tsx. Keep it compile-ready.` }
      ],
      options: { maxTokens: 9000, temperature: 0.1 }
    })).text);

    const merged = [...safeFiles(core.files), ...safeFiles(features.files)]
      .filter((file, index, arr) => arr.findIndex(x => x.path === file.path) === index).slice(0, 32);
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

    const previewHtml = safePreview(core.previewHtml);
    await supabase.from("projects").update({ preview_html: previewHtml || null }).eq("id", id);

    const tasks = Array.isArray(plan.tasks) ? plan.tasks : [];
    if (tasks.length) await supabase.from("project_tasks").upsert(tasks.slice(0, 30).map((t: any, i: number) => ({
      project_id: id, plan_id: plan.id, task_key: String(t.task_key || `generated-${i + 1}`),
      title: String(t.title || `Implementation task ${i + 1}`), description: String(t.description || ""),
      files: t.files || [], acceptance_criteria: t.acceptance_criteria || [], dependencies: t.dependencies || [],
      priority: Number(t.priority || 100), status: "passed"
    })), { onConflict: "project_id,task_key" });

    await supabase.from("project_plans").update({ status: "completed" }).eq("id", plan.id);
    await supabase.from("projects").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: `Build completed: ${merged.length} files generated.${token ? " GitHub synced." : " GitHub not connected; kept in workspace."}` });
    return Response.json({ ok: true, repository: fullName ? { full_name: fullName, url: repoUrl } : null, githubSynced: Boolean(token), previewHtml, files: merged.map(f => f.path) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "BUILD_FAILED";
    try {
      const user = await requireUser(); const { id } = await context.params; const s = createServerSupabaseClient();
      await s.from("projects").update({ status: "failed", updated_at: new Date().toISOString() }).eq("id", id).eq("owner_clerk_user_id", user.id);
      await s.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "error", message });
    } catch {}
    return Response.json({ error: message }, { status: 500 });
  }
}
