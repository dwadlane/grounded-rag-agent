import { z } from "zod";
import { LLMError, type LLM, type LLMRequest } from "./types.js";

const Reply = z.object({
  content: z.array(z.object({ type: z.string(), text: z.string().optional() })),
});

export interface AnthropicOptions {
  apiKey?: string;
  model?: string;
  baseUrl?: string;
  fetchImpl?: typeof fetch;
}

/** Claude through the Messages API with plain fetch. No SDK. */
export class AnthropicLLM implements LLM {
  readonly name: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: AnthropicOptions = {}) {
    const key = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
    if (!key) throw new LLMError("ANTHROPIC_API_KEY is not set.");
    this.apiKey = key;
    this.model = opts.model ?? process.env.ANTHROPIC_MODEL ?? "claude-haiku-5-5";
    this.baseUrl = opts.baseUrl ?? "https://api.anthropic.com";
    this.fetchImpl = opts.fetchImpl ?? fetch;
    this.name = `anthropic:${this.model}`;
  }

  async complete(req: LLMRequest): Promise<string> {
    const res = await this.fetchImpl(`${this.baseUrl}/v1/messages`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: req.maxTokens ?? 400,
        temperature: 0,
        system: req.system,
        messages: [{ role: "user", content: req.user }],
      }),
    });
    if (!res.ok) throw new LLMError(`Anthropic request failed with status ${res.status}`);
    const parsed = Reply.parse(await res.json());
    return parsed.content
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("")
      .trim();
  }
}
