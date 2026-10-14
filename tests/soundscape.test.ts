import { describe, expect, it } from "vitest";
import { scenes, soundscape } from "../src/content";
import { LAYERS, layerTargets } from "../src/soundscape";

describe("layerTargets", () => {
  it("silences layers a scene does not list and clamps weights", () => {
    const t = layerTargets({ sea: 0.8, battle: 3 });
    expect(t.sea).toBe(0.8);
    expect(t.battle).toBe(1);
    expect(t.horses).toBe(0);
    expect(Object.keys(layerTargets(undefined))).toEqual([...LAYERS]);
  });
});

describe("content/soundscape.yaml", () => {
  it("gives every scene some sound, with known layers and weights from 0 to 1", () => {
    for (const scene of scenes) {
      const sounds = soundscape[scene.n];
      expect(sounds, `scene ${scene.n}`).toBeTruthy();
      expect(Object.keys(sounds).length, `scene ${scene.n}`).toBeGreaterThan(0);
      for (const [layer, weight] of Object.entries(sounds)) {
        expect(LAYERS, `scene ${scene.n}`).toContain(layer);
        expect(weight! >= 0 && weight! <= 1, `scene ${scene.n} ${layer}`).toBe(true);
      }
    }
  });
});
