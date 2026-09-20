import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const supabase = createServerSupabaseClient();
    const { data: project } = await supabase.from("projects").select("id,status,preview_html,updated_at").eq("id", id).eq("owner_clerk_user_id", user.id).maybeSingle();
    if (!project) return Response.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
    const { data: logs } = await supabase.from("build_logs").select("id,level,message,created_at").eq("project_id", id).eq("clerk_user_id", user.id).order("created_at", { ascending: false }).limit(20);
    const { count } = await supabase.from("project_files").select("id", { count: "exact", head: true }).eq("project_id", id);
    return Response.json({ project, logs: (logs ?? []).reverse(), fileCount: count ?? 0 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "UNAUTHORIZED" }, { status: 401 });
  }
}
