// Prints which chunks each question would show the answer model. Used when authoring recordings.
import { readFileSync } from "node:fs";
import { createAgent } from "../src/agent.js";
import type { LLM } from "../src/llm/types.js";
import { Question } from "../src/metrics.js";

const qs = readFileSync("eval/questions.jsonl", "utf8").trim().split("\n").map((l) => Question.parse(JSON.parse(l)));
let current = "";
const llm: LLM = {
  name: "dump",
  async complete(req) {
    const ids = [...req.user.matchAll(/^\[(\d+)\] \(document: ([^,]+), section: ([^,]+),/gm)].map((m) => `${m[1]}=${m[2]}#${m[3]}`);
    console.log(`${current} | ${ids.join(" ")}`);
    return "NOT_IN_DOCUMENTS";
  },
};
const agent = await createAgent({ llm });
for (const q of qs) {
  current = q.id;
  const r = await agent.ask(q.question);
  if (r.reason === "low_relevance") console.log(`${q.id} | (grade refused)`);
  if (r.status === "emergency" || r.status === "out_of_scope") console.log(`${q.id} | (${r.status})`);
}
