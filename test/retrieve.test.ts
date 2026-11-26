import { beforeAll, describe, expect, it } from "vitest";
import { BM25 } from "../src/bm25.js";
import { chunkCorpus } from "../src/chunk.js";
import { loadCorpus } from "../src/corpus.js";
import { buildRetriever } from "../src/index-build.js";
import type { HybridRetriever } from "../src/retrieve.js";
import { reciprocalRankFusion } from "../src/retrieve.js";

describe("rank fusion", () => {
  it("rewards items that appear in both lists", () => {
    const s = reciprocalRankFusion([["a", "b", "c"], ["c", "a", "d"]]);
    expect(s.get("a")!).toBeGreaterThan(s.get("b")!);
    expect(s.get("a")!).toBeGreaterThan(s.get("d")!);
  });
  it("uses 1 / (k + rank)", () => {
    expect(reciprocalRankFusion([["x"]], 60).get("x")).toBeCloseTo(1 / 61);
  });
});

describe("retrieval", () => {
  let r: HybridRetriever;
  beforeAll(async () => {
    r = await buildRetriever();
  });
  it("BM25 finds the exact section for a distinctive term", () => {
    const bm = new BM25(chunkCorpus(loadCorpus("corpus")));
    expect(bm.search("Millrace Hall overflow", 1)[0]!.id).toBe("parking-northshore-westbrook#westbrook");
  });
  it("hybrid retrieval puts the gold section first for plain questions", async () => {
    expect((await r.retrieve("How much does a standard doctor visit cost?"))[0]!.chunk.id).toBe("fees-consultations#standard-fees");
    expect((await r.retrieve("Where can I park when Westbrook is full?"))[0]!.chunk.id).toBe("parking-northshore-westbrook#westbrook");
  });
  it("returns at most k results, best first", async () => {
    const out = await r.retrieve("opening hours", 3);
    expect(out).toHaveLength(3);
    expect(out[0]!.score).toBeGreaterThanOrEqual(out[1]!.score);
  });
});
