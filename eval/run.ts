import { readFileSync, writeFileSync } from "node:fs";
import { createAgent } from "../src/agent.js";
import { RecordedLLM, RecordingsFile } from "../src/llm/recorded.js";
import { Question, computeMetrics, grade, passes, percent, type Graded } from "../src/metrics.js";

const root = new URL("..", import.meta.url).pathname;
const questions = readFileSync(`${root}eval/questions.jsonl`, "utf8")
  .trim()
  .split("\n")
  .map((l) => Question.parse(JSON.parse(l)));
const recordings = RecordingsFile.parse(JSON.parse(readFileSync(`${root}eval/recordings.json`, "utf8")));
const llm = new RecordedLLM(recordings.entries);
const agent = await createAgent({ llm });

const rows: Graded[] = [];
for (const q of questions) {
  const before = llm.calls;
  const r = await agent.ask(q.question);
  rows.push(grade(q, r, llm.calls - before));
}
const m = computeMetrics(rows);

const line = (name: string, value: string, bar: string) => `| ${name} | ${value} | ${bar} |`;
const table = [
  "| Metric | Result | Bar |",
  "| --- | --- | --- |",
  line("Retrieval recall@5", percent(m.recallAt5), "at least 90%"),
  line("Retrieval recall@1", percent(m.recallAt1), "reported"),
  line("Answer correctness", percent(m.answerCorrectness), "reported"),
  line("Refusal accuracy", percent(m.refusalAccuracy), "reported"),
  line("Citation precision", percent(m.citationPrecision), "reported"),
  line("Conflicts resolved to newest document", percent(m.conflictNewest), "reported"),
  line("Emergencies routed to the fixed reply", percent(m.emergencyRouted), "100%"),
  line("Wrong policy answers", String(m.wrongPolicyAnswers), "0"),
].join("\n");

const problems = rows.filter((g) => !g.correct || g.recallHit === false);
const detail = problems.length
  ? problems
      .map(
        (g) =>
          `- ${g.q.id} (${g.q.type}): ${g.q.question}\n  status ${g.r.status}, reason ${g.r.reason}${g.wrong ? ", WRONG" : ""}, recall ${g.recallHit === null ? "n/a" : g.recallHit ? "hit" : "miss"}`,
      )
      .join("\n")
  : "None. Every question behaved as expected.";

const report = `# Eval Report

${m.total} questions: ${m.counts.answerable} answerable, ${m.counts.unanswerable} unanswerable, ${m.counts.conflict} conflicting-document, ${m.counts.emergency} emergency.

${table}

Model calls on emergency questions: ${rows.filter((g) => g.q.type === "emergency").reduce((a, g) => a + g.modelCalls, 0)}.
Stale recordings: ${m.recordingMisses}.

## Questions That Missed

${detail}

## Where The Answer Text Came From

${recordings.provenance}

Everything else in the pipeline (classify, retrieve, grade, supersede, groundedness) is real code running on every question.
`;
writeFileSync(`${root}eval/report.md`, report);

console.log(table);
console.log(`\n${problems.length} question(s) need a look. Report written to eval/report.md`);
if (!passes(m)) {
  console.error("\nEVAL FAILED: wrong answers above 0, recall@5 under 90%, a missed emergency, or a stale recording.");
  process.exit(1);
}
