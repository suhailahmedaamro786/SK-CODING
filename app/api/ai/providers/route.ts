import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { encryptSecret, fingerprintSecret } from "@/lib/secrets";
import type { AIProvider } from "@/ai/gateway/types";

const allowed = new Set<AIProvider>(["openai","gemini","anthropic","openrouter"]);

export async function GET() {
  const user = await requireUser();
  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("ai_providers").select("provider,enabled,model,priority,created_at,updated_at").eq("clerk_user_id", user.id).order("priority");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ providers: data ?? [] });
}

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const provider = body?.provider as AIProvider;
  const secret = typeof body?.apiKey === "string" ? body.apiKey.trim() : "";
  if (!allowed.has(provider) || !secret) return Response.json({ error: "provider and apiKey are required" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const encrypted = encryptSecret(secret);
  const fingerprint = fingerprintSecret(secret);
  const { error: keyError } = await supabase.from("ai_api_keys").upsert(
    { clerk_user_id: user.id, provider, encrypted_secret: encrypted, key_fingerprint: fingerprint, enabled: true },
    { onConflict: "clerk_user_id,provider" }
  );
  if (keyError) return Response.json({ error: keyError.message }, { status: 500 });

  const { error: providerError } = await supabase.from("ai_providers").upsert(
    { clerk_user_id: user.id, provider, enabled: true, model: body?.model || null, priority: Number(body?.priority) || 100 },
    { onConflict: "clerk_user_id,provider" }
  );
  if (providerError) return Response.json({ error: providerError.message }, { status: 500 });
  return Response.json({ ok: true, provider, fingerprint });
}

export async function DELETE(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const provider = body?.provider as AIProvider;
  if (!allowed.has(provider)) return Response.json({ error: "invalid provider" }, { status: 400 });
  const supabase = createServerSupabaseClient();
  await supabase.from("ai_api_keys").delete().eq("clerk_user_id", user.id).eq("provider", provider);
  await supabase.from("ai_providers").delete().eq("clerk_user_id", user.id).eq("provider", provider);
  return Response.json({ ok: true });
}
