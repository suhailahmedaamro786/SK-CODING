import type { AIMessage, AIProvider, AIProviderAdapter, AIRequest, AIResponse } from "./types";

async function jsonFetch(url: string, init: RequestInit) {
  const response = await fetch(url, { ...init, cache: "no-store" });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(body?.error?.message || body?.message || body?.error || `Provider request failed: ${response.status}`);
    (error as Error & { status?: number }).status = response.status;
    throw error;
  }
  return body;
}

function cleanJson(text: string) {
  return text.replace(/^\`\`\`json\s*/i, "").replace(/\s*\`\`\`$/i, "").trim();
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
    return { provider: this.provider, model: body.model || request.modelPreference || this.defaultModel, text: choice.message.content, requestId: body.id, usage: { inputTokens: body.usage?.prompt_tokens, outputTokens: body.usage?.completion_tokens } };
  }
  async generateStructuredOutput<T>(request: AIRequest, secret: string): Promise<T> {
    return JSON.parse(cleanJson((await this.generateText(request, secret)).text)) as T;
  }
}

class AnthropicAdapter implements AIProviderAdapter {
  readonly provider = "anthropic" as const;
  async generateText(request: AIRequest, secret: string): Promise<AIResponse> {
    const model = request.options?.model || request.modelPreference || "claude-sonnet-4-5";
    const system = request.messages.find((m) => m.role === "system")?.content;
    const messages = request.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content }));
    const body = await jsonFetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": secret, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({ model, max_tokens: request.options?.maxTokens ?? 4000, temperature: request.options?.temperature ?? 0.2, system, messages }),
    });
    const text = body?.content?.filter((x: {type?: string}) => x.type === "text").map((x: {text?: string}) => x.text || "").join("") || "";
    if (!text) throw new Error("EMPTY_AI_RESPONSE");
    return { provider: "anthropic", model: body.model || model, text, requestId: body.id, usage: { inputTokens: body.usage?.input_tokens, outputTokens: body.usage?.output_tokens } };
  }
  async generateStructuredOutput<T>(request: AIRequest, secret: string): Promise<T> {
    return JSON.parse(cleanJson((await this.generateText(request, secret)).text)) as T;
  }
}

class GeminiAdapter implements AIProviderAdapter {
  readonly provider = "gemini" as const;
  async generateText(request: AIRequest, secret: string): Promise<AIResponse> {
    const requestedModel = request.options?.model || request.modelPreference || "gemini-3.8-flash";
    // Migrate retired/legacy saved Flash defaults and keep a small provider-local failover chain for temporary capacity spikes.
    const normalizedModel = requestedModel === "gemini-2.5-flash" || requestedModel === "models/gemini-2.5-flash" ? "gemini-3.8-flash" : requestedModel;
    const modelCandidates = [normalizedModel, "gemini-3.8-flash", "gemini-3.7-flash", "gemini-3.6-flash", "gemini-3.5-flash-lite"].filter((m, i, a) => a.indexOf(m) === i);
    const contents = request.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] }));
    const system = request.messages.find((m) => m.role === "system")?.content;
    let lastError: unknown;
    for (const model of modelCandidates) {
      try {
        const body = await jsonFetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(secret)}`, {
          method: "POST", headers: { "content-type": "application/json" },
          body: JSON.stringify({\n            systemInstruction: system ? { parts: [{ text: system }] } : undefined,\n            contents,\n            generationConfig: {\n              temperature: request.options?.temperature ?? 0.2,\n              maxOutputTokens: request.options?.maxTokens ?? 6000,\n              responseMimeType: "application/json"\n            }\n          }),
        });
        const text = body?.candidates?.[0]?.content?.parts?.map((p: {text?: string}) => p.text || "").join("") || "";
        if (!text) throw new Error("EMPTY_AI_RESPONSE");
        return { provider: "gemini", model, text, usage: { inputTokens: body?.usageMetadata?.promptTokenCount, outputTokens: body?.usageMetadata?.candidatesTokenCount } };
      } catch (error) {
        lastError = error;
        const status = (error as Error & { status?: number }).status;
        if (status !== 408 && status !== 409 && status !== 425 && status !== 429 && status !== 500 && status !== 502 && status !== 503 && status !== 504) throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("GEMINI_ALL_MODELS_FAILED");
  }
  async generateStructuredOutput<T>(request: AIRequest, secret: string): Promise<T> {
    return JSON.parse(cleanJson((await this.generateText(request, secret)).text)) as T;
  }
}

export const providerAdapters: Record<AIProvider, AIProviderAdapter> = {
  openai: new OpenAICompatibleAdapter("openai", "https://api.openai.com/v1", "gpt-4.1-mini"),
  openrouter: new OpenAICompatibleAdapter("openrouter", "https://openrouter.ai/api/v1", "openai/gpt-4.1-mini"),
  anthropic: new AnthropicAdapter(),
  gemini: new GeminiAdapter(),
};

export function getProviderAdapter(provider: AIProvider) {
  return providerAdapters[provider];
}
