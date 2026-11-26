import type { VectorHit, VectorStore } from "../store.js";

/** The slice of a Cloudflare Vectorize binding we use. Pass `env.VECTORIZE` from a Worker. */
export interface VectorizeIndexLike {
  upsert(vectors: { id: string; values: number[] }[]): Promise<unknown>;
  query(vector: number[], options: { topK: number }): Promise<{ matches: { id: string; score: number }[] }>;
}

/**
 * Optional adapter, not needed to run the project. Create the index with the same
 * dimension as your embedder (1024 for LocalEmbedder) and the cosine metric.
 */
export class VectorizeStore implements VectorStore {
  constructor(private readonly index: VectorizeIndexLike) {}

  async upsert(items: { id: string; vector: number[] }[]): Promise<void> {
    for (let i = 0; i < items.length; i += 500) {
      await this.index.upsert(items.slice(i, i + 500).map((x) => ({ id: x.id, values: x.vector })));
    }
  }

  async query(vector: number[], topK: number): Promise<VectorHit[]> {
    const res = await this.index.query(vector, { topK });
    return res.matches.map((m) => ({ id: m.id, score: m.score }));
  }
}
