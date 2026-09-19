export type AIProvider = "openai" | "gemini" | "anthropic" | "openrouter";
export type AITaskType = "requirements" | "planning" | "code_generation" | "code_analysis" | "editing" | "testing";

export interface AIMessage { role: "system" | "user" | "assistant"; content: string; }

export interface AIGenerationOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIRequest {
  userId: string;
  projectId?: string;
  taskType: AITaskType;
  messages: AIMessage[];
  modelPreference?: string;
  options?: AIGenerationOptions;
}

export interface AIResponse {
  provider: AIProvider;
  model: string;
  text: string;
  requestId?: string;
  usage?: { inputTokens?: number; outputTokens?: number };
}

export interface AIProviderAdapter {
  readonly provider: AIProvider;
  generateText(request: AIRequest, secret: string): Promise<AIResponse>;
  generateStructuredOutput<T>(request: AIRequest, secret: string, schema: unknown): Promise<T>;
}
