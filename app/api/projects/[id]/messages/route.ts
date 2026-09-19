import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const content = String(body.content ?? "").trim();
    const role = body.role === "assistant" ? "assistant" : "user";
    if (!content) return Response.json({ error: "CONTENT_REQUIRED" }, { status: 400 });
    const supabase = createServerSupabaseClient();
    const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("owner_clerk_user_id", user.id).maybeSingle();
    if (!project) return Response.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
    const { data, error } = await supabase.from("project_messages").insert({ project_id:id, clerk_user_id:user.id, role, content, metadata:body.metadata ?? null }).select("id,role,content,metadata,created_at").single();
    if (error) return Response.json({ error:error.message }, { status:500 });
    return Response.json({ message:data }, { status:201 });
  } catch (error) {
    return Response.json({ error:error instanceof Error ? error.message : "UNAUTHORIZED" }, { status:401 });
  }
}
