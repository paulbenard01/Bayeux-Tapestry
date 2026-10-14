import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { scenes, sounds, soundscape } from "../src/content";
import {
  CUES,
  GAITS,
  GAITS_RHYTHM,
  LAYERS,
  layerTargets,
  mixSources,
  MOOD_CHORDS,
  MOOD_TONE,
  MOODS,
  SPACES,
  visibleSources,
} from "../src/soundscape";

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
        if (key === "space") {
          expect(SPACES, `scene ${scene.n}`).toContain(value);
          continue;
        }
        if (key === "cue") {
          expect(CUES, `scene ${scene.n}`).toContain(value);
          continue;
        }
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

describe("the hum's colour", () => {
  it("gives every mood a cutoff and a level, darker for the sad and anxious moods", () => {
    for (const mood of MOODS) {
      expect(MOOD_TONE[mood].cutoff).toBeGreaterThan(500);
      expect(MOOD_TONE[mood].level).toBeGreaterThan(0.5);
      expect(MOOD_TONE[mood].level).toBeLessThanOrEqual(1);
    }
    expect(MOOD_TONE.elegy.cutoff).toBeLessThan(MOOD_TONE.calm.cutoff);
    expect(MOOD_TONE.omen.cutoff).toBeLessThan(MOOD_TONE.journey.cutoff);
  });
});

describe("generated effects", () => {
  const ids = ["snort1", "snort2", "snort3", "neigh1", "neigh2", "hawk1", "hawk2", "cowhorn", "handbells", "shimmer1", "shimmer2",
    "bark1", "bark2", "bark3", "creak1", "creak2", "creak3", "feast", "melee"];
  it.each(ids)("%s is built (scripts/make_sfx.mjs)", (id) => {
    expect(existsSync(`public/audio/sfx/${id}.mp3`)).toBe(true);
  });
});

describe("sounds placed in the view", () => {
  const centres = [100, 300, 500, 700, 900];
  it("keeps the scenes in view, full in the middle, fainter and to the side at the edges", () => {
    const sources = visibleSources(centres, 500, 250);
    expect(sources.map((s) => s.scene)).toEqual([2, 3, 4]);
    const [left, middle, right] = sources;
    expect(middle).toEqual({ scene: 3, pan: 0, presence: 1 });
    expect(left.pan).toBeLessThan(0);
    expect(right.pan).toBeGreaterThan(0);
    expect(left.presence).toBeLessThan(1);
  });
  it("mixes layers from the scenes in view: the loudest sets the weight, the pan leans towards it", () => {
    const sources = visibleSources(centres, 500, 250);
    const mix = mixSources(sources, { 3: { mood: "calm" }, 4: { mood: "calm", horses: 0.8 } });
    expect(mix.horses.weight).toBeCloseTo(0.8 * sources[2].presence);
    expect(mix.horses.pan).toBeGreaterThan(0);
    expect(mix.sea.weight).toBe(0);
  });
});
