import type { Chunk, Doc } from "./types.js";
import { slugify, wordCount } from "./text.js";

export interface ChunkOptions {
  /** Maximum words in one chunk. Sections longer than this are split. */
  maxWords?: number;
  /** Words repeated at the start of the next chunk when a section is split. */
  overlapWords?: number;
}

function splitSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).filter(Boolean);
}

/** Pack sentences into windows of at most maxWords, carrying overlapWords of trailing sentences forward. */
export function windowSentences(sentences: string[], maxWords: number, overlapWords: number): string[] {
  const windows: string[] = [];
  let current: string[] = [];
  let count = 0;
  for (const s of sentences) {
    const w = wordCount(s);
    if (count + w > maxWords && current.length > 0) {
      windows.push(current.join(" "));
      const carry: string[] = [];
      let carried = 0;
      for (let i = current.length - 1; i >= 0 && carried < overlapWords; i--) {
        carry.unshift(current[i]!);
        carried += wordCount(current[i]!);
      }
      current = carry;
      count = carried;
    }
    current.push(s);
    count += w;
  }
  if (current.length > 0) windows.push(current.join(" "));
  return windows;
}

/** Heading aware chunking: one chunk per `##` section, split with overlap only when a section is long. */
export function chunkDoc(doc: Doc, opts: ChunkOptions = {}): Chunk[] {
  const maxWords = opts.maxWords ?? 110;
  const overlapWords = opts.overlapWords ?? 25;
  const sections: { heading: string; body: string }[] = [];
  let current: { heading: string; lines: string[] } | null = null;
  for (const line of doc.body.split("\n")) {
    const h = /^##\s+(.+?)\s*$/.exec(line);
    if (h) {
      if (current) sections.push({ heading: current.heading, body: current.lines.join("\n").trim() });
      current = { heading: h[1]!, lines: [] };
    } else if (current) {
      current.lines.push(line);
    }
  }
  if (current) sections.push({ heading: current.heading, body: current.lines.join("\n").trim() });

  const chunks: Chunk[] = [];
  for (const sec of sections) {
    if (!sec.body) continue;
    const slug = slugify(sec.heading);
    const flat = sec.body.replace(/\s*\n\s*/g, " ");
    const parts = wordCount(flat) > maxWords ? windowSentences(splitSentences(flat), maxWords, overlapWords) : [flat];
    parts.forEach((text, i) => {
      chunks.push({
        id: parts.length > 1 ? `${doc.id}#${slug}~${i + 1}` : `${doc.id}#${slug}`,
        docId: doc.id,
        docTitle: doc.title,
        section: sec.heading,
        sectionSlug: slug,
        effective: doc.effective,
        topic: doc.topic,
        text,
        searchText: `${doc.title}. ${sec.heading}. ${text}`,
      });
    });
  }
  return chunks;
}

export function chunkCorpus(docs: Doc[], opts?: ChunkOptions): Chunk[] {
  return docs.flatMap((d) => chunkDoc(d, opts));
}
