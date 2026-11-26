import { describe, expect, it } from "vitest";
import { chunkDoc, windowSentences } from "../src/chunk.js";
import { parseDoc } from "../src/corpus.js";

const doc = parseDoc(
  "demo",
  "---\ntitle: Demo Doc\neffective: 2026-01-01\n---\n\n# Demo\n\n## First Part\n\nOne short sentence.\n\n## Second Part\n\nAlpha beta gamma. Delta epsilon zeta. Eta theta iota. Kappa lambda mu.\n",
);

describe("chunking", () => {
  it("makes one chunk per heading and keeps metadata", () => {
    const chunks = chunkDoc(doc);
    expect(chunks.map((c) => c.id)).toEqual(["demo#first-part", "demo#second-part"]);
    expect(chunks[0]).toMatchObject({ docId: "demo", docTitle: "Demo Doc", effective: "2026-01-01", section: "First Part" });
  });
  it("prefixes the title and heading for retrieval", () => {
    expect(chunkDoc(doc)[1]!.searchText.startsWith("Demo Doc. Second Part.")).toBe(true);
  });
  it("splits long sections with overlap", () => {
    const parts = windowSentences(["a a a a.", "b b b b.", "c c c c.", "d d d d."], 8, 4);
    expect(parts.length).toBeGreaterThan(1);
    expect(parts[1]!.startsWith("b b b b.")).toBe(true);
  });
  it("gives split chunks distinct ids", () => {
    const chunks = chunkDoc(doc, { maxWords: 6, overlapWords: 3 }).filter((c) => c.sectionSlug === "second-part");
    expect(chunks.length).toBeGreaterThan(1);
    expect(new Set(chunks.map((c) => c.id)).size).toBe(chunks.length);
  });
});
