import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scenes, sounds, soundscape } from "../src/content";
import { GAITS, GAITS_RHYTHM, LAYERS, layerTargets, MOOD_CHORDS, MOODS } from "../src/soundscape";

describe("layerTargets", () => {
  it("silences layers a scene does not list and clamps weights", () => {
    const t = layerTargets({ mood: "sea", sea: 0.8, battle: 3 });
    expect(t.sea).toBe(0.8);
    expect(t.battle).toBe(1);
    expect(t.horses).toBe(0);
    expect(Object.keys(layerTargets(undefined))).toEqual([...LAYERS]);
  });
});

describe("the hum", () => {
  it("has chords for every mood, kept light (no note below D3 except in battle)", () => {
    for (const mood of MOODS) {
      expect(MOOD_CHORDS[mood].length, mood).toBeGreaterThan(1);
      for (const chord of MOOD_CHORDS[mood]) {
        expect(Math.min(...chord), mood).toBeGreaterThanOrEqual(mood === "battle" ? 45 : 53);
        expect(Math.max(...chord), mood).toBeLessThanOrEqual(86);
      }
    }
  });
});

describe("gaits", () => {
  it("are distinct rhythms whose beats fit in a stride", () => {
    const strides = GAITS.map((g) => GAITS_RHYTHM[g].stride);
    expect(new Set(strides).size).toBe(GAITS.length);
    for (const g of GAITS) for (const [offset] of GAITS_RHYTHM[g].beats) expect(offset).toBeLessThan(GAITS_RHYTHM[g].stride);
  });
});

describe("content/soundscape.yaml", () => {
  it("gives every scene a mood, known layers with weights from 0 to 1, and a gait where horses are heard", () => {
    for (const scene of scenes) {
      const s = soundscape[scene.n];
      expect(MOODS, `scene ${scene.n}`).toContain(s?.mood);
      for (const [key, value] of Object.entries(s)) {
        if (key === "mood" || key === "gait") continue;
        expect(LAYERS, `scene ${scene.n}`).toContain(key);
        expect(Number(value) >= 0 && Number(value) <= 1, `scene ${scene.n} ${key}`).toBe(true);
      }
      if (s.horses) expect(GAITS, `scene ${scene.n}`).toContain(s.gait);
    }
  });
});

describe("content/sounds.yaml", () => {
  it("lists free recordings with their author and page, and each file is built", () => {
    for (const [id, s] of Object.entries(sounds)) {
      expect(["CC0", "Public domain"], id).toContain(s.licence);
      expect(s.author.trim() && s.title.trim(), id).toBeTruthy();
      expect(s.page.startsWith("https://"), id).toBe(true);
      expect(existsSync(`public/audio/sfx/${id}.mp3`), id).toBe(true);
    }
  });
});

describe("generated horse calls", () => {
  it.each(["snort1", "snort2", "snort3", "neigh1", "neigh2"])("%s is built (scripts/make_sfx.mjs)", (id) => {
    expect(existsSync(`public/audio/sfx/${id}.mp3`)).toBe(true);
  });
});
