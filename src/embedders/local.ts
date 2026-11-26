import { terms } from "../text.js";
import type { Embedder } from "./types.js";

function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

/**
 * Deterministic hashed TF-IDF vectors over unigrams and bigrams. No key, no
 * download, same output on every machine. Call `fit` with the corpus text so
 * rare words weigh more than common ones.
 */
export class LocalEmbedder implements Embedder {
  readonly name = "local-hashed-tfidf";
  private idf = new Map<string, number>();
  private defaultIdf = 1;

  constructor(private readonly dim = 1024) {}

  fit(corpus: string[]): this {
    const df = new Map<string, number>();
    for (const doc of corpus) for (const t of new Set(terms(doc))) df.set(t, (df.get(t) ?? 0) + 1);
    const n = corpus.length;
    this.idf = new Map([...df].map(([t, d]) => [t, Math.log(1 + n / d)]));
    this.defaultIdf = Math.log(1 + n);
    return this;
  }

  private vector(text: string): number[] {
    const v = new Array<number>(this.dim).fill(0);
    const ts = terms(text);
    const tf = new Map<string, number>();
    const add = (f: string, w: number) => tf.set(f, (tf.get(f) ?? 0) + w);
    ts.forEach((t, i) => {
      add(t, 1);
      if (i > 0) add(`${ts[i - 1]}_${t}`, 0.5);
    });
    for (const [feat, count] of tf) {
      const base = feat.split("_")[0]!;
      const idf = this.idf.get(base) ?? this.defaultIdf;
      const h = fnv1a(feat);
      const sign = (fnv1a(`s:${feat}`) & 1) === 0 ? 1 : -1;
      v[h % this.dim]! += sign * (1 + Math.log(count)) * idf;
    }
    const norm = Math.sqrt(v.reduce((a, x) => a + x * x, 0)) || 1;
    return v.map((x) => x / norm);
  }

  async embed(texts: string[]): Promise<number[][]> {
    return texts.map((t) => this.vector(t));
  }
}
