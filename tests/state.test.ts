import { describe, expect, it } from "vitest";
import { browserLang, parseLenses, parseState, serializeState } from "../src/state";
import { LENSES, type Lens } from "../src/types";

describe("URL state", () => {
  it("reads language, scene, view and tool", () => {
    expect(parseState("?lang=en&scene=23&view=text", "fr", 58)).toEqual({
      lang: "en",
      scene: 23,
      view: "text",
      tool: "none",
      image: null,
      lenses: [...LENSES],
      tour: "full",
    });
    expect(parseState("?tool=cues", "fr", 58).tool).toBe("cues");
  });
  it("ignores invalid values", () => {
    expect(parseState("?lang=de&scene=99&view=x&tool=y", "fr", 58)).toEqual({
      lang: "fr",
      scene: null,
      view: "strip",
      tool: "none",
      image: null,
      lenses: [...LENSES],
      tour: "full",
    });
    expect(parseState("?scene=2.5", "en", 58).scene).toBeNull();
  });
  it("round-trips", () => {
    const state = {
      lang: "en" as const,
      scene: 57,
      view: "afterlife" as const,
      tool: "none" as const,
      image: "commons",
      lenses: ["material", "art"] as Lens[],
      tour: "highlights" as const,
    };
    expect(parseState(serializeState(state), "fr", 58)).toEqual(state);
  });
  it("reads the lens filter as a list, in lens order, ignoring unknown lenses", () => {
    expect(parseState("?lens=art,history", "fr", 58).lenses).toEqual(["history", "art"]);
    expect(parseLenses("astrology")).toEqual([...LENSES]);
    expect(parseLenses(null)).toEqual([...LENSES]);
    expect(parseLenses("none")).toEqual([]);
  });
  it("writes the lens filter only when some lenses are off", () => {
    const base = parseState("?lang=en", "fr", 58);
    expect(serializeState(base)).toBe("?lang=en");
    expect(serializeState({ ...base, lenses: [] })).toBe("?lang=en&lens=none");
    expect(serializeState({ ...base, lenses: ["art", "latin"] })).toBe("?lang=en&lens=art%2Clatin");
  });
  it("reads the tour and defaults to the full narration", () => {
    expect(parseState("?tour=highlights", "fr", 58).tour).toBe("highlights");
    expect(parseState("?tour=other", "fr", 58).tour).toBe("full");
    expect(serializeState(parseState("?lang=en", "fr", 58))).toBe("?lang=en");
  });
  it("accepts only plain layer ids", () => {
    expect(parseState("?image=bayeux2017", "fr", 58).image).toBe("bayeux2017");
    expect(parseState("?image=../x", "fr", 58).image).toBeNull();
  });
  it("picks French only for French browsers", () => {
    expect(browserLang(["fr-FR", "en"])).toBe("fr");
    expect(browserLang(["en-GB"])).toBe("en");
  });
});
