import { requireUser } from "@/lib/auth";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/secrets";
import { AIGateway } from "@/ai/gateway";
import type { AIMessage, AITaskType } from "@/ai/gateway/types";

export async function POST(request: Request) {
  const user = await requireUser();
  const body = await request.json().catch(() => null);
  const messages = Array.isArray(body?.messages) ? body.messages as AIMessage[] : [];
  const taskType = (body?.taskType || "requirements") as AITaskType;
  if (!messages.length) return Response.json({ error: "messages are required" }, { status: 400 });

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase.from("ai_providers").select("provider,model,priority").eq("clerk_user_id", user.id).eq("enabled", true).order("priority");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  const configured = [];
  for (const p of data ?? []) {
    const key = await supabase.from("ai_api_keys").select("encrypted_secret,enabled").eq("clerk_user_id", user.id).eq("provider", p.provider).maybeSingle();
    if (key.data?.enabled && key.data.encrypted_secret) configured.push({ provider: p.provider, model: p.model ?? undefined, priority: p.priority, secret: decryptSecret(key.data.encrypted_secret) });
  }
  try {
    const response = await new AIGateway(configured).generateText({ userId: user.id, projectId: body?.projectId, taskType, messages, modelPreference: body?.model });
    await supabase.from("ai_usage").insert({ clerk_user_id: user.id, project_id: body?.projectId || null, operation: taskType, provider: response.provider, model: response.model, input_tokens: response.usage?.inputTokens ?? null, output_tokens: response.usage?.outputTokens ?? null, success: true });
    return Response.json(response);
  } catch (error) {
    await supabase.from("ai_usage").insert({ clerk_user_id: user.id, project_id: body?.projectId || null, operation: taskType, success: false });
    const message = error instanceof Error ? error.message : "AI_REQUEST_FAILED";
    return Response.json({ error: message }, { status: 502 });
  }
}
