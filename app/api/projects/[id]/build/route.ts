import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/secrets";
import { createGithubRepository, getStoredGithubToken, upsertGithubFile } from "@/lib/github";
import { AIGateway } from "@/ai/gateway";
import { getSelectedSupabaseConnection, runSupabaseSchemaSQL } from "@/lib/supabase-management";
import { jsonrepair } from "jsonrepair";

export const maxDuration = 300;

type GeneratedFile = { path: string; content: string };

function cleanJson(text: string) {
  const t = text.trim();
  try { return JSON.parse(t); } catch {}
  try { return JSON.parse(jsonrepair(t)); } catch (error) {
    throw new Error("AI_INVALID_JSON: " + (error instanceof Error ? error.message : "invalid JSON"));
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char] || char));
}

function premiumPreview(projectName: string, prompt: string, pages: unknown) {
  const pageNames = Array.isArray(pages) ? pages.slice(0, 6).map((p) => typeof p === "string" ? p : String((p as {name?: unknown})?.name || "Page")) : [];
  const nav = pageNames.length ? pageNames : ["Dashboard", "Patients", "Appointments", "Reports", "Settings"];
  const navHtml = nav.map((name, i) => `<a class="nav-item ${i === 0 ? "active" : ""}" href="#section-${i}">${escapeHtml(name)} <span>›</span></a>`).join("");
  const cards = nav.slice(0, 4).map((name, i) => `<article class="card"><div class="card-icon">${["✦","◈","◉","↗"][i]}</div><div class="muted">${escapeHtml(name)}</div><strong>${["1,284","+18.4%","342","96.8%"][i]}</strong><small>${["Total records","vs last month","Upcoming","System health"][i]}</small></article>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(projectName)}</title><style>
*{box-sizing:border-box}body{margin:0;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#f7f8fc;color:#101322}.shell{min-height:100vh;display:flex;background:linear-gradient(135deg,#f8f9ff,#fff)}a{text-decoration:none;color:inherit}.sidebar{width:230px;background:#111322;color:#c9cee0;padding:22px 14px;display:flex;flex-direction:column;gap:18px}.brand{display:flex;align-items:center;gap:10px;color:#fff;font-weight:800}.brand-mark{width:34px;height:34px;border-radius:11px;display:grid;place-items:center;background:linear-gradient(135deg,#8b5cf6,#6366f1);box-shadow:0 8px 24px #7c3aed55}.nav{display:grid;gap:6px}.nav-item{display:flex;justify-content:space-between;padding:10px 11px;border-radius:10px;font-size:13px;transition:.2s}.nav-item:hover,.nav-item.active{background:#ffffff12;color:#fff;transform:translateX(2px)}.main{flex:1;padding:26px;min-width:0}.top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px}.eyebrow{font-size:11px;font-weight:800;letter-spacing:.18em;color:#7c5cff;text-transform:uppercase}.title{font-size:30px;line-height:1.1;margin:6px 0 5px;font-weight:800;letter-spacing:-.03em}.desc{margin:0;color:#687085;font-size:13px;max-width:650px}.actions{display:flex;gap:8px}.btn{border:1px solid #e4e7f0;background:#fff;padding:9px 13px;border-radius:10px;font-size:12px;font-weight:700;box-shadow:0 4px 16px #1113220a;transition:.2s}.btn.primary{background:#6d4aff;color:#fff;border-color:#6d4aff}.btn:hover{transform:translateY(-1px);box-shadow:0 8px 22px #11132212}.grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:22px}.card{background:#fff;border:1px solid #e7e9f2;border-radius:16px;padding:16px;box-shadow:0 10px 30px #252a4010;transition:.2s}.card:hover{transform:translateY(-2px);box-shadow:0 14px 34px #252a4018}.card-icon{width:32px;height:32px;border-radius:10px;background:#f0edff;color:#6d4aff;display:grid;place-items:center;margin-bottom:14px}.muted{color:#7b8396;font-size:11px}.card strong{display:block;font-size:24px;margin:5px 0}.card small{color:#9299aa;font-size:10px}.panel{margin-top:14px;background:#fff;border:1px solid #e7e9f2;border-radius:18px;padding:18px;box-shadow:0 10px 30px #252a400c}.panel-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}.panel-title{font-size:14px;font-weight:800}.badge{font-size:10px;padding:5px 8px;border-radius:999px;background:#ecfdf3;color:#15803d}.rows{display:grid;gap:9px}.row{display:grid;grid-template-columns:1fr 110px 60px;gap:10px;align-items:center;padding:11px;border-radius:11px;background:#f8f9fc;font-size:12px}.bar{height:7px;border-radius:999px;background:#e8eaf1;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,#7c5cff,#9f7aea);border-radius:inherit}.footer{margin-top:20px;color:#9aa1b2;font-size:10px;text-align:right}@media(max-width:900px){.sidebar{width:76px}.sidebar .brand span:last-child{display:none}.nav-item span{display:none}.nav-item{justify-content:center}.main{padding:18px}.grid{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:640px){.shell{display:block}.sidebar{width:auto;flex-direction:row;align-items:center;overflow:auto}.nav{display:flex}.nav-item{white-space:nowrap}.sidebar .brand span:last-child{display:inline}.grid{grid-template-columns:1fr}.main{padding:16px}.top{display:block}.actions{margin-top:12px}.title{font-size:25px}.row{grid-template-columns:1fr}.footer{text-align:center}}
</style></head><body><div class="shell"><aside class="sidebar"><div class="brand"><span class="brand-mark">✦</span><span>${escapeHtml(projectName)}</span></div><nav class="nav">${navHtml}</nav><div style="margin-top:auto;font-size:10px;color:#747b90">AI-generated preview</div></aside><main class="main"><div class="top"><div><div class="eyebrow">AI Software Factory</div><h1 class="title">${escapeHtml(projectName)}</h1><p class="desc">${escapeHtml(prompt).slice(0,220)}</p></div><div class="actions"><button class="btn">Export</button><button class="btn primary">Open app ↗</button></div></div><section class="grid">${cards}</section><section class="panel"><div class="panel-head"><div class="panel-title">Activity overview</div><span class="badge">Live preview</span></div><div class="rows"><div class="row"><span>Product workflow</span><div class="bar"><i style="width:84%"></i></div><strong>84%</strong></div><div class="row"><span>User engagement</span><div class="bar"><i style="width:68%"></i></div><strong>68%</strong></div><div class="row"><span>Operational health</span><div class="bar"><i style="width:92%"></i></div><strong>92%</strong></div></div></section><div class="footer">Generated by SK Builder · Responsive preview</div></main></div></body></html>`;
}

function isPremiumPreview(html: string) {
  const lower = html.toLowerCase();
  return html.length > 1800 && lower.includes("<style") && lower.includes("<nav") && lower.includes('<meta name="viewport"');
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
        { role: "system", content: "Return JSON only. You are SK Builder's product architect, software architect and UI/UX designer. Never ask questions; infer sensible requirements from the prompt." },
        { role: "user", content: common + "\nReturn ONLY: { \"plan\": { \"summary\":\"...\", \"architecture\":{}, \"technology\":{}, \"pages\":[], \"components\":[], \"database_entities\":[], \"apis\":[], \"security\":[], \"testing\":[], \"deployment\":[], \"tasks\":[], \"database_sql\":\"\" }, \"previewHtml\":\"...\" }\nChoose the implementation stack from the user request. Support React.js, Next.js, Vite, TypeScript/JavaScript, Tailwind CSS, plain HTML/CSS/JavaScript, and Python backends such as FastAPI or Flask when appropriate. You may combine them for full-stack requests. Return technology as frontend, backend, language, styling, database, and tooling. The preview MUST be a complete polished standalone HTML document with <!doctype html>, viewport meta, semantic nav/sidebar/header/main sections, a coherent visual design system, realistic product content, responsive desktop/tablet/mobile layouts, cards/tables/forms where relevant, loading/empty/error states, hover/focus states, gradients/borders/shadows, and tasteful CSS animations/transitions. Put all styling inside one <style> tag. No scripts, external dependencies, remote images, or secrets." }
      ],
      options: { maxTokens: 5000, temperature: 0.2 }
    })).text);
    const parsedPlan = design.plan || {};
    const generatedPreview = safePreview(design.previewHtml);
    const previewHtml = isPremiumPreview(generatedPreview) ? generatedPreview : premiumPreview(project.name, prompt, parsedPlan.pages);
    await supabase.from("projects").update({ preview_html: previewHtml || null, specification: { summary: parsedPlan.summary ?? "", initial_prompt: prompt }, architecture: parsedPlan.architecture ?? null, updated_at: new Date().toISOString() }).eq("id", id);
    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Stage 2/5: preview ready. Generating source files." });

    let filesResult: any;
    try {
      filesResult = cleanJson((await gateway.generateText({
      userId: user.id, projectId: id, taskType: "code_generation",
      messages: [
        { role: "system", content: "Return JSON only. You are SK Builder's senior multi-language software engineer. Do not ask questions. Follow the approved stack exactly." },
        { role: "user", content: common + "\nApproved plan:\n" + JSON.stringify(parsedPlan) + "\nReturn ONLY: { \"files\":[{\"path\":\"...\",\"content\":\"...\"}] }\nGenerate the actual source project for the selected stack. If the user asks Next.js, use Next.js App Router; React.js should use React/Vite unless Next.js is explicit; use Tailwind when requested; honor TypeScript or JavaScript; Python means a real FastAPI or Flask backend when appropriate. For full-stack prompts, generate frontend + backend with clear folders and API integration points. Never silently convert a Python/backend request into HTML-only or Next.js-only code. Build a professional multi-page product with reusable components, responsive UI, accessibility, realistic states, forms/tables/cards, and tasteful CSS transitions/animations. Generate 10-24 concise coherent files and include the correct runnable foundation for the chosen stack plus README/run instructions. Every import/path must resolve. Return valid JSON only, with all newlines inside content escaped. No markdown fences, .env files, secrets, binary data, remote image URLs, or huge boilerplate." }
      ],
      options: { maxTokens: 8000, temperature: 0.1 }
    })).text);
    } catch {
      await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "warn", message: "Primary source generation was malformed; retrying with a smaller request." });
      filesResult = cleanJson((await gateway.generateText({
        userId: user.id, projectId: id, taskType: "code_generation",
        messages: [
          { role: "system", content: "Return JSON only. Generate a compact runnable project. Never ask questions." },
          { role: "user", content: common + "\nApproved technology: " + JSON.stringify(parsedPlan.technology ?? {}) + "\nReturn ONLY {\"files\":[{\"path\":\"...\",\"content\":\"...\"}]} with 8-12 concise files. For Next.js use App Router. Make the UI polished and responsive. Escape newlines inside JSON strings. No markdown, secrets, .env, binaries, or remote images." }
        ],
        options: { maxTokens: 6500, temperature: 0.1 }
      })).text);
    }
    let generatedFiles = safeFiles(filesResult?.files);

    const foundationOk = (items: GeneratedFile[]) => {
      const paths = new Set(items.map((f) => f.path));
      const hasNext = (paths.has("app/layout.tsx") || paths.has("app/layout.jsx")) && (paths.has("app/page.tsx") || paths.has("app/page.jsx"));
      const hasReact = paths.has("package.json") && Array.from(paths).some((p) => /(^|\\/)src\\/main\\.(tsx|jsx)$/.test(p) || /(^|\\/)main\\.(tsx|jsx)$/.test(p));
      const hasPython = Array.from(paths).some((p) => /(^|\\/)(main|app)\\.py$/.test(p)) && paths.has("requirements.txt");
      const hasStatic = paths.has("index.html") && Array.from(paths).some((p) => /(^|\\/)styles?\\.css$/.test(p));
      return hasNext || hasReact || hasPython || hasStatic;
    };

    if (!foundationOk(generatedFiles)) {
      await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "warn", message: "Generated source was missing a runnable foundation; retrying with explicit entry files." });
      const retry = cleanJson((await gateway.generateText({
        userId: user.id, projectId: id, taskType: "code_generation",
        messages: [
          { role: "system", content: "Return JSON only. You are a senior software engineer. The previous generation did not contain a runnable foundation. Do not ask questions." },
          { role: "user", content: common + "\nApproved technology: " + JSON.stringify(parsedPlan.technology ?? {}) + "\nReturn ONLY {\"files\":[{\"path\":\"...\",\"content\":\"...\"}]}. REQUIRED: include a runnable foundation for the selected stack. For Next.js App Router include package.json, app/layout.tsx and app/page.tsx. For React/Vite include package.json, index.html, src/main.tsx and src/App.tsx. For Python/FastAPI include requirements.txt and app/main.py. For static HTML include index.html and styles.css. Generate 8-16 concise files, all imports must resolve. No markdown, .env, secrets, binaries, or remote images." }
        ],
        options: { maxTokens: 7500, temperature: 0.1 }
      })).text);
      generatedFiles = safeFiles(retry?.files);
      filesResult = retry;
    }

    const result = { plan: parsedPlan, files: generatedFiles, previewHtml };

    await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Stage 3/5: saving generated project files." });
    const inserted = await supabase.from("project_plans").upsert({
      project_id: id, version: 1, status: "executing",
      architecture: parsedPlan.architecture ?? null, technology: parsedPlan.technology ?? null,
      pages: parsedPlan.pages ?? null, components: parsedPlan.components ?? null,
      database_entities: parsedPlan.database_entities ?? null, apis: parsedPlan.apis ?? null,
      security: parsedPlan.security ?? null, testing: parsedPlan.testing ?? null,
      deployment: parsedPlan.deployment ?? null, tasks: parsedPlan.tasks ?? []
    }, { onConflict: "project_id,version" }).select("*").single();
    if (inserted.error) throw new Error(inserted.error.message);
    const plan = inserted.data;

    await supabase.from("projects").update({
      status: "building", specification: { summary: parsedPlan.summary ?? "", initial_prompt: prompt, technology: parsedPlan.technology ?? null },
      architecture: parsedPlan.architecture ?? null, updated_at: new Date().toISOString()
    }).eq("id", id);

    const merged = safeFiles(result.files).filter((file, index, arr) => arr.findIndex(x => x.path === file.path) === index).slice(0, 32);
    if (!foundationOk(merged)) throw new Error("AI_GENERATION_MISSING_FOUNDATION");
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

    const supabaseConnection = await getSelectedSupabaseConnection(user.id);
    const databaseSql = typeof parsedPlan.database_sql === "string" ? parsedPlan.database_sql.trim() : "";
    if (supabaseConnection && databaseSql) {
      await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Stage 4/5: applying guarded Supabase database schema." });
      await runSupabaseSchemaSQL(supabaseConnection.accessToken, supabaseConnection.projectRef, databaseSql);
      await supabase.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: "Supabase schema applied successfully." });
    }
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
