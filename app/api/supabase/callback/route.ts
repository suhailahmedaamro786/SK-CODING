import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encodeSupabaseOAuthSecret } from "@/lib/supabase-management";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await requireUser();
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const returnedState = url.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get("sk_supabase_oauth_state")?.value;
  if (!code || !returnedState || !expectedState || returnedState !== expectedState) return NextResponse.redirect(new URL("/dashboard/integrations?supabase=state_error", request.url));
  const id = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const secret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
  const redirect = process.env.SUPABASE_OAUTH_REDIRECT_URI;
  if (!id || !secret || !redirect) return NextResponse.redirect(new URL("/dashboard/integrations?supabase=config_error", request.url));

  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const tokenResponse = await fetch("https://api.supabase.com/v1/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: redirect }),
    cache: "no-store",
  });
  const token = await tokenResponse.json().catch(() => ({}));
  if (!tokenResponse.ok || !token.access_token) return NextResponse.redirect(new URL("/dashboard/integrations?supabase=token_error", request.url));

  const accessToken = String(token.access_token);
  const projectsResponse = await fetch("https://api.supabase.com/v1/projects", { headers: { authorization: `Bearer ${accessToken}` }, cache: "no-store" });
  const projects = await projectsResponse.json().catch(() => []);
  const firstProject = Array.isArray(projects) ? projects[0] : null;
  const supabase = createServerSupabaseClient();
  const encrypted = encodeSupabaseOAuthSecret({
    accessToken,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + Number(token.expires_in || 3600) * 1000,
  });
  await supabase.from("supabase_connections").upsert({
    clerk_user_id: user.id,
    project_ref: firstProject?.ref || "pending",
    encrypted_access_token: encrypted,
    updated_at: new Date().toISOString(),
  }, { onConflict: "clerk_user_id,project_ref" });

  cookieStore.delete("sk_supabase_oauth_state");
  return NextResponse.redirect(new URL("/dashboard/integrations?supabase=connected", request.url));
}
