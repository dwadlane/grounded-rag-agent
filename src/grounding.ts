import type { Chunk } from "./types.js";
import { uniqueTerms } from "./text.js";

export interface AnswerSentence {
  text: string;
  /** 1 based passage numbers the model cited. */
  cites: number[];
}

export interface Verdict {
  sentence: AnswerSentence;
  ok: boolean;
  why: string;
}

/** Accept markers before or after the full stop, then split into sentences. */
export function parseAnswer(raw: string): AnswerSentence[] {
  const normalised = raw
    .trim()
    .replace(/([.!?])\s*((?:\[\d+\]\s*)+)/g, " $2$1")
    .replace(/\s+/g, " ");
  return normalised
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => ({
      text: s.replace(/\s*\[\d+\]/g, "").trim(),
      cites: [...s.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])),
    }));
}

const numberPattern = /\$?\d[\d,.:\-]*(?:\s?(?:am|pm))?/gi;

function normNumber(n: string): string {
  return n.toLowerCase().replace(/\s+/g, "").replace(/[.,:\-]+$/, "");
}

/** Every number, fee, time and phone number in the sentence, as written. */
export function numbersIn(text: string): string[] {
  return (text.match(numberPattern) ?? []).map(normNumber).filter(Boolean);
}

/**
 * A sentence is grounded when it cites real passages, every number in it appears
 * in those passages, and most of its content words appear there too.
 */
export function checkSentence(s: AnswerSentence, context: Chunk[], minSupport: number): Verdict {
  if (s.cites.length === 0) return { sentence: s, ok: false, why: "no citation" };
  const cited = s.cites.map((n) => context[n - 1]);
  if (cited.some((c) => !c)) return { sentence: s, ok: false, why: "cites a passage that was not provided" };
  const evidence = cited.map((c) => c!.text).join(" ");
  // Compare whole numbers, never substrings: "$9" is not "$95" and "2 hours" is not "12 hours".
  const evidenceNumbers = new Set(numbersIn(evidence));
  for (const n of numbersIn(s.text)) {
    if (!evidenceNumbers.has(n)) return { sentence: s, ok: false, why: `number ${n} not in cited passage` };
  }
  const want = uniqueTerms(s.text);
  const have = new Set(uniqueTerms(evidence + " " + cited.map((c) => c!.section).join(" ")));
  const support = want.length === 0 ? 1 : want.filter((t) => have.has(t)).length / want.length;
  if (support < minSupport) return { sentence: s, ok: false, why: `only ${(support * 100).toFixed(0)}% of its words appear in the cited passage` };
  return { sentence: s, ok: true, why: "supported" };
}

export interface GroundingOutcome {
  kept: AnswerSentence[];
  stripped: Verdict[];
  /** True when nothing usable is left, or when most of the answer had to be removed. */
  refuse: boolean;
}

export function checkAnswer(sentences: AnswerSentence[], context: Chunk[], minSupport: number): GroundingOutcome {
  const verdicts = sentences.map((s) => checkSentence(s, context, minSupport));
  const kept = verdicts.filter((v) => v.ok).map((v) => v.sentence);
  const stripped = verdicts.filter((v) => !v.ok);
  const refuse = kept.length === 0 || stripped.length > kept.length;
  return { kept, stripped, refuse };
}
