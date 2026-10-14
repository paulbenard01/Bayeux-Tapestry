import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { loadContent, reviewReport } from "../scripts/review-report.mjs";
import { layers, media, milestones, notes, recordedCues, scenes, slides, sources } from "../src/content";
import { validateCues } from "../src/narration";
import { LENSES, type Bilingual } from "../src/types";

const filled = (b: Bilingual) => b.fr.trim().length > 0 && b.en.trim().length > 0;
const STATUSES = ["unreviewed", "reviewed"];
const LANG_STATUSES = ["draft", "reviewed"];

/** Every object with an fr or en key must have exactly fr and en (a comma in YAML flow style splits it). */
function brokenBilinguals(value: unknown, path: string, out: string[] = []): string[] {
  if (value && typeof value === "object") {
    const keys = Object.keys(value);
    if (!Array.isArray(value) && (keys.includes("fr") || keys.includes("en"))) {
      if (keys.length !== 2 || !keys.includes("fr") || !keys.includes("en")) out.push(`${path}: ${keys.join(", ")}`);
    }
    for (const [k, v] of Object.entries(value)) brokenBilinguals(v, `${path}.${k}`, out);
  }
  return out;
}

describe("bilingual fields", () => {
  it("have exactly fr and en everywhere (quote values with commas in flow style)", () => {
    const all = { scenes, notes, media, milestones, slides };
    expect(brokenBilinguals(all, "content")).toEqual([]);
  });
});

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

describe("notes", () => {
  it("have unique ids and a known lens", () => {
    const ids = notes.map((n) => n.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const n of notes) expect(LENSES, n.id).toContain(n.lens);
  });
  it("cover every lens", () => {
    for (const lens of LENSES) expect(notes.filter((n) => n.lens === lens).length, lens).toBeGreaterThan(0);
  });
  it.each(notes.map((n) => [n.id, n] as const))("%s is complete and placed inside its scene", (_, n) => {
    expect(n.scene >= 1 && n.scene <= 58).toBe(true);
    expect(n.at >= 0 && n.at <= 1).toBe(true);
    if (n.y !== undefined) expect(n.y >= 0 && n.y <= 1).toBe(true);
    if (n.box) {
      const { x, y, w, h } = n.box;
      expect(x >= 0 && y >= 0 && w > 0 && h > 0 && x + w <= 1 && y + h <= 1).toBe(true);
    }
    expect(filled(n.title) && filled(n.summary)).toBe(true);
    expect(n.sources.length).toBeGreaterThan(0);
    for (const s of n.sections ?? []) expect(filled(s.heading) && filled(s.text) && s.sources.length > 0).toBe(true);
    expect(STATUSES).toContain(n.review_status);
    expect(LANG_STATUSES).toContain(n.lang_review);
  });
});

describe("slides and milestones", () => {
  it("slides are complete, with unique ids", () => {
    expect(new Set(slides.map((s) => s.id)).size).toBe(slides.length);
    for (const s of slides) {
      expect(s.date.trim(), s.id).not.toBe("");
      expect(filled(s.title) && filled(s.text), s.id).toBe(true);
      expect(s.sources.length, s.id).toBeGreaterThan(0);
    }
  });
  it("milestones point at scenes, in order", () => {
    milestones.forEach((m, i) => {
      expect(m.scene >= 1 && m.scene <= 58).toBe(true);
      expect(filled(m.label)).toBe(true);
      if (i > 0) expect(m.scene).toBeGreaterThan(milestones[i - 1].scene);
    });
  });
});

describe("sources", () => {
  it("every cited key exists", () => {
    const cited = [
      ...scenes.flatMap((s) => s.sources),
      ...notes.flatMap((n) => [...n.sources, ...(n.sections ?? []).flatMap((s) => s.sources)]),
      ...slides.flatMap((s) => s.sources),
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

describe("media", () => {
  it("every referenced media exists and carries a credit and licence", () => {
    const used = [...notes, ...slides].flatMap((x) => x.media ?? []);
    expect(used.filter((id) => !(id in media))).toEqual([]);
    for (const [id, m] of Object.entries(media)) {
      expect(["image", "video", "audio"], id).toContain(m.kind);
      expect(m.author.trim() && m.licence.trim() && m.title.trim(), id).toBeTruthy();
      expect(m.source_url.startsWith("https://"), id).toBe(true);
      if (m.kind !== "video") expect(m.commons?.startsWith("File:"), id).toBe(true);
    }
  });
  it("only uses free licences", () => {
    for (const [id, m] of Object.entries(media)) {
      expect(m.licence, id).toMatch(/^(Public domain|CC0|CC BY( |-SA )\d\.\d)$/);
    }
  });
  it("map clips and their posters are rendered in both languages", () => {
    for (const [id, m] of Object.entries(media).filter(([, m]) => m.kind === "video")) {
      for (const lang of ["fr", "en"]) {
        expect(existsSync(`public/${m.file.replace("{lang}", lang)}`), `${id} ${lang}`).toBe(true);
        if (m.poster) expect(existsSync(`public/${m.poster.replace("{lang}", lang)}`), `${id} poster ${lang}`).toBe(true);
      }
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
    expect(layer.zoom_height).toBeGreaterThan(0);
  });
});

describe("narration cues", () => {
  it.each(["fr", "en"] as const)("%s cues are valid", (lang) => {
    expect(validateCues(recordedCues[lang], 58)).toEqual([]);
  });
});

describe("privacy", () => {
  it("content contains no email address or phone number", () => {
    const files = ["scenes", "notes", "sources", "media", "afterlife", "milestones"].map((f) => `content/${f}.yaml`);
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
