import { describe, expect, it } from "vitest";
import { slugify, stem, terms } from "../src/text.js";

describe("text", () => {
  it("stems plural and verb endings consistently", () => {
    expect(stem("closes")).toBe(stem("close"));
    expect(stem("closing")).toBe(stem("close"));
    expect(stem("fees")).toBe(stem("fee"));
  });
  it("drops stopwords and maps the domain lexicon", () => {
    expect(terms("What does it cost?")).toEqual(["fee"]);
    expect(terms("Can I see a physiotherapist")).toContain("physiotherapy");
  });
  it("slugifies headings", () => {
    expect(slugify("Baby Weigh-Ins")).toBe("baby-weighins");
    expect(slugify("Christmas and New Year")).toBe("christmas-and-new-year");
  });
});
