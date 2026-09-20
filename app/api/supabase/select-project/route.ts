import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const user = await requireUser();
  const { projectRef } = await request.json().catch(() => ({}));
  if (!/^[a-z0-9]{10,30}$/i.test(String(projectRef || ""))) return Response.json({ error: "INVALID_PROJECT_REF" }, { status: 400 });
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("supabase_connections").select("id").eq("clerk_user_id", user.id).eq("project_ref", "pending").maybeSingle();
  if (!data) return Response.json({ error: "SUPABASE_NOT_CONNECTED" }, { status: 400 });
  const { error } = await supabase.from("supabase_connections").update({ project_ref: String(projectRef), updated_at: new Date().toISOString() }).eq("id", data.id);
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ ok: true, projectRef });
}
