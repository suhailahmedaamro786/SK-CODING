import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function POST() {
  const user = await currentUser();
  if (!user?.id) return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  const { error } = await supabaseAdmin().from("github_connections").delete().eq("clerk_user_id", user.id);
  if (error) return NextResponse.json({ error: "DATABASE_ERROR" }, { status: 500 });
  return NextResponse.json({ ok: true });
}
