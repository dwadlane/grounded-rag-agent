import { describe, expect, it } from "vitest";
import { LocalEmbedder } from "../src/embedders/local.js";
import { cosine } from "../src/store.js";

const corpus = ["parking costs six dollars an hour", "the clinic opens at eight", "referral valid twelve months"];

describe("LocalEmbedder", () => {
  it("is deterministic", async () => {
    const a = await new LocalEmbedder().fit(corpus).embed(["parking fee"]);
    const b = await new LocalEmbedder().fit(corpus).embed(["parking fee"]);
    expect(a).toEqual(b);
  });
  it("places related text closer than unrelated text", async () => {
    const e = new LocalEmbedder().fit(corpus);
    const [q, near, far] = await e.embed(["how much is parking", corpus[0]!, corpus[2]!]);
    expect(cosine(q!, near!)).toBeGreaterThan(cosine(q!, far!));
  });
});
