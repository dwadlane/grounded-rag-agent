import { writeFileSync } from "node:fs";
import { createAgent } from "../src/agent.js";
import { formatResult } from "../src/cli.js";
import { RecordedLLM } from "../src/llm/recorded.js";

const llm = RecordedLLM.fromFile("eval/recordings.json");
const agent = await createAgent({ llm });
const picks: { label: string; q: string }[] = [
  { label: "Answered with citations: a fee", q: "How much is a standard doctor visit?" },
  { label: "Answered with citations: two facts from one section", q: "How much does parking cost at the Central clinic?" },
  { label: "Answered with citations: no referral needed", q: "Do I need a referral to see a physiotherapist?" },
  { label: "Refusal: the documents do not say", q: "How much does an MRI scan cost at your clinics?" },
  { label: "Conflict resolved to the newest document", q: "What is the fee if I cancel my appointment late?" },
  { label: "Emergency: fixed safety reply, model never called", q: "I have crushing chest pain and my left arm feels numb. Can I get an appointment today?" },
];
const parts = [
  "# Demo Output",
  "",
  "Six runs of `npm run ask`, replayed from the committed recordings. The corpus is synthetic. Answer text comes from the recordings described in `eval/report.md`.",
];
for (const [i, p] of picks.entries()) {
  const before = llm.calls;
  const r = await agent.ask(p.q);
  const stale = r.droppedStale.length ? `\nOutdated chunks removed before answering: ${r.droppedStale.join(", ")}\n` : "";
  parts.push("", `## ${i + 1}. ${p.label}`, "", `Question: ${p.q}`, "", "```text", formatResult(r, true), "```", stale, `Model calls: ${llm.calls - before}`);
}
writeFileSync("examples/demo-output.md", parts.join("\n") + "\n");
console.log("Wrote examples/demo-output.md");
