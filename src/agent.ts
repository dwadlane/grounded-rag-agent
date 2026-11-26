import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { classify, type Route } from "./classify.js";
import { DEFAULT_CONFIG, type AgentConfig } from "./config.js";
import { buildRetriever, type BuildOptions } from "./index-build.js";
import { checkAnswer, parseAnswer, type AnswerSentence } from "./grounding.js";
import type { LLM } from "./llm/types.js";
import { RecordingMissError } from "./llm/recorded.js";
import { NOT_IN_DOCUMENTS, SYSTEM_PROMPT, buildUserPrompt } from "./prompt.js";
import type { HybridRetriever } from "./retrieve.js";
import { termCoverage } from "./retrieve.js";
import { resolveSuperseded } from "./supersede.js";
import { uniqueTerms } from "./text.js";
import type { AgentResult, AgentStatus, Chunk, Citation, ScoredChunk } from "./types.js";

const State = Annotation.Root({
  question: Annotation<string>(),
  route: Annotation<Route>(),
  retrieved: Annotation<ScoredChunk[]>(),
  context: Annotation<Chunk[]>(),
  droppedStale: Annotation<string[]>(),
  llmText: Annotation<string>(),
  kept: Annotation<AnswerSentence[]>(),
  stripped: Annotation<string[]>(),
  status: Annotation<AgentStatus>(),
  reason: Annotation<string>(),
  finalAnswer: Annotation<string>(),
  trace: Annotation<string[]>({ reducer: (a, b) => a.concat(b), default: () => [] }),
});

export interface AgentOptions extends BuildOptions {
  llm: LLM;
  config?: Partial<AgentConfig>;
  retriever?: HybridRetriever;
}

export interface Agent {
  ask(question: string): Promise<AgentResult>;
  graph: ReturnType<typeof compileGraph>;
}

function compileGraph(retriever: HybridRetriever, llm: LLM, cfg: AgentConfig) {
  return new StateGraph(State)
    // 1. Classify. Pure code, no model. Emergencies and out of scope never reach retrieval or the model.
    .addNode("classify", (s) => {
      const c = classify(s.question);
      return { route: c.route, trace: [`classify: ${c.route} (${c.reason})`] };
    })
    .addNode("safety_reply", () => ({
      status: "emergency" as const,
      reason: "emergency_phrase",
      finalAnswer: cfg.messages.emergency,
      trace: ["safety_reply: fixed emergency message, model not called"],
    }))
    .addNode("out_of_scope_reply", () => ({
      status: "out_of_scope" as const,
      reason: "advice_or_unrelated",
      finalAnswer: cfg.messages.outOfScope,
      trace: ["out_of_scope_reply: fixed message, model not called"],
    }))
    // 2. Retrieve. BM25 + vectors, fused with RRF, then reranked.
    .addNode("retrieve", async (s) => {
      const retrieved = await retriever.retrieve(s.question, cfg.topK);
      return { retrieved, trace: [`retrieve: ${retrieved.map((r) => r.chunk.id).join(", ")}`] };
    })
    // 3. Grade. Drop outdated documents, then ask: do these chunks even cover the question?
    .addNode("grade", (s) => {
      const { chunks, dropped } = resolveSuperseded(s.retrieved, retriever.chunks);
      const context = chunks.map((c) => c.chunk);
      const q = uniqueTerms(s.question);
      const coverage = termCoverage(q, context.map((c) => c.searchText).join(" "));
      const ok = context.length > 0 && coverage >= cfg.minCoverage;
      return {
        context,
        droppedStale: dropped,
        reason: ok ? "relevant" : "low_relevance",
        trace: [
          ...(dropped.length ? [`grade: dropped outdated ${dropped.join(", ")}`] : []),
          `grade: coverage ${(coverage * 100).toFixed(0)}% (needs ${(cfg.minCoverage * 100).toFixed(0)}%) -> ${ok ? "answer" : "refuse"}`,
        ],
      };
    })
    // 4. Answer with citations, or say it is not in the documents.
    .addNode("answer", async (s) => {
      try {
        const text = await llm.complete({ system: SYSTEM_PROMPT, user: buildUserPrompt(s.question, s.context) });
        const refused = text.trim().startsWith(NOT_IN_DOCUMENTS);
        return {
          llmText: text,
          reason: refused ? "model_declined" : "drafted",
          trace: [`answer: ${refused ? "model said the answer is not in the documents" : "drafted with citations"}`],
        };
      } catch (err) {
        const reason = err instanceof RecordingMissError ? "recording_missing" : "llm_error";
        return { llmText: NOT_IN_DOCUMENTS, reason, trace: [`answer: ${reason}`] };
      }
    })
    // 5. Groundedness. Every sentence must map to a cited chunk, or it is removed.
    .addNode("groundedness", (s) => {
      const out = checkAnswer(parseAnswer(s.llmText), s.context, cfg.minSupport);
      return {
        kept: out.kept,
        stripped: out.stripped.map((v) => `${v.sentence.text} (${v.why})`),
        reason: out.refuse ? "ungrounded" : "grounded",
        trace: [
          `groundedness: kept ${out.kept.length}, stripped ${out.stripped.length}${out.stripped.map((v) => ` [${v.why}]`).join("")}`,
        ],
      };
    })
    .addNode("finalize", (s) => ({
      status: "answered" as const,
      finalAnswer: s.kept.map((k) => k.text).join(" "),
      trace: ["finalize: answered"],
    }))
    .addNode("refuse", (s) => ({
      status: "refused" as const,
      finalAnswer: cfg.messages.refusal,
      trace: [`refuse: ${s.reason}`],
    }))
    .addEdge(START, "classify")
    .addConditionalEdges("classify", (s) => s.route, {
      emergency: "safety_reply",
      out_of_scope: "out_of_scope_reply",
      in_scope: "retrieve",
    })
    .addEdge("retrieve", "grade")
    .addConditionalEdges("grade", (s) => (s.reason === "relevant" ? "relevant" : "low_relevance"), {
      relevant: "answer",
      low_relevance: "refuse",
    })
    .addConditionalEdges("answer", (s) => (s.reason === "drafted" ? "drafted" : "declined"), {
      drafted: "groundedness",
      declined: "refuse",
    })
    .addConditionalEdges("groundedness", (s) => (s.reason === "grounded" ? "grounded" : "ungrounded"), {
      grounded: "finalize",
      ungrounded: "refuse",
    })
    .addEdge("safety_reply", END)
    .addEdge("out_of_scope_reply", END)
    .addEdge("finalize", END)
    .addEdge("refuse", END)
    .compile();
}

function citationsFor(kept: AnswerSentence[], context: Chunk[]): Citation[] {
  const seen = new Set<string>();
  const out: Citation[] = [];
  for (const s of kept) {
    for (const n of s.cites) {
      const c = context[n - 1];
      if (c && !seen.has(c.id)) {
        seen.add(c.id);
        out.push({ chunkId: c.id, doc: c.docId, docTitle: c.docTitle, section: c.section, effective: c.effective });
      }
    }
  }
  return out;
}

export async function createAgent(opts: AgentOptions): Promise<Agent> {
  const cfg: AgentConfig = { ...DEFAULT_CONFIG, ...opts.config };
  const retriever = opts.retriever ?? (await buildRetriever(opts));
  const graph = compileGraph(retriever, opts.llm, cfg);
  return {
    graph,
    async ask(question: string): Promise<AgentResult> {
      const s = await graph.invoke({ question });
      const answered = s.status === "answered";
      return {
        question,
        status: s.status,
        answer: s.finalAnswer,
        citations: answered ? citationsFor(s.kept ?? [], s.context ?? []) : [],
        reason: answered ? "grounded" : s.reason,
        retrieved: (s.retrieved ?? []).map((r) => r.chunk.id),
        droppedStale: s.droppedStale ?? [],
        stripped: s.stripped ?? [],
        trace: s.trace,
      };
    },
  };
}
