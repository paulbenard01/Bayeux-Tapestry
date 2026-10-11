import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadContent, reviewReport } from "../scripts/review-report.mjs";
import { hotspots, layers, recordedCues, scenes, sources, stories } from "../src/content";
import { validateCues } from "../src/narration";
import type { Bilingual } from "../src/types";

const filled = (b: Bilingual) => b.fr.trim().length > 0 && b.en.trim().length > 0;
const STATUSES = ["unreviewed", "reviewed"];
const LANG_STATUSES = ["draft", "reviewed"];

describe("scenes", () => {
  it("has the 58 scenes in order", () => {
    expect(scenes.map((s) => s.n)).toEqual(Array.from({ length: 58 }, (_, i) => i + 1));
  });
  it.each(scenes.map((s) => [s.n, s] as const))("scene %i is complete in both languages", (_, s) => {
    expect(s.latin.trim()).not.toBe("");
    expect(filled(s.gloss) && filled(s.title) && filled(s.script)).toBe(true);
    expect(s.sources.length).toBeGreaterThan(0);
    expect(STATUSES).toContain(s.review_status);
    expect(LANG_STATUSES).toContain(s.lang_review);
  });
});

describe("stories and hotspots", () => {
  it("have unique ids, existing scenes and positions within the scene", () => {
    const ids = [...stories, ...hotspots].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const s of stories) {
      expect(s.scene >= 1 && s.scene <= 58, s.id).toBe(true);
      expect(s.at >= 0 && s.at <= 1, s.id).toBe(true);
      expect(filled(s.title) && filled(s.text), s.id).toBe(true);
      expect(STATUSES).toContain(s.review_status);
    }
    for (const h of hotspots) {
      const { x, y, w, h: height } = h.box;
      expect(h.scene >= 1 && h.scene <= 58, h.id).toBe(true);
      expect(x >= 0 && y >= 0 && w > 0 && height > 0 && x + w <= 1 && y + height <= 1, h.id).toBe(true);
      expect(filled(h.title), h.id).toBe(true);
      expect(h.sections.length, h.id).toBeGreaterThan(0);
      for (const s of h.sections) expect(filled(s.heading) && filled(s.text) && s.sources.length > 0, h.id).toBe(true);
    }
  });
});

describe("sources", () => {
  it("every cited key exists", () => {
    const cited = [
      ...scenes.flatMap((s) => s.sources),
      ...stories.flatMap((s) => s.sources),
      ...hotspots.flatMap((h) => h.sections.flatMap((s) => s.sources)),
    ];
    expect(cited.filter((k) => !(k in sources))).toEqual([]);
  });
  it("entries are well formed", () => {
    for (const [key, s] of Object.entries(sources)) {
      expect(["object", "primary", "secondary", "web"], key).toContain(s.kind);
      expect(["checked", "to_check"], key).toContain(s.status);
      expect(s.citation.trim(), key).not.toBe("");
      if (s.url) expect(s.url.startsWith("https://"), key).toBe(true);
    }
  });
});

describe("image layers", () => {
  it.each(layers.map((l) => [l.id, l] as const))("%s has one ascending start per scene, inside the image", (_, layer) => {
    expect(layer.scene_starts).toHaveLength(58);
    layer.scene_starts.forEach((x, i) => {
      expect(x >= 0 && x < layer.width).toBe(true);
      if (i > 0) expect(x).toBeGreaterThan(layer.scene_starts[i - 1]);
    });
    expect(layer.source_url.startsWith("https://upload.wikimedia.org/")).toBe(true);
    expect(layer.credit.author.trim()).not.toBe("");
    expect(0 <= layer.band.top && layer.band.top < layer.band.bottom && layer.band.bottom <= 1).toBe(true);
  });
});

describe("narration cues", () => {
  it.each(["fr", "en"] as const)("%s cues are valid", (lang) => {
    expect(validateCues(recordedCues[lang], 58)).toEqual([]);
  });
});

describe("privacy", () => {
  it("content contains no email address or phone number", () => {
    const files = ["content/scenes.yaml", "content/stories.yaml", "content/hotspots.yaml", "content/sources.yaml"];
    for (const f of files) {
      const text = readFileSync(f, "utf8");
      expect(text, f).not.toMatch(/[\w.+-]+@[\w-]+\.[\w.]+/);
      expect(text, f).not.toMatch(/(\+33|\+44|\b0)[\s.]?[1-9]([\s.]?\d{2}){4}\b/);
    }
  });
});

describe("docs/review.md", () => {
  it("is current (run `npm run review`)", () => {
    expect(readFileSync("docs/review.md", "utf8")).toBe(reviewReport(loadContent(".")));
  });
});
