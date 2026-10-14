// The Latin captions, word by word: splits a titulus into words with their editorial expansions. Pure.

/** A piece of a word: embroidered letters, or letters supplied by the editor (shown in brackets). */
export interface WordPart {
  text: string;
  supplied: boolean;
}

export type CaptionToken = { kind: "word"; key: string; parts: WordPart[] } | { kind: "separator"; text: string };

/** "HIC WILLELM[US] DUX — ROTBERT" -> words keyed by their expanded form (WILLELMUS), and separators. */
export function captionTokens(latin: string): CaptionToken[] {
  return latin
    .trim()
    .split(/\s+/)
    .map((raw): CaptionToken => {
      if (!/[\p{L}⁊]/u.test(raw)) return { kind: "separator", text: raw };
      const parts: WordPart[] = [];
      for (const m of raw.matchAll(/\[([^\]]*)\]|([^[]+)/g)) {
        if (m[1] !== undefined) parts.push({ text: m[1], supplied: true });
        else parts.push({ text: m[2], supplied: false });
      }
      return { kind: "word", key: parts.map((p) => p.text).join(""), parts };
    });
}

/** "verb perf 3 pl" -> "verb, perfect, 3rd person, plural" with the given labels; unknown codes are kept. */
export function grammarLabel(gram: string, labels: Record<string, string>): string {
  return gram
    .split(/\s+/)
    .filter(Boolean)
    .map((code) => labels[code] ?? code)
    .join(", ");
}
