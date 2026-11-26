import { createAgent, type Agent } from "../src/agent.js";
import type { LLM, LLMRequest } from "../src/llm/types.js";

export class StubLLM implements LLM {
  readonly name = "stub";
  calls: LLMRequest[] = [];
  constructor(private readonly reply: string | ((req: LLMRequest) => string)) {}
  async complete(req: LLMRequest): Promise<string> {
    this.calls.push(req);
    return typeof this.reply === "function" ? this.reply(req) : this.reply;
  }
}

export class ExplodingLLM implements LLM {
  readonly name = "exploding";
  async complete(): Promise<string> {
    throw new Error("The model must not be called on this path.");
  }
}

export function agentWith(llm: LLM): Promise<Agent> {
  return createAgent({ llm });
}
