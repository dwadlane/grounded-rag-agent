import { describe, expect, it } from "vitest";
import { classify } from "../src/classify.js";

describe("classify", () => {
  it.each([
    "I have chest pain, can I come in?",
    "my dad can't breathe properly",
    "I think my friend is having a stroke",
    "I want to end my life",
  ])("routes emergencies: %s", (q) => {
    expect(classify(q).route).toBe("emergency");
  });
  it("routes medical advice and unrelated requests out of scope", () => {
    expect(classify("What dose of paracetamol should I take?").route).toBe("out_of_scope");
    expect(classify("What's the weather today?").route).toBe("out_of_scope");
  });
  it("keeps ordinary clinic questions in scope", () => {
    expect(classify("What time do you open on Saturday?").route).toBe("in_scope");
    expect(classify("Do I need a referral for physiotherapy?").route).toBe("in_scope");
  });
  it("checks emergencies before scope", () => {
    expect(classify("What dose should I take, I think I overdosed").route).toBe("emergency");
  });
});
