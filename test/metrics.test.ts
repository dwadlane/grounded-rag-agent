import { describe, expect, it } from "vitest";
import { computeMetrics, grade, hasFact, passes, type Question } from "../src/metrics.js";
import type { AgentResult } from "../src/types.js";

const result = (over: Partial<AgentResult>): AgentResult => ({
  question: "q", status: "answered", answer: "", citations: [], reason: "grounded",
  retrieved: ["fees#standard"], droppedStale: [], stripped: [], trace: [], ...over,
});
const q: Question = { id: "a01", type: "answerable", question: "q", goldDoc: "fees", goldSection: "standard", keyFacts: ["$95"], mustNotContain: ["$85"] };

describe("metrics", () => {
  it("matches facts on whole tokens and accepts alternatives", () => {
    expect(hasFact("It costs $300.", "$30")).toBe(false);
    expect(hasFact("We cannot bill either.", "do not|cannot")).toBe(true);
  });
  it("marks a confident wrong answer as wrong", () => {
    expect(grade(q, result({ answer: "It costs $85." }), 1).wrong).toBe(true);
    expect(grade(q, result({ answer: "It costs $95." }), 1)).toMatchObject({ correct: true, wrong: false });
  });
  it("does not count a refusal as wrong", () => {
    expect(grade(q, result({ status: "refused" }), 1)).toMatchObject({ correct: false, wrong: false });
  });
  it("fails the gate on any wrong answer or low recall", () => {
    const good = grade(q, result({ answer: "$95", citations: [{ chunkId: "fees#standard", doc: "fees", docTitle: "", section: "", effective: "" }] }), 1);
    expect(passes(computeMetrics([good]))).toBe(true);
    const bad = grade(q, result({ answer: "$85" }), 1);
    expect(passes(computeMetrics([good, bad]))).toBe(false);
    const miss = grade(q, result({ answer: "$95", retrieved: ["other#x"] }), 1);
    expect(passes(computeMetrics([miss]))).toBe(false);
  });
});
