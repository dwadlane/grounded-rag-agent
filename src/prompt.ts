import type { Chunk } from "./types.js";

export const NOT_IN_DOCUMENTS = "NOT_IN_DOCUMENTS";

export const SYSTEM_PROMPT = [
  "You answer patient questions for Harbourside Outpatient Clinics using ONLY the numbered passages provided.",
  "Rules:",
  "1. Use only facts that appear in the passages. Never use outside knowledge and never guess.",
  `2. If the passages do not contain the answer, reply with exactly ${NOT_IN_DOCUMENTS} and nothing else.`,
  "3. Write one to three short sentences. Repeat numbers, times, fees and names exactly as written.",
  "4. End every sentence with the numbers of the passages that support it in square brackets, placed before the full stop, for example: A standard visit costs $95 [1].",
  "5. Do not give medical advice.",
].join("\n");

export function renderContext(chunks: Chunk[]): string {
  return chunks
    .map(
      (c, i) =>
        `[${i + 1}] (document: ${c.docId}, section: ${c.section}, effective: ${c.effective})\n${c.text}`,
    )
    .join("\n\n");
}

export function buildUserPrompt(question: string, chunks: Chunk[]): string {
  return `Passages:\n\n${renderContext(chunks)}\n\nQuestion: ${question}`;
}
