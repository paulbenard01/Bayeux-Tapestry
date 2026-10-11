import { describe, expect, it } from "vitest";
import { browserLang, parseState, serializeState } from "../src/state";

describe("URL state", () => {
  it("reads language, scene, view and tool", () => {
    expect(parseState("?lang=en&scene=23&view=text", "fr", 58)).toEqual({
      lang: "en",
      scene: 23,
      view: "text",
      tool: "none",
    });
    expect(parseState("?tool=cues", "fr", 58).tool).toBe("cues");
  });
  it("ignores invalid values", () => {
    expect(parseState("?lang=de&scene=99&view=x&tool=y", "fr", 58)).toEqual({
      lang: "fr",
      scene: null,
      view: "strip",
      tool: "none",
    });
    expect(parseState("?scene=2.5", "en", 58).scene).toBeNull();
  });
  it("round-trips", () => {
    const state = { lang: "en" as const, scene: 57, view: "strip" as const, tool: "none" as const };
    expect(parseState(serializeState(state), "fr", 58)).toEqual(state);
  });
  it("picks French only for French browsers", () => {
    expect(browserLang(["fr-FR", "en"])).toBe("fr");
    expect(browserLang(["en-GB"])).toBe("en");
  });
});
