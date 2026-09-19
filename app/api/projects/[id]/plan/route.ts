import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await requireUser();
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const supabase = createServerSupabaseClient();
    const { data: project } = await supabase.from("projects").select("id").eq("id", id).eq("owner_clerk_user_id", user.id).maybeSingle();
    if (!project) return Response.json({ error: "PROJECT_NOT_FOUND" }, { status: 404 });
    const { data, error } = await supabase.from("project_plans").insert({
      project_id:id,
      version:Number(body.version||1),
      status:body.status||"draft",
      architecture:body.architecture??null,
      technology:body.technology??null,
      pages:body.pages??null,
      components:body.components??null,
      database_entities:body.database_entities??null,
      apis:body.apis??null,
      security:body.security??null,
      testing:body.testing??null,
      deployment:body.deployment??null,
      tasks:body.tasks??[]
    }).select("*").single();
    if (error) return Response.json({ error:error.message }, { status:500 });
    return Response.json({ plan:data }, { status:201 });
  } catch (error) {
    return Response.json({ error:error instanceof Error?error.message:"UNAUTHORIZED" }, { status:401 });
  }
}
