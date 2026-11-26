import { chunkCorpus } from "./chunk.js";
import { loadCorpus } from "./corpus.js";
import { LocalEmbedder } from "./embedders/local.js";
import type { Embedder } from "./embedders/types.js";
import { HybridRetriever } from "./retrieve.js";
import { InMemoryVectorStore, type VectorStore } from "./store.js";

export interface BuildOptions {
  corpusDir?: string;
  embedder?: Embedder;
  store?: VectorStore;
}

export async function buildRetriever(opts: BuildOptions = {}): Promise<HybridRetriever> {
  const chunks = chunkCorpus(loadCorpus(opts.corpusDir ?? new URL("../corpus", import.meta.url).pathname));
  const embedder = opts.embedder ?? new LocalEmbedder().fit(chunks.map((c) => c.searchText));
  return HybridRetriever.build(chunks, embedder, opts.store ?? new InMemoryVectorStore());
}
