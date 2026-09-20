import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decodeSupabaseOAuthSecret, refreshSupabaseToken, encodeSupabaseOAuthSecret, supabaseManagementFetch } from "@/lib/supabase-management";

export async function GET() {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("supabase_connections").select("project_ref,encrypted_access_token,updated_at").eq("clerk_user_id", user.id).order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!data?.encrypted_access_token) return Response.json({ connected: false, oauthConfigured: Boolean(process.env.SUPABASE_OAUTH_CLIENT_ID && process.env.SUPABASE_OAUTH_CLIENT_SECRET && process.env.SUPABASE_OAUTH_REDIRECT_URI) });

  let stored = decodeSupabaseOAuthSecret(data.encrypted_access_token);
  if (stored.expiresAt && stored.expiresAt < Date.now() + 60_000 && stored.refreshToken) {
    const refreshed = await refreshSupabaseToken(stored.refreshToken);
    stored = { accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token || stored.refreshToken, expiresAt: Date.now() + Number(refreshed.expires_in || 3600) * 1000 };
    await supabase.from("supabase_connections").update({ encrypted_access_token: encodeSupabaseOAuthSecret(stored), updated_at: new Date().toISOString() }).eq("clerk_user_id", user.id).eq("project_ref", data.project_ref);
  }
  const projects = await supabaseManagementFetch<any[]>(stored.accessToken, "/v1/projects");
  return Response.json({ connected: true, oauthConfigured: true, selectedProjectRef: data.project_ref === "pending" ? null : data.project_ref, projects: projects.map((p) => ({ ref: p.ref, name: p.name, status: p.status, region: p.region })) });
}
