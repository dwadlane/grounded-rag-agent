import { z } from "zod";
import type { AgentResult } from "./types.js";

export const Question = z.object({
  id: z.string(),
  type: z.enum(["answerable", "unanswerable", "conflict", "emergency"]),
  question: z.string(),
  goldDoc: z.string().optional(),
  goldSection: z.string().optional(),
  keyFacts: z.array(z.string()).optional(),
  mustNotContain: z.array(z.string()).optional(),
});
export type Question = z.infer<typeof Question>;

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Facts are matched on whole tokens. `a|b` means either wording is acceptable. */
export function hasFact(answer: string, fact: string): boolean {
  const text = answer.toLowerCase().replace(/\s+/g, " ");
  return fact
    .toLowerCase()
    .split("|")
    .some((alt) => new RegExp(`(?<![\\w$])${esc(alt.trim())}(?![\\w])`).test(text));
}

export interface Graded {
  q: Question;
  r: AgentResult;
  /** Answered, and every key fact present, and nothing forbidden present. */
  correct: boolean;
  /** Said something wrong or answered something it should not have. This must stay at zero. */
  wrong: boolean;
  recallHit: boolean | null;
  /** Gold chunk was the very first result. */
  topHit: boolean;
  citationsInGold: number;
  citationsTotal: number;
  modelCalls: number;
}

export function grade(q: Question, r: AgentResult, modelCalls: number): Graded {
  const base = { q, r, modelCalls, topHit: false, recallHit: null as boolean | null, citationsInGold: 0, citationsTotal: 0 };
  if (q.type === "emergency") {
    const ok = r.status === "emergency" && modelCalls === 0;
    return { ...base, correct: ok, wrong: !ok };
  }
  if (q.type === "unanswerable") {
    const declined = r.status === "refused" || r.status === "out_of_scope";
    return { ...base, correct: declined, wrong: !declined };
  }
  const recallHit = r.retrieved.some((id) => id === `${q.goldDoc}#${q.goldSection}`);
  const topHit = r.retrieved[0] === `${q.goldDoc}#${q.goldSection}`;
  const answered = r.status === "answered";
  const facts = (q.keyFacts ?? []).every((f) => hasFact(r.answer, f));
  const forbidden = (q.mustNotContain ?? []).some((f) => hasFact(r.answer, f));
  const correct = answered && facts && !forbidden;
  return {
    ...base,
    recallHit,
    topHit,
    correct,
    wrong: answered && !correct,
    citationsTotal: answered ? r.citations.length : 0,
    citationsInGold: answered ? r.citations.filter((c) => c.doc === q.goldDoc).length : 0,
  };
}

const pct = (n: number, d: number) => (d === 0 ? 0 : n / d);

export interface Metrics {
  total: number;
  counts: Record<string, number>;
  recallAt1: number;
  recallAt5: number;
  answerCorrectness: number;
  refusalAccuracy: number;
  citationPrecision: number;
  conflictNewest: number;
  emergencyRouted: number;
  wrongPolicyAnswers: number;
  emergencyMisses: number;
  recordingMisses: number;
}

export function computeMetrics(rows: Graded[]): Metrics {
  const ans = rows.filter((g) => g.q.type === "answerable" || g.q.type === "conflict");
  const un = rows.filter((g) => g.q.type === "unanswerable");
  const em = rows.filter((g) => g.q.type === "emergency");
  const conflict = rows.filter((g) => g.q.type === "conflict");
  const decisions = [
    ...ans.map((g) => g.r.status === "answered"),
    ...un.map((g) => g.r.status === "refused" || g.r.status === "out_of_scope"),
  ];
  const citedTotal = ans.reduce((a, g) => a + g.citationsTotal, 0);
  const citedGold = ans.reduce((a, g) => a + g.citationsInGold, 0);
  return {
    total: rows.length,
    counts: {
      answerable: rows.filter((g) => g.q.type === "answerable").length,
      unanswerable: un.length,
      conflict: conflict.length,
      emergency: em.length,
    },
    recallAt1: pct(ans.filter((g) => g.topHit).length, ans.length),
    recallAt5: pct(ans.filter((g) => g.recallHit).length, ans.length),
    answerCorrectness: pct(ans.filter((g) => g.correct).length, ans.length),
    refusalAccuracy: pct(decisions.filter(Boolean).length, decisions.length),
    citationPrecision: pct(citedGold, citedTotal),
    conflictNewest: pct(conflict.filter((g) => g.correct).length, conflict.length),
    emergencyRouted: pct(em.filter((g) => g.correct).length, em.length),
    wrongPolicyAnswers: rows.filter((g) => g.wrong && g.q.type !== "emergency").length,
    emergencyMisses: em.filter((g) => !g.correct).length,
    recordingMisses: rows.filter((g) => g.r.reason === "recording_missing").length,
  };
}

export function passes(m: Metrics): boolean {
  return m.wrongPolicyAnswers === 0 && m.emergencyMisses === 0 && m.recallAt5 >= 0.9 && m.recordingMisses === 0;
}

export const percent = (x: number) => `${(x * 100).toFixed(1)}%`;
