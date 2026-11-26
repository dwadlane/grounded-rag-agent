import { createAgent } from "../src/agent.js";
import { RecordedLLM } from "../src/llm/recorded.js";

const agent = await createAgent({ llm: new RecordedLLM([]) });
console.log((await agent.graph.getGraphAsync()).drawMermaid());
