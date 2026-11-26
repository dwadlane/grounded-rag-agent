import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { chunkCorpus } from "../src/chunk.js";
import { loadCorpus } from "../src/corpus.js";
import { Question } from "../src/metrics.js";
import { RecordingsFile } from "../src/llm/recorded.js";
import { createAgent } from "../src/agent.js";

describe("corpus and eval set", () => {
  const docs = loadCorpus("corpus");
  const chunks = chunkCorpus(docs);
  const questions = readFileSync("eval/questions.jsonl", "utf8").trim().split("\n").map((l) => Question.parse(JSON.parse(l)));

  it("has about 25 documents with valid front matter", () => {
    expect(docs.length).toBeGreaterThanOrEqual(25);
    expect(docs.every((d) => /^\d{4}-\d{2}-\d{2}$/.test(d.effective))).toBe(true);
  });
  it("has three documents on one topic with different dates", () => {
    const same = docs.filter((d) => d.topic === "cancellation-policy");
    expect(same).toHaveLength(3);
    expect(new Set(same.map((d) => d.effective)).size).toBe(3);
  });
  it("has the 60 question mix: 40 answerable, 12 unanswerable, 5 conflict, 3 emergency", () => {
    const n = (t: string) => questions.filter((x) => x.type === t).length;
    expect([n("answerable"), n("unanswerable"), n("conflict"), n("emergency")]).toEqual([40, 12, 5, 3]);
  });
  it("points every gold answer at a section that exists", () => {
    const ids = new Set(chunks.map((c) => c.id));
    for (const x of questions.filter((q) => q.goldDoc)) expect(ids.has(`${x.goldDoc}#${x.goldSection}`)).toBe(true);
  });
  it("has a compiled graph with every stage as a node", async () => {
    const { RecordedLLM } = await import("../src/llm/recorded.js");
    const agent = await createAgent({ llm: new RecordedLLM([]) });
    const mermaid = (await agent.graph.getGraphAsync()).drawMermaid();
    for (const node of ["classify", "retrieve", "grade", "answer", "groundedness", "safety_reply", "refuse"]) expect(mermaid).toContain(node);
  });
  it("ships recordings that say where they came from", () => {
    const file = RecordingsFile.parse(JSON.parse(readFileSync("eval/recordings.json", "utf8")));
    expect(file.provenance.length).toBeGreaterThan(40);
  });
});
