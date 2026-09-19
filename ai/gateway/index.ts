import type { AIRequest, AIResponse, AIProvider } from "./types";
import { getProviderAdapter } from "./providers";

export interface GatewayProviderSecret {
  provider: AIProvider;
  secret: string;
  model?: string;
  priority: number;
}

const FALLBACK_STATUSES = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

export class AIGateway {
  constructor(private readonly providers: GatewayProviderSecret[]) {}

  async generateText(request: AIRequest): Promise<AIResponse> {
    if (!this.providers.length) throw new Error("NO_AI_PROVIDER_CONFIGURED");
    const ordered = [...this.providers].sort((a, b) => a.priority - b.priority);
    let lastError: unknown;
    for (const configured of ordered) {
      try {
        return await getProviderAdapter(configured.provider).generateText(
          { ...request, modelPreference: request.modelPreference || configured.model },
          configured.secret,
        );
      } catch (error) {
        lastError = error;
        const status = (error as Error & { status?: number }).status;
        if (status === undefined || !FALLBACK_STATUSES.has(status)) throw error;
      }
    }
    throw lastError instanceof Error ? lastError : new Error("ALL_AI_PROVIDERS_FAILED");
  }
}
