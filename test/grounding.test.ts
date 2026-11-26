import { describe, expect, it } from "vitest";
import { checkAnswer, checkSentence, numbersIn, parseAnswer } from "../src/grounding.js";
import type { Chunk } from "../src/types.js";

const chunk = (text: string): Chunk => ({
  id: "d#s", docId: "d", docTitle: "Doc", section: "Standard Fees", sectionSlug: "standard-fees",
  effective: "2026-01-01", topic: "d", text, searchText: text,
});
const ctx = [chunk("A standard family medicine visit of up to 15 minutes costs $95. A pediatric visit costs $110.")];

describe("groundedness", () => {
  it("parses citations before or after the full stop", () => {
    const a = parseAnswer("The fee is $95 [1]. Kids cost $110. [1]");
    expect(a).toEqual([
      { text: "The fee is $95.", cites: [1] },
      { text: "Kids cost $110.", cites: [1] },
    ]);
  });
  it("extracts numbers, fees, times and phone numbers", () => {
    expect(numbersIn("Call 1-800-555-0100 at 8:00am, fee $4.50.")).toEqual(["1-800-555-0100", "8:00am", "$4.50"]);
  });
  it("accepts a supported sentence", () => {
    expect(checkSentence(parseAnswer("A standard visit costs $95 [1].")[0]!, ctx, 0.6).ok).toBe(true);
  });
  it("rejects a sentence with no citation", () => {
    expect(checkSentence(parseAnswer("A standard visit costs $95.")[0]!, ctx, 0.6)).toMatchObject({ ok: false, why: "no citation" });
  });
  it("rejects a citation to a passage that was never provided", () => {
    expect(checkSentence(parseAnswer("A standard visit costs $95 [4].")[0]!, ctx, 0.6).ok).toBe(false);
  });
  it("rejects a wrong number even when the words match", () => {
    expect(checkSentence(parseAnswer("A standard visit costs $85 [1].")[0]!, ctx, 0.6).why).toContain("$85");
  });
  it("rejects a confident sentence that the passage does not support", () => {
    expect(checkSentence(parseAnswer("Appointments are free on Sundays [1].")[0]!, ctx, 0.6).ok).toBe(false);
  });
  it("strips bad sentences and refuses when most of the answer is bad", () => {
    const mixed = checkAnswer(parseAnswer("A standard visit costs $95 [1]. The clinic also offers free parking for life [1]."), ctx, 0.6);
    expect(mixed.kept).toHaveLength(1);
    expect(mixed.refuse).toBe(false);
    const bad = checkAnswer(parseAnswer("Visits are free [1]. Parking is free [1]. A visit costs $95 [1]."), ctx, 0.6);
    expect(bad.refuse).toBe(true);
  });
});
