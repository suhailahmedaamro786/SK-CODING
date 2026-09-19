import type { AIMessage, AIProvider, AIProviderAdapter, AIRequest, AIResponse } from "./types";

function lastUser(messages: AIMessage[]) {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}

async function jsonFetch(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.message || `Provider request failed: ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return body;
}

class OpenAICompatibleAdapter implements AIProviderAdapter {
  constructor(public readonly provider: AIProvider, private readonly baseUrl: string, private readonly defaultModel: string) {}
  async generateText(request: AIRequest, secret: string): Promise<AIResponse> {
    const body = await jsonFetch(`${this.baseUrl}/chat/completions`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${secret}` },
      body: JSON.stringify({
        model: request.options?.model || request.modelPreference || this.defaultModel,
        messages: request.messages,
        temperature: request.options?.temperature ?? 0.2,
        max_tokens: request.options?.maxTokens ?? 4000,
      }),
    });
    const choice = body?.choices?.[0];
    if (!choice?.message?.content) throw new Error("EMPTY_AI_RESPONSE");
    return {
      provider: this.provider,
      model: body.model || request.modelPreference || this.defaultModel,
      text: choice.message.content,
      requestId: body.id,
      usage: { inputTokens: body.usage?.prompt_tokens, outputTokens: body.usage?.completion_tokens },
    };
  }
  async generateStructuredOutput<T>(request: AIRequest, secret: string): Promise<T> {
    const response = await this.generateText(request, secret);
    const cleaned = response.text.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
    return JSON.parse(cleaned) as T;
  }
}

class GeminiAdapter implements AIProviderAdapter {
  readonly provider = "gemini" as const;
  async generateText(request: AIRequest, secret: string): Promise<AIResponse> {
    const model = request.options?.model || request.modelPreference || "gemini-2.5-flash";
    const contents = request.messages.filter((m) => m.role !== "system").map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const system = request.messages.find((m) => m.role === "system")?.content;
    const body = await jsonFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(secret)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ systemInstruction: system ? { parts: [{ text: system }] } : undefined, contents }),
    });
    const text = body?.candidates?.[0]?.content?.parts?.map((p: {text?: string}) => p.text || "").join("") || "";
    if (!text) throw new Error("EMPTY_AI_RESPONSE");
    return { provider: "gemini", model, text, usage: { inputTokens: body?.usageMetadata?.promptTokenCount, outputTokens: body?.usageMetadata?.candidatesTokenCount } };
  }
  async generateStructuredOutput<T>(request: AIRequest, secret: string): Promise<T> {
    const response = await this.generateText(request, secret);
    return JSON.parse(response.text.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim()) as T;
  }
}

export const providerAdapters: Record<AIProvider, AIProviderAdapter> = {
  openai: new OpenAICompatibleAdapter("openai", "https://api.openai.com/v1", "gpt-4.1-mini"),
  openrouter: new OpenAICompatibleAdapter("openrouter", "https://openrouter.ai/api/v1", "openai/gpt-4.1-mini"),
  anthropic: new OpenAICompatibleAdapter("anthropic", "https://api.anthropic.com/v1", "claude-sonnet-4-5"),
  gemini: new GeminiAdapter(),
};

export function getProviderAdapter(provider: AIProvider) {
  return providerAdapters[provider];
}
