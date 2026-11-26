import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { z } from "zod";
import { LLMError, type LLM, type LLMRequest } from "./types.js";

export const RecordingsFile = z.object({
  version: z.literal(1),
  /** Plain statement of where the responses came from. Shown in the README and the eval report. */
  provenance: z.string(),
  entries: z.array(z.object({ promptHash: z.string(), questionId: z.string().optional(), response: z.string() })),
});
export type RecordingsFile = z.infer<typeof RecordingsFile>;

export class RecordingMissError extends LLMError {
  constructor(readonly key: string) {
    super(`No recorded response for request ${key.slice(0, 12)}. Re-record with npm run build:recordings.`);
  }
}

/** The key covers the full prompt, so a changed corpus, retriever or prompt invalidates the recording loudly. */
export function requestKey(req: LLMRequest): string {
  return createHash("sha256").update(req.system).update("\u0000").update(req.user).digest("hex");
}

/** Replays committed responses. Needs no key and no network, so tests and CI are deterministic. */
export class RecordedLLM implements LLM {
  readonly name = "recorded";
  private readonly byKey: Map<string, string>;
  calls = 0;

  constructor(entries: { promptHash: string; response: string }[]) {
    this.byKey = new Map(entries.map((e) => [e.promptHash, e.response]));
  }

  static fromFile(path: string): RecordedLLM {
    return new RecordedLLM(RecordingsFile.parse(JSON.parse(readFileSync(path, "utf8"))).entries);
  }

  async complete(req: LLMRequest): Promise<string> {
    this.calls++;
    const key = requestKey(req);
    const hit = this.byKey.get(key);
    if (hit === undefined) throw new RecordingMissError(key);
    return hit;
  }
}
