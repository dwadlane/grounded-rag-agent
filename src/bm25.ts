import type { Chunk } from "./types.js";
import { terms } from "./text.js";

export class BM25 {
  private readonly docTerms: Map<string, string[]> = new Map();
  private readonly df = new Map<string, number>();
  private readonly avgLen: number;

  constructor(
    chunks: Chunk[],
    private readonly k1 = 1.5,
    private readonly b = 0.75,
  ) {
    let total = 0;
    for (const c of chunks) {
      const ts = terms(c.searchText);
      this.docTerms.set(c.id, ts);
      total += ts.length;
      for (const t of new Set(ts)) this.df.set(t, (this.df.get(t) ?? 0) + 1);
    }
    this.avgLen = total / Math.max(chunks.length, 1);
  }

  search(query: string, topK: number): { id: string; score: number }[] {
    const q = [...new Set(terms(query))];
    const n = this.docTerms.size;
    const out: { id: string; score: number }[] = [];
    for (const [id, ts] of this.docTerms) {
      const tf = new Map<string, number>();
      for (const t of ts) tf.set(t, (tf.get(t) ?? 0) + 1);
      let score = 0;
      for (const t of q) {
        const f = tf.get(t);
        if (!f) continue;
        const d = this.df.get(t) ?? 0;
        const idf = Math.log(1 + (n - d + 0.5) / (d + 0.5));
        score += (idf * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * ts.length) / this.avgLen));
      }
      if (score > 0) out.push({ id, score });
    }
    return out.sort((a, b) => b.score - a.score || a.id.localeCompare(b.id)).slice(0, topK);
  }
}
