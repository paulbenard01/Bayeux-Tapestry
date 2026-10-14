import { describe, expect, it } from "vitest";
import { captionTokens, grammarLabel } from "../src/latin";

describe("captionTokens", () => {
  it("keys words by their expanded form and keeps supplied letters apart", () => {
    expect(captionTokens("HIC WILLELM[US] DUX")).toEqual([
      { kind: "word", key: "HIC", parts: [{ text: "HIC", supplied: false }] },
      {
        kind: "word",
        key: "WILLELMUS",
        parts: [
          { text: "WILLELM", supplied: false },
          { text: "US", supplied: true },
        ],
      },
      { kind: "word", key: "DUX", parts: [{ text: "DUX", supplied: false }] },
    ]);
  });
  it("handles several expansions in one word, separators and the Tironian et", () => {
    const tokens = captionTokens("S[AN]C[T]I — HAROLD ⁊ WIDO");
    expect(tokens.map((t) => (t.kind === "word" ? t.key : t.text))).toEqual(["SANCTI", "—", "HAROLD", "⁊", "WIDO"]);
    expect(tokens[0].kind === "word" && tokens[0].parts.map((p) => p.supplied)).toEqual([false, true, false, true, false]);
  });
  it("reads multi-line captions", () => {
    expect(captionTokens("HIC\n  EST WADARD").length).toBe(3);
  });
});

describe("grammarLabel", () => {
  it("translates each code and keeps unknown ones", () => {
    expect(grammarLabel("verb perf 3 pl", { verb: "verb", perf: "perfect", "3": "3rd person", pl: "plural" })).toBe(
      "verb, perfect, 3rd person, plural",
    );
    expect(grammarLabel("noun xyz", { noun: "noun" })).toBe("noun, xyz");
  });
});
