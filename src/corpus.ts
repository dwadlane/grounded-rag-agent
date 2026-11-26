import { readFileSync, readdirSync } from "node:fs";
import { basename, join } from "node:path";
import { z } from "zod";
import type { Doc } from "./types.js";

const FrontMatter = z.object({
  title: z.string().min(1),
  effective: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "effective must be YYYY-MM-DD"),
  topic: z.string().min(1).optional(),
});

export function parseDoc(id: string, raw: string): Doc {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(raw);
  if (!m) throw new Error(`${id}: missing front matter`);
  const fields: Record<string, string> = {};
  for (const line of m[1]!.split("\n")) {
    const i = line.indexOf(":");
    if (i > 0) fields[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  const fm = FrontMatter.parse(fields);
  return { id, title: fm.title, effective: fm.effective, topic: fm.topic ?? id, body: m[2]!.trim() };
}

export function loadCorpus(dir: string): Doc[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith(".md"))
    .sort()
    .map((f) => parseDoc(basename(f, ".md"), readFileSync(join(dir, f), "utf8")));
}
