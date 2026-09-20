import { requireUser } from "@/lib/auth";
import { supabaseOAuthConfigured } from "@/lib/supabase-management";
import { cookies } from "next/headers";
import { randomUUID } from "crypto";

export async function GET() {
  await requireUser();
  if (!supabaseOAuthConfigured()) return Response.json({ error: "SUPABASE_OAUTH_NOT_CONFIGURED" }, { status: 503 });
  const state = randomUUID();
  const cookieStore = await cookies();
  cookieStore.set("sk_supabase_oauth_state", state, { httpOnly: true, secure: true, sameSite: "lax", maxAge: 600, path: "/" });
  const url = new URL("https://api.supabase.com/v1/oauth/authorize");
  url.searchParams.set("client_id", process.env.SUPABASE_OAUTH_CLIENT_ID!);
  url.searchParams.set("redirect_uri", process.env.SUPABASE_OAUTH_REDIRECT_URI!);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("state", state);
  return Response.redirect(url);
}
