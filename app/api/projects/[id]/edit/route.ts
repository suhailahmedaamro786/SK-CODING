import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/secrets";
import { getStoredGithubToken, upsertGithubFile } from "@/lib/github";
import { AIGateway } from "@/ai/gateway";

function cleanJson(text: string) {
  const t = text.replace(/^\u0060\u0060\u0060json\s*/i, "").replace(/\s*\u0060\u0060\u0060$/i, "").trim();
  const m = t.match(/\{[\s\S]*\}/);
  return JSON.parse(m ? m[0] : t);
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

    const s = createServerSupabaseClient();
    const { data: project } = await s.from("projects").select("*").eq("id", id).eq("owner_clerk_user_id", user.id).maybeSingle();
    if (!project) return Response.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });

    const { data: providers } = await s.from("ai_providers").select("provider,model,priority").eq("clerk_user_id", user.id).eq("enabled", true).order("priority");
    const configured: any[] = [];
    for (const p of providers || []) {
      const k = await s.from("ai_api_keys").select("encrypted_secret,enabled").eq("clerk_user_id", user.id).eq("provider", p.provider).maybeSingle();
      if (k.data?.enabled && k.data.encrypted_secret) configured.push({ provider: p.provider, model: p.model || undefined, priority: p.priority, secret: decryptSecret(k.data.encrypted_secret) });
    }
    if (!configured.length) return Response.json({ error: "NO_AI_PROVIDER_CONFIGURED" }, { status: 400 });

    const { data: connection } = await s.from("github_connections").select("encrypted_access_token").eq("clerk_user_id", user.id).maybeSingle();
    const token = connection?.encrypted_access_token ? await getStoredGithubToken(connection.encrypted_access_token) : "";

    const { data: files } = await s.from("project_files").select("path,content").eq("project_id", id).eq("status", "generated").order("path");
    if (!files?.length) return Response.json({ error: "BUILD_REQUIRED" }, { status: 400 });

    const gateway = new AIGateway(configured);
    const fileContext = files.slice(0, 40).map(f => `--- ${f.path}\n${String(f.content).slice(0, 50000)}`).join("\n");
    const result = await gateway.generateText({
      userId: user.id, projectId: id, taskType: "code_generation",
      messages: [
        { role: "system", content: "You are SK Builder's senior code editor. Return JSON only. Never output secrets or .env files." },
        { role: "user", content: `Modify the existing application according to this user request:
"${prompt}"

Return ONLY {"files":[{"path":"...","content":"..."}],"previewHtml":"..."}.
Include ONLY files that actually need to change. Preserve architecture and dependencies. Keep TypeScript/Next.js compile-ready.
previewHtml should be the updated browser-safe static visual preview, with no script tags, no external dependencies and no secrets.

EXISTING FILES:
${fileContext}` }
      ],
      options: { maxTokens: 10000, temperature: 0.1 }
    });

    const parsed = cleanJson(result.text);
    const changed = Array.isArray(parsed.files) ? parsed.files.filter((f: any) =>
      f && typeof f.path === "string" && typeof f.content === "string" &&
      !f.path.includes("..") && !f.path.startsWith("/") && !f.path.includes(".env") && f.content.length < 140000
    ).slice(0, 20) : [];
    if (!changed.length) return Response.json({ error: "AI_RETURNED_NO_FILE_CHANGES" }, { status: 502 });

    if (token && project.github_repo_full_name) {
      for (const f of changed) await upsertGithubFile(token, project.github_repo_full_name, f.path, f.content, `SK Builder: edit ${f.path}`);
    }
    for (const f of changed) {
      await s.from("project_files").upsert({ project_id: id, path: f.path, content: f.content, content_hash: null, status: "generated", updated_at: new Date().toISOString() }, { onConflict: "project_id,path" });
    }

    const previewHtml = safePreview(parsed.previewHtml);
    if (previewHtml) await s.from("projects").update({ preview_html: previewHtml }).eq("id", id);
    await s.from("project_messages").insert({ project_id: id, clerk_user_id: user.id, role: "user", content: prompt, metadata: { action: "edit" } });
    await s.from("project_messages").insert({ project_id: id, clerk_user_id: user.id, role: "assistant", content: `Updated ${changed.length} file(s): ${changed.map((f: any) => f.path).join(", ")}`, metadata: { action: "edit", files: changed.map((f: any) => f.path) } });
    await s.from("build_logs").insert({ project_id: id, clerk_user_id: user.id, level: "info", message: `Workspace edit completed: ${changed.length} files changed.` });
    await s.from("projects").update({ status: "ready", updated_at: new Date().toISOString() }).eq("id", id);

    return Response.json({ ok: true, files: changed.map((f: any) => f.path), previewHtml, githubSynced: Boolean(token && project.github_repo_full_name), message: `Updated ${changed.length} file(s).` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "EDIT_FAILED" }, { status: 500 });
  }
}
