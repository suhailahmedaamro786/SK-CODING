import { decryptSecret, encryptSecret } from "@/lib/secrets";

type StoredOAuth = { accessToken: string; refreshToken?: string; expiresAt?: number };

export function supabaseOAuthConfigured() {
  return Boolean(process.env.SUPABASE_OAUTH_CLIENT_ID && process.env.SUPABASE_OAUTH_CLIENT_SECRET && process.env.SUPABASE_OAUTH_REDIRECT_URI);
}

export function encodeSupabaseOAuthSecret(value: StoredOAuth) {
  return encryptSecret(JSON.stringify(value));
}

export function decodeSupabaseOAuthSecret(value: string): StoredOAuth {
  return JSON.parse(decryptSecret(value)) as StoredOAuth;
}

export async function supabaseManagementFetch<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.supabase.com${path}`, {
    ...init,
    cache: "no-store",
    headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}`, ...(init?.headers || {}) },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || body?.error || `SUPABASE_MANAGEMENT_${response.status}`);
  return body as T;
}

export async function refreshSupabaseToken(refreshToken: string) {
  const id = process.env.SUPABASE_OAUTH_CLIENT_ID;
  const secret = process.env.SUPABASE_OAUTH_CLIENT_SECRET;
  const redirect = process.env.SUPABASE_OAUTH_REDIRECT_URI;
  if (!id || !secret || !redirect) throw new Error("SUPABASE_OAUTH_NOT_CONFIGURED");
  const basic = Buffer.from(`${id}:${secret}`).toString("base64");
  const response = await fetch("https://api.supabase.com/v1/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", authorization: `Basic ${basic}` },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken, redirect_uri: redirect }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body?.message || body?.error || "SUPABASE_TOKEN_REFRESH_FAILED");
  return body as { access_token: string; refresh_token?: string; expires_in?: number };
}

export async function runSupabaseSchemaSQL(accessToken: string, projectRef: string, query: string) {
  const normalized = query.trim();
  if (!normalized || normalized.length > 50000) throw new Error("SUPABASE_SQL_INVALID");
  if (/(^|;)\s*(drop|truncate|delete|update|insert|alter\s+system|create\s+extension)\b/i.test(normalized)) {
    throw new Error("SUPABASE_SQL_BLOCKED");
  }
  return supabaseManagementFetch<unknown>(accessToken, `/v1/projects/${encodeURIComponent(projectRef)}/database/query`, {
    method: "POST",
    body: JSON.stringify({ query: normalized }),
  });
}

export async function getSelectedSupabaseConnection(userId: string) {
  const { createServerSupabaseClient } = await import("@/lib/supabase/server");
  const supabase = createServerSupabaseClient();
  const { data } = await supabase.from("supabase_connections").select("project_ref,encrypted_access_token").eq("clerk_user_id", userId).neq("project_ref", "pending").order("updated_at", { ascending: false }).limit(1).maybeSingle();
  if (!data?.encrypted_access_token || !data.project_ref) return null;
  let stored = decodeSupabaseOAuthSecret(data.encrypted_access_token);
  if (stored.expiresAt && stored.expiresAt < Date.now() + 60_000 && stored.refreshToken) {
    const refreshed = await refreshSupabaseToken(stored.refreshToken);
    stored = { accessToken: refreshed.access_token, refreshToken: refreshed.refresh_token || stored.refreshToken, expiresAt: Date.now() + Number(refreshed.expires_in || 3600) * 1000 };
    await supabase.from("supabase_connections").update({ encrypted_access_token: encodeSupabaseOAuthSecret(stored), updated_at: new Date().toISOString() }).eq("clerk_user_id", userId).eq("project_ref", data.project_ref);
  }
  return { projectRef: data.project_ref, accessToken: stored.accessToken };
}
