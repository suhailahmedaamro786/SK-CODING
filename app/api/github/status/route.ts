import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET() {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { data, error } = await supabaseAdmin().from("github_connections").select("username,github_user_id,created_at,updated_at").eq("clerk_user_id", user.id).maybeSingle();
  if (error) return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  return NextResponse.json({ connected: Boolean(data), connection: data ?? null });
}
