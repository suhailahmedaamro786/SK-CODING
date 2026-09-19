import type { AIRequest, AIResponse, AIProviderAdapter } from "./types";

export class AIGateway {
  constructor(private readonly adapters: AIProviderAdapter[]) {}

  async generateText(request: AIRequest): Promise<AIResponse> {
    if (this.adapters.length === 0) {
      throw new Error("NO_AI_PROVIDER_CONFIGURED");
    }
    throw new Error("AI_GATEWAY_NOT_CONFIGURED");
  }
}
