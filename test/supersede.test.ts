import { describe, expect, it } from "vitest";
import { chunkCorpus } from "../src/chunk.js";
import { loadCorpus } from "../src/corpus.js";
import { resolveSuperseded } from "../src/supersede.js";
import type { ScoredChunk } from "../src/types.js";

const all = chunkCorpus(loadCorpus("corpus"));
const pick = (id: string): ScoredChunk => ({ chunk: all.find((c) => c.id === id)!, score: 1, rrf: 1, coverage: 1 });

describe("supersession", () => {
  it("drops the outdated policy and swaps in the same section of the newest one", () => {
    const out = resolveSuperseded([pick("cancellation-policy-2024#late-cancellation-fee")], all);
    expect(out.dropped).toEqual(["cancellation-policy-2024#late-cancellation-fee"]);
    expect(out.chunks.map((c) => c.chunk.id)).toEqual(["cancellation-policy#late-cancellation-fee"]);
  });
  it("leaves current and unrelated chunks alone and never duplicates", () => {
    const out = resolveSuperseded(
      [pick("cancellation-policy#late-cancellation-fee"), pick("cancellation-policy-update-2025#late-cancellation-fee"), pick("fees-consultations#standard-fees")],
      all,
    );
    expect(out.chunks.map((c) => c.chunk.id)).toEqual(["cancellation-policy#late-cancellation-fee", "fees-consultations#standard-fees"]);
    expect(out.dropped).toHaveLength(1);
  });
});
