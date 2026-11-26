// Builds eval/recordings.json. Each authored answer is stored under the hash of the exact prompt the
// pipeline built for that question, so a change to the corpus, retriever or prompt is caught by the eval.
import { readFileSync, writeFileSync } from "node:fs";
import { createAgent } from "../src/agent.js";
import { requestKey, type RecordingsFile } from "../src/llm/recorded.js";
import type { LLM } from "../src/llm/types.js";
import { Question } from "../src/metrics.js";

const authored: Record<string, string> = JSON.parse(readFileSync("eval/authored-answers.json", "utf8"));
const qs = readFileSync("eval/questions.jsonl", "utf8").trim().split("\n").map((l) => Question.parse(JSON.parse(l)));
const entries: RecordingsFile["entries"] = [];
const missing: string[] = [];
let current = "";
const llm: LLM = {
  name: "authoring",
  async complete(req) {
    const response = authored[current];
    if (response === undefined) {
      missing.push(current);
      return "NOT_IN_DOCUMENTS";
    }
    entries.push({ promptHash: requestKey(req), questionId: current, response });
    return response;
  },
};
const agent = await createAgent({ llm });
for (const q of qs) {
  current = q.id;
  await agent.ask(q.question);
}
if (missing.length) {
  console.error(`No authored answer for: ${missing.join(", ")}`);
  process.exit(1);
}
const file: RecordingsFile = {
  version: 1,
  provenance:
    "The answer text in eval/recordings.json was written offline by Claude, reading each question's retrieved passages, because no live API key was available when the suite was built. It is not captured from the Anthropic API. Run `npm run record` with ANTHROPIC_API_KEY set to replace it with real model output and see what your model scores.",
  entries,
};
writeFileSync("eval/recordings.json", JSON.stringify(file, null, 1) + "\n");
console.log(`Wrote ${entries.length} recordings.`);
