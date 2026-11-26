import { describe, expect, it } from "vitest";
import { AnthropicLLM } from "../src/llm/anthropic.js";
import { RecordedLLM, RecordingMissError, requestKey } from "../src/llm/recorded.js";

describe("RecordedLLM", () => {
  const req = { system: "s", user: "u" };
  it("replays a recording by prompt hash", async () => {
    const llm = new RecordedLLM([{ promptHash: requestKey(req), response: "hello" }]);
    expect(await llm.complete(req)).toBe("hello");
  });
  it("throws a clear error on a miss", async () => {
    await expect(new RecordedLLM([]).complete(req)).rejects.toBeInstanceOf(RecordingMissError);
  });
  it("keys on both system and user text", () => {
    expect(requestKey({ system: "a", user: "b" })).not.toBe(requestKey({ system: "ab", user: "" }));
  });
});

describe("AnthropicLLM", () => {
  it("sends the documented headers and body, and reads the text block", async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const fakeFetch = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ content: [{ type: "text", text: "ok [1]." }] }), { status: 200 });
    }) as unknown as typeof fetch;
    const llm = new AnthropicLLM({ apiKey: "test-key", fetchImpl: fakeFetch });
    expect(await llm.complete({ system: "sys", user: "hi" })).toBe("ok [1].");
    const headers = seen!.init.headers as Record<string, string>;
    expect(seen!.url).toBe("https://api.anthropic.com/v1/messages");
    expect(headers["anthropic-version"]).toBe("2023-06-01");
    expect(headers["x-api-key"]).toBe("test-key");
    expect(JSON.parse(seen!.init.body as string)).toMatchObject({ model: "claude-haiku-5-5", system: "sys" });
  });
  it("refuses to start without a key", () => {
    const saved = process.env.ANTHROPIC_API_KEY;
    delete process.env.ANTHROPIC_API_KEY;
    try {
      expect(() => new AnthropicLLM()).toThrow(/ANTHROPIC_API_KEY/);
    } finally {
      if (saved !== undefined) process.env.ANTHROPIC_API_KEY = saved;
    }
  });
});
