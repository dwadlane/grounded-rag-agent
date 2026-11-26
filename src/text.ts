import { LEXICON } from "./lexicon.js";

const STOP =
  "a an the and or of to in on at for from by with is are was were be been am do does did can could will would should may might i you we us our your my me it its this that these those there here what which who whom how when where why if as about into than then so not no any some up out over also have has had get got just many much long far often there's whats";
export const STOPWORDS = new Set(STOP.split(/\s+/));

/** Light suffix stripping. Good enough for English policy text, deterministic, no dependencies. */
export function stem(word: string): string {
  let w = word;
  if (w.length <= 3 || /^\d/.test(w)) return w;
  if (w.endsWith("ies") && w.length > 4) w = w.slice(0, -3) + "y";
  else if (w.endsWith("sses")) w = w.slice(0, -2);
  else if (w.endsWith("s") && !/(ss|us|is)$/.test(w)) w = w.slice(0, -1);
  if (w.endsWith("ing") && w.length > 5) w = w.slice(0, -3);
  else if (w.endsWith("ed") && w.length > 4) w = w.slice(0, -2);
  if (w.endsWith("e") && w.length > 3) w = w.slice(0, -1);
  return w;
}

export function rawTokens(text: string): string[] {
  return text.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

/** Content terms: lowercase, stopwords removed, stemmed, mapped through the lexicon. */
export function terms(text: string): string[] {
  const out: string[] = [];
  for (const t of rawTokens(text)) {
    if (STOPWORDS.has(t)) continue;
    const s = stem(t);
    out.push(LEXICON[t] ?? LEXICON[s] ?? s);
  }
  return out;
}

export function uniqueTerms(text: string): string[] {
  return [...new Set(terms(text))];
}

export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

export function wordCount(text: string): number {
  return (text.match(/\S+/g) ?? []).length;
}
