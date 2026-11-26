import { z } from "zod";
import type { Embedder } from "./types.js";

const Response = z.object({ data: z.array(z.object({ embedding: z.array(z.number()) })) });

export interface RemoteEmbedderOptions {
  provider?: "voyage" | "openai";
  apiKey?: string;
  model?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Optional hosted embeddings. Picks Voyage when VOYAGE_API_KEY is set, otherwise
 * OpenAI when OPENAI_API_KEY is set. Never used by the tests or the eval.
 */
export class VoyageOrOpenAIEmbedder implements Embedder {
  readonly name: string;
  private readonly url: string;
  private readonly apiKey: string;
  private readonly model: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: RemoteEmbedderOptions = {}) {
    const provider = opts.provider ?? (process.env.VOYAGE_API_KEY ? "voyage" : "openai");
    const key = opts.apiKey ?? (provider === "voyage" ? process.env.VOYAGE_API_KEY : process.env.OPENAI_API_KEY);
    if (!key) throw new Error("Set VOYAGE_API_KEY or OPENAI_API_KEY to use the hosted embedder.");
    this.apiKey = key;
    this.url = provider === "voyage" ? "https://api.voyageai.com/v1/embeddings" : "https://api.openai.com/v1/embeddings";
    this.model = opts.model ?? (provider === "voyage" ? "voyage-3.5" : "text-embedding-3-small");
    this.name = `${provider}:${this.model}`;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async embed(texts: string[]): Promise<number[][]> {
    const res = await this.fetchImpl(this.url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${this.apiKey}` },
      body: JSON.stringify({ model: this.model, input: texts }),
    });
    if (!res.ok) throw new Error(`Embedding request failed with status ${res.status}`);
    return Response.parse(await res.json()).data.map((d) => d.embedding);
  }
}
