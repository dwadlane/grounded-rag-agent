// Re-records eval/recordings.json from a real model. Needs ANTHROPIC_API_KEY. Model: ANTHROPIC_MODEL or claude-haiku-5-5.
import { readFileSync, writeFileSync } from "node:fs";
import { createAgent } from "../src/agent.js";
import { AnthropicLLM } from "../src/llm/anthropic.js";
import { requestKey, type RecordingsFile } from "../src/llm/recorded.js";
import type { LLM } from "../src/llm/types.js";
import { Question } from "../src/metrics.js";

const live = new AnthropicLLM();
const qs = readFileSync("eval/questions.jsonl", "utf8").trim().split("\n").map((l) => Question.parse(JSON.parse(l)));
const entries: RecordingsFile["entries"] = [];
let current = "";
const recorder: LLM = {
  name: live.name,
  async complete(req) {
    const response = await live.complete(req);
    entries.push({ promptHash: requestKey(req), questionId: current, response });
    return response;
  },
};
const agent = await createAgent({ llm: recorder });
for (const q of qs) {
  current = q.id;
  await agent.ask(q.question);
}
const file: RecordingsFile = {
  version: 1,
  provenance: `The answer text in eval/recordings.json was captured live from ${live.name} through the Anthropic Messages API (anthropic-version 2023-06-01).`,
  entries,
};
writeFileSync("eval/recordings.json", JSON.stringify(file, null, 1) + "\n");
console.log(`Recorded ${entries.length} responses from ${live.name}. Now run npm run eval.`);
