import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSecret } from "@/lib/secrets";
import { githubUser } from "@/lib/github";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const user = await currentUser();
  if (!user?.id) return NextResponse.redirect(new URL("/sign-in", request.url));

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("sk_builder_github_state")?.value;
  jar.delete("sk_builder_github_state");
  if (!code || !state || !expected || state !== expected) return NextResponse.redirect(new URL("/dashboard/integrations?github=state_error", request.url));

  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) return NextResponse.redirect(new URL("/dashboard/integrations?github=config_error", request.url));

  const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
    method: "POST", headers: {"content-type":"application/json", accept:"application/json"},
    body: JSON.stringify({ client_id: process.env.GITHUB_CLIENT_ID, client_secret: process.env.GITHUB_CLIENT_SECRET, code }),
  });
  const tokenBody = await tokenResponse.json();
  if (!tokenResponse.ok || !tokenBody.access_token) return NextResponse.redirect(new URL("/dashboard/integrations?github=token_error", request.url));

  const profile = await githubUser(tokenBody.access_token);
  const supabase = supabaseAdmin();
  const { error } = await supabase.from("github_connections").upsert({
    clerk_user_id: user.id, encrypted_access_token: encryptSecret(tokenBody.access_token),
    github_user_id: String(profile.id), username: profile.login, updated_at: new Date().toISOString(),
  }, { onConflict: "clerk_user_id" });
  if (error) return NextResponse.redirect(new URL("/dashboard/integrations?github=save_error", request.url));
  return NextResponse.redirect(new URL("/dashboard/integrations?github=connected", request.url));
}
