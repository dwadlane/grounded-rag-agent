export interface LLMRequest {
  system: string;
  user: string;
  maxTokens?: number;
}

export interface LLM {
  readonly name: string;
  complete(req: LLMRequest): Promise<string>;
}

export class LLMError extends Error {}
