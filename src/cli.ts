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

/** The agent turns a failed model call into a refusal, so say why on stderr instead of hiding it. */
function loudly(inner: LLM): LLM {
  return {
    name: inner.name,
    async complete(req) {
      try {
        return await inner.complete(req);
      } catch (err) {
        console.error(`Model call failed: ${(err as Error).message}\nCheck ANTHROPIC_API_KEY, or add --recorded to replay the committed recordings.\n`);
        throw err;
      }
    },
  };
}

const args = process.argv.slice(2);
const trace = args.includes("--trace");
const forceRecorded = args.includes("--recorded");
const question = args.filter((a) => !a.startsWith("--")).join(" ").trim();
if (question) {
  const live = Boolean(process.env.ANTHROPIC_API_KEY) && !forceRecorded;
  const recorded = RecordedLLM.fromFile(new URL("../eval/recordings.json", import.meta.url).pathname);
  const llm: LLM = live ? loudly(new AnthropicLLM()) : recorded;
  if (!live) console.error("Answers come from the committed recordings, so only the eval questions have one. Set ANTHROPIC_API_KEY (and drop --recorded) to ask anything.\n");
  const agent = await createAgent({ llm });
  console.log(formatResult(await agent.ask(question), trace));
} else if (process.argv[1]?.endsWith("cli.ts")) {
  console.error('Usage: npm run ask "your question" [-- --trace] [--recorded]');
  process.exit(2);
}
