import { describe, expect, it } from "vitest";
import {
  autoCues,
  cueIndexAt,
  formatTime,
  highlightCues,
  MIN_SCENE_SECONDS,
  positionAt,
  readingSeconds,
  startScene,
  timeForScene,
  timeForStop,
  TRAVEL_SECONDS,
  validateCues,
} from "../src/narration";
import type { Cue, Highlight, Scene } from "../src/types";
import { testLayer } from "./fixtures";

const cues: Cue[] = [
  { t: 0, scene: 1 },
  { t: 10, scene: 2 },
  { t: 30, scene: 4, x: 900 },
];

describe("positionAt", () => {
  it("holds the first target before the first cue and the last after the last", () => {
    expect(positionAt(testLayer, cues, -5)).toBe(50);
    expect(positionAt(testLayer, cues, 99)).toBe(900);
  });
  it("glides linearly between cues (scene centres unless x is given)", () => {
    expect(positionAt(testLayer, cues, 0)).toBe(50);
    expect(positionAt(testLayer, cues, 5)).toBe(150);
    expect(positionAt(testLayer, cues, 10)).toBe(250);
    expect(positionAt(testLayer, cues, 20)).toBe(575);
  });
  it("copes with no cues", () => {
    expect(positionAt(testLayer, [], 3)).toBe(0);
  });
});

describe("cue lookup", () => {
  it("finds the last cue at or before t", () => {
    expect(cueIndexAt(cues, -1)).toBe(-1);
    expect(cueIndexAt(cues, 10)).toBe(1);
    expect(cueIndexAt(cues, 29.9)).toBe(1);
  });
  it("finds when a scene starts, falling back to the scene before", () => {
    expect(timeForScene(cues, 2)).toBe(10);
    expect(timeForScene(cues, 3)).toBe(10);
    expect(timeForScene(cues, 4)).toBe(30);
  });
});

describe("text-only autoplay", () => {
  const scene = (n: number, words: number): Scene => ({
    n,
    latin: "",
    gloss: { fr: "", en: "" },
    title: { fr: "", en: "" },
    script: { fr: Array(words).fill("mot").join(" "), en: "word" },
    sources: [],
    review_status: "unreviewed",
    lang_review: "draft",
  });

  it("reads at 2.5 words a second with a minimum per scene", () => {
    expect(readingSeconds("one two")).toBe(MIN_SCENE_SECONDS);
    expect(readingSeconds(Array(50).fill("w").join(" "))).toBe(20);
  });
  it("starts each scene at its left edge and ends at the end of the strip", () => {
    const { cues: auto, duration } = autoCues(testLayer, [scene(1, 50), scene(2, 5), scene(3, 25), scene(4, 30)], "fr");
    expect(auto.map((c) => c.t)).toEqual([0, 20, 26, 36, 48]);
    expect(auto.map((c) => c.x)).toEqual([0, 100, 400, 700, 1000]);
    expect(duration).toBe(48);
  });
});

describe("validateCues", () => {
  it("accepts increasing cues on existing scenes", () => {
    expect(validateCues(cues, 4)).toEqual([]);
  });
  it("rejects times that do not increase and unknown scenes", () => {
    expect(validateCues([{ t: 5, scene: 1 }, { t: 5, scene: 9 }], 4)).toHaveLength(2);
  });
});

describe("formatTime", () => {
  it("formats minutes and seconds", () => {
    expect(formatTime(0)).toBe("0:00");
    expect(formatTime(75.8)).toBe("1:15");
  });
});

describe("highlights tour", () => {
  const stop = (scene: number, at: number, words: number): Highlight => ({
    id: `s${scene}`,
    scene,
    at,
    title: { fr: "t", en: "t" },
    text: { fr: "mot ".repeat(words), en: "word ".repeat(words) },
    sources: ["tituli"],
    review_status: "unreviewed",
    lang_review: "draft",
  });
  // 25 words = 10 s at 2.5 words/s; 5 words = MIN_SCENE_SECONDS.
  const stops = [stop(2, 0.5, 25), stop(4, 0, 5)];
  const { cues, duration } = highlightCues(testLayer, stops, "en");

  it("arrives at and leaves each stop at the same x", () => {
    expect(cues).toEqual([
      { t: 0, scene: 2, x: 250, stop: 0 },
      { t: 10, scene: 2, x: 250, stop: 0 },
      { t: 10 + TRAVEL_SECONDS, scene: 4, x: 700, stop: 1 },
      { t: 10 + TRAVEL_SECONDS + MIN_SCENE_SECONDS, scene: 4, x: 700, stop: 1 },
    ]);
    expect(duration).toBe(10 + TRAVEL_SECONDS + MIN_SCENE_SECONDS);
  });
  it("holds still while reading, then glides to the next stop", () => {
    expect(positionAt(testLayer, cues, 5)).toBe(250);
    expect(positionAt(testLayer, cues, 10 + TRAVEL_SECONDS / 2)).toBe(475);
  });
  it("finds when the tour reaches a stop", () => {
    expect(timeForStop(cues, 1)).toBe(10 + TRAVEL_SECONDS);
    expect(timeForStop(cues, 9)).toBe(0);
  });
});

describe("narration with a hold", () => {
  it("rests on each scene first, then eases to the next", () => {
    expect(positionAt(testLayer, cues, 0, 0.4)).toBe(50);
    expect(positionAt(testLayer, cues, 4, 0.4)).toBe(50);
    expect(positionAt(testLayer, cues, 7, 0.4)).toBe(150);
    expect(positionAt(testLayer, cues, 10, 0.4)).toBe(250);
  });
});

describe("startScene", () => {
  it("starts from the first scene while the view still shows the start", () => {
    expect(startScene(testLayer, 150, 150)).toBe(1);
  });
  it("ends on the last scene when the view reaches the end", () => {
    expect(startScene(testLayer, 850, 150)).toBe(4);
  });
  it("starts from the scene in the middle of the view otherwise", () => {
    expect(startScene(testLayer, 500, 150)).toBe(3);
  });
});
