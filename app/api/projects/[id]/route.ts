import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const supabase = createServerSupabaseClient();
    const { data: project, error } = await supabase.from("projects").select("*").eq("id", id).eq("owner_clerk_user_id", user.id).single();
    if (error || !project) return Response.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
    const [{ data: messages }, { data: plans }, { data: files }, { data: deployments }] = await Promise.all([
      supabase.from("project_messages").select("id,role,content,metadata,created_at").eq("project_id", id).eq("clerk_user_id", user.id).order("created_at", { ascending: true }),
      supabase.from("project_plans").select("*").eq("project_id", id).order("version", { ascending: false }).limit(1),
      supabase.from("project_files").select("path,content,status,updated_at").eq("project_id", id).order("path"),
      supabase.from("deployments").select("id,status,deployment_url,created_at").eq("project_id", id).order("created_at", { ascending: false }).limit(5)
    ]);
    return Response.json({ project, messages: messages ?? [], plan: plans?.[0] ?? null, files: files ?? [], deployments: deployments ?? [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "UNAUTHORIZED" }, { status: 401 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const supabase = createServerSupabaseClient();
    const patch: Record<string, unknown> = {};
    if (typeof body.name === "string" && body.name.trim()) patch.name = body.name.trim();
    if (typeof body.description === "string") patch.description = body.description.trim() || null;
    if (typeof body.status === "string") patch.status = body.status;
    if (body.specification !== undefined) patch.specification = body.specification;
    if (body.architecture !== undefined) patch.architecture = body.architecture;
    if (!Object.keys(patch).length) return Response.json({ error: "NO_CHANGES" }, { status: 400 });
    const { data, error } = await supabase.from("projects").update(patch).eq("id", id).eq("owner_clerk_user_id", user.id).select("*").single();
    if (error || !data) return Response.json({ error: error?.message ?? "PROJECT_NOT_FOUND" }, { status: error ? 500 : 404 });
    return Response.json({ project: data });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "UNAUTHORIZED" }, { status: 401 });
  }
}
