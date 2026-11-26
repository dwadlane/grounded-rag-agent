import type { Chunk, ScoredChunk } from "./types.js";

export interface SupersedeResult {
  chunks: ScoredChunk[];
  /** Ids of chunks removed because a newer document covers the same topic. */
  dropped: string[];
}

/**
 * Newest document wins. For every topic we know the latest effective date in the
 * whole corpus, not just in the retrieved set, so an outdated chunk can never
 * slip through just because its newer sibling ranked lower. When a stale chunk
 * is dropped we swap in the matching section of the newest document.
 */
export function resolveSuperseded(retrieved: ScoredChunk[], allChunks: Chunk[]): SupersedeResult {
  const newest = new Map<string, string>();
  for (const c of allChunks) {
    const cur = newest.get(c.topic);
    if (!cur || c.effective > cur) newest.set(c.topic, c.effective);
  }
  const dropped: string[] = [];
  const kept: ScoredChunk[] = [];
  const seen = new Set<string>();
  const push = (s: ScoredChunk) => {
    if (!seen.has(s.chunk.id)) {
      seen.add(s.chunk.id);
      kept.push(s);
    }
  };
  for (const s of retrieved) {
    if (s.chunk.effective >= (newest.get(s.chunk.topic) ?? "")) {
      push(s);
      continue;
    }
    dropped.push(s.chunk.id);
    const replacement = allChunks.find(
      (c) => c.topic === s.chunk.topic && c.sectionSlug === s.chunk.sectionSlug && c.effective === newest.get(c.topic),
    );
    if (replacement) push({ ...s, chunk: replacement });
  }
  return { chunks: kept, dropped };
}
