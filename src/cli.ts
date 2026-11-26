import { createAgent } from "./agent.js";
import { AnthropicLLM } from "./llm/anthropic.js";
import { RecordedLLM } from "./llm/recorded.js";
import type { LLM } from "./llm/types.js";
import type { AgentResult } from "./types.js";

export function formatResult(r: AgentResult, withTrace = false): string {
  const lines = [`Status: ${r.status}`, "", r.answer];
  if (r.citations.length) {
    lines.push("", "Sources:");
    for (const c of r.citations) lines.push(`- ${c.docTitle}, ${c.section} (effective ${c.effective}) [${c.chunkId}]`);
  }
  if (withTrace) lines.push("", "Trace:", ...r.trace.map((t) => `- ${t}`));
  return lines.join("\n");
}

const args = process.argv.slice(2);
const trace = args.includes("--trace");
const question = args.filter((a) => a !== "--trace").join(" ").trim();
if (question) {
  const live = Boolean(process.env.ANTHROPIC_API_KEY);
  const llm: LLM = live
    ? new AnthropicLLM()
    : RecordedLLM.fromFile(new URL("../eval/recordings.json", import.meta.url).pathname);
  if (!live) console.error("No ANTHROPIC_API_KEY set, so answers come from the committed recordings (only the eval questions have one).\n");
  const agent = await createAgent({ llm });
  console.log(formatResult(await agent.ask(question), trace));
} else if (process.argv[1]?.endsWith("cli.ts")) {
  console.error('Usage: npm run ask "your question" [-- --trace]');
  process.exit(2);
}
