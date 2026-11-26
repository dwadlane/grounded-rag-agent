import type { Chunk } from "./types.js";

export interface VectorHit {
  id: string;
  score: number;
}

/** Anything that can hold vectors. Implement this to move to Vectorize, pgvector or Pinecone. */
export interface VectorStore {
  upsert(items: { id: string; vector: number[] }[]): Promise<void>;
  query(vector: number[], topK: number): Promise<VectorHit[]>;
}

export class InMemoryVectorStore implements VectorStore {
  private items: { id: string; vector: number[] }[] = [];

  async upsert(items: { id: string; vector: number[] }[]): Promise<void> {
    const byId = new Map(this.items.map((i) => [i.id, i]));
    for (const i of items) byId.set(i.id, i);
    this.items = [...byId.values()];
  }

  async query(vector: number[], topK: number): Promise<VectorHit[]> {
    return this.items
      .map((i) => ({ id: i.id, score: cosine(vector, i.vector) }))
      .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
      .slice(0, topK);
  }
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    na += a[i]! * a[i]!;
    nb += b[i]! * b[i]!;
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export type ChunkIndex = Map<string, Chunk>;
