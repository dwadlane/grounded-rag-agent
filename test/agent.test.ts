import { beforeAll, describe, expect, it } from "vitest";
import { createAgent } from "../src/agent.js";
import { buildRetriever } from "../src/index-build.js";
import type { HybridRetriever } from "../src/retrieve.js";
import type { LLM } from "../src/llm/types.js";
import { ExplodingLLM, StubLLM } from "./helpers.js";

let retriever: HybridRetriever;
beforeAll(async () => {
  retriever = await buildRetriever();
});
const make = (llm: LLM) => createAgent({ llm, retriever });

describe("safety routes never touch the model", () => {
  it("answers an emergency with the fixed reply", async () => {
    const r = await (await make(new ExplodingLLM())).ask("I have chest pain, can I get an appointment tomorrow?");
    expect(r.status).toBe("emergency");
    expect(r.answer).toContain("911");
    expect(r.retrieved).toEqual([]);
  });
  it("answers out of scope requests with the fixed reply", async () => {
    const r = await (await make(new ExplodingLLM())).ask("What dose of ibuprofen should I take?");
    expect(r.status).toBe("out_of_scope");
  });
  it("refuses low relevance questions before calling the model", async () => {
    const r = await (await make(new ExplodingLLM())).ask("Do you offer dental implants?");
    expect(r).toMatchObject({ status: "refused", reason: "low_relevance" });
  });
});

describe("answers and refusals", () => {
  it("returns a cited answer when the draft is grounded", async () => {
    const llm = new StubLLM("A standard family medicine visit of up to 15 minutes costs $95 [1].");
    const r = await (await make(llm)).ask("How much is a standard doctor visit?");
    expect(r.status).toBe("answered");
    expect(r.citations[0]).toMatchObject({ doc: "fees-consultations", section: "Standard Fees" });
  });
  it("refuses when the model says the answer is not in the documents", async () => {
    const r = await (await make(new StubLLM("NOT_IN_DOCUMENTS"))).ask("Who is the chief executive of Harbourside Outpatient Clinics?");
    expect(r).toMatchObject({ status: "refused", reason: "model_declined" });
  });
  it("refuses a draft with an invented number", async () => {
    const r = await (await make(new StubLLM("A standard visit costs $85 [1]."))).ask("How much is a standard doctor visit?");
    expect(r.status).toBe("refused");
    expect(r.stripped[0]).toContain("$85");
  });
  it("refuses a draft with no citations", async () => {
    const r = await (await make(new StubLLM("A standard visit costs $95."))).ask("How much is a standard doctor visit?");
    expect(r).toMatchObject({ status: "refused", reason: "ungrounded" });
  });
  it("strips one unsupported sentence and keeps the supported one", async () => {
    const llm = new StubLLM("A standard visit costs $95 [1]. Every visit includes a free massage [1]. Pediatric visits cost $110 [1].");
    const r = await (await make(llm)).ask("How much is a standard doctor visit?");
    expect(r.status).toBe("answered");
    expect(r.stripped).toHaveLength(1);
    expect(r.answer).not.toContain("massage");
  });
  it("turns a missing recording or a failing model into a refusal, not a crash", async () => {
    const miss = await (await make({ name: "x", complete: async () => { throw new Error("boom"); } })).ask("How much is a standard doctor visit?");
    expect(miss).toMatchObject({ status: "refused", reason: "llm_error" });
  });
});

describe("conflicting documents", () => {
  it("shows the model only the newest cancellation policy", async () => {
    const llm = new StubLLM("NOT_IN_DOCUMENTS");
    const r = await (await make(llm)).ask("What is the fee if I cancel my appointment late?");
    const prompt = llm.calls[0]!.user;
    expect(prompt).toContain("document: cancellation-policy, section: Late Cancellation Fee, effective: 2026-03-01");
    expect(prompt).not.toContain("cancellation-policy-2024");
    expect(prompt).not.toContain("cancellation-policy-update-2025");
    expect(r.droppedStale.length).toBeGreaterThan(0);
  });
});
