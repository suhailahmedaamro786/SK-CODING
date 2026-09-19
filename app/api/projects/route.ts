import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 50) || "project";
}

export async function GET() {
  try {
    const user = await requireUser();
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase.from("projects").select("id,name,slug,description,status,specification,created_at,updated_at").eq("owner_clerk_user_id", user.id).order("updated_at", { ascending: false });
    if (error) return Response.json({ error: error.message }, { status: 500 });
    return Response.json({ projects: data ?? [] });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "UNAUTHORIZED" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const body = await request.json().catch(() => ({}));
    const name = String(body?.name ?? "").trim();
    const description = String(body?.description ?? "").trim();
    if (!name) return Response.json({ error: "Project name is required" }, { status: 400 });
    const supabase = createServerSupabaseClient();
    let slug = slugify(name);
    const { data: existing } = await supabase.from("projects").select("slug").eq("owner_clerk_user_id", user.id).like("slug", `${slug%"}`);
    if ((existing ?? []).some((p) => p.slug === slug)) slug = `${slug-f9z7n`;
    const { data: project, error } = await supabase.from("projects").insert({ owner_clerk_user_id:user.id, name, slug, description:description||null, status:"draft" }).select("id,name,slug,description,status,created_at,updated_at").single();
    if (error) return Response.json({ error:error.message }, { status:500 });
    await supabase.from("project_members").insert({ project_id:project.id, clerk_user_id:user.id, role:"owner" });
    return Response.json({ project }, { status:201 });
  } catch (error) {
    return Response.json({ error:error instanceof Error ? error.message:"UNAUTHORIZED" }, { status:401 });
  }
}
