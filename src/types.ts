export interface DocMeta {
  id: string;
  title: string;
  /** ISO date (YYYY-MM-DD) the document took effect. */
  effective: string;
  /** Documents sharing a topic describe the same matter; the newest one wins. */
  topic: string;
}

export interface Doc extends DocMeta {
  body: string;
}

export interface Chunk {
  /** Stable id: `<docId>#<sectionSlug>` plus `~n` for split sections. */
  id: string;
  docId: string;
  docTitle: string;
  section: string;
  sectionSlug: string;
  effective: string;
  topic: string;
  /** The text the answer model sees. */
  text: string;
  /** Title and heading are prepended so a short chunk keeps its context while retrieving. */
  searchText: string;
}

export interface ScoredChunk {
  chunk: Chunk;
  /** Final score after reranking. */
  score: number;
  rrf: number;
  bm25Rank?: number;
  vectorRank?: number;
  coverage: number;
}

export interface Citation {
  chunkId: string;
  doc: string;
  docTitle: string;
  section: string;
  effective: string;
}

export type AgentStatus = "answered" | "refused" | "emergency" | "out_of_scope";

export interface AgentResult {
  question: string;
  status: AgentStatus;
  answer: string;
  citations: Citation[];
  /** Short machine reason, useful in logs and evals. */
  reason: string;
  /** Top retrieved chunk ids, before stale documents were removed. */
  retrieved: string[];
  /** Chunks removed because a newer document covers the same topic. */
  droppedStale: string[];
  /** Answer sentences removed by the groundedness check. */
  stripped: string[];
  trace: string[];
}
