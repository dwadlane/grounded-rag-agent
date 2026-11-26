import { BM25 } from "./bm25.js";
import type { Embedder } from "./embedders/types.js";
import type { Chunk, ScoredChunk } from "./types.js";
import { type VectorStore } from "./store.js";
import { terms, uniqueTerms } from "./text.js";

/** Reciprocal rank fusion: each list contributes 1 / (k + rank). Rank is 1 based. */
export function reciprocalRankFusion(lists: string[][], k = 60): Map<string, number> {
  const scores = new Map<string, number>();
  for (const list of lists) {
    list.forEach((id, i) => scores.set(id, (scores.get(id) ?? 0) + 1 / (k + i + 1)));
  }
  return scores;
}

/** Share of the query's content terms that appear in the text. */
export function termCoverage(queryTerms: string[], text: string): number {
  if (queryTerms.length === 0) return 0;
  const have = new Set(terms(text));
  return queryTerms.filter((t) => have.has(t)).length / queryTerms.length;
}

export class HybridRetriever {
  private readonly bm25: BM25;
  private readonly byId: Map<string, Chunk>;

  private constructor(
    readonly chunks: Chunk[],
    private readonly embedder: Embedder,
    private readonly store: VectorStore,
  ) {
    this.bm25 = new BM25(chunks);
    this.byId = new Map(chunks.map((c) => [c.id, c]));
  }

  static async build(chunks: Chunk[], embedder: Embedder, store: VectorStore): Promise<HybridRetriever> {
    const vectors = await embedder.embed(chunks.map((c) => c.searchText));
    await store.upsert(chunks.map((c, i) => ({ id: c.id, vector: vectors[i]! })));
    return new HybridRetriever(chunks, embedder, store);
  }

  /** BM25 and vector search, fused with RRF, then reranked with a simple lexical reranker. */
  async retrieve(query: string, k = 5, candidates = 20): Promise<ScoredChunk[]> {
    const [qv] = await this.embedder.embed([query]);
    const lexical = this.bm25.search(query, candidates);
    const dense = await this.store.query(qv!, candidates);
    const bmRank = new Map(lexical.map((h, i) => [h.id, i + 1]));
    const vecRank = new Map(dense.map((h, i) => [h.id, i + 1]));
    const fused = reciprocalRankFusion([lexical.map((h) => h.id), dense.map((h) => h.id)]);
    const maxRrf = Math.max(...fused.values(), 1e-9);

    const qTerms = uniqueTerms(query);
    const qBigrams = new Set<string>();
    const ordered = terms(query);
    for (let i = 1; i < ordered.length; i++) qBigrams.add(`${ordered[i - 1]} ${ordered[i]}`);

    const scored: ScoredChunk[] = [];
    for (const [id, rrf] of fused) {
      const chunk = this.byId.get(id)!;
      const coverage = termCoverage(qTerms, chunk.searchText);
      const heading = termCoverage(qTerms, `${chunk.docTitle} ${chunk.section}`);
      const chunkTerms = terms(chunk.searchText);
      const chunkBigrams = new Set<string>();
      for (let i = 1; i < chunkTerms.length; i++) chunkBigrams.add(`${chunkTerms[i - 1]} ${chunkTerms[i]}`);
      const phrase = [...qBigrams].some((b) => chunkBigrams.has(b)) ? 1 : 0;
      const score = 0.4 * (rrf / maxRrf) + 0.35 * coverage + 0.2 * heading + 0.05 * phrase;
      scored.push({ chunk, score, rrf, bm25Rank: bmRank.get(id), vectorRank: vecRank.get(id), coverage });
    }
    return scored.sort((a, b) => b.score - a.score || a.chunk.id.localeCompare(b.chunk.id)).slice(0, k);
  }
}

