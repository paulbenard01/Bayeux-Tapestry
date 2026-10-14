// Narration timing: where the strip should be at time t. Pure functions only.
import { clamp, sceneAt, sceneCentre, scenePoint, sceneRange } from "./layout";
import type { Cue, Highlight, Lang, Layer, Scene } from "./types";

/** Reading speed for the text-only autoplay, in words per second (about 150 words a minute). */
export const WORDS_PER_SECOND = 2.5;
/** Shortest time spent on a scene in the text-only autoplay. */
export const MIN_SCENE_SECONDS = 6;

export function cueX(layer: Layer, cue: Cue): number {
  return cue.x ?? sceneCentre(layer, cue.scene);
}

/** Index of the last cue at or before t; -1 before the first cue. */
export function cueIndexAt(cues: Cue[], t: number): number {
  let idx = -1;
  for (let i = 0; i < cues.length; i++) {
    if (cues[i].t <= t) idx = i;
    else break;
  }
  return idx;
}

/** Share of each recorded scene spent still on the scene before gliding on to the next one. */
export const NARRATION_HOLD = 0.4;

/**
 * Strip position (source x at the viewport centre) at time t.
 * Moves from each cue's target to the next one's, so the scroll never jumps. With `hold` (a share of each
 * interval), the strip first rests on the cue's target, then eases to the next one.
 */
export function positionAt(layer: Layer, cues: Cue[], t: number, hold = 0): number {
  if (cues.length === 0) return 0;
  const i = cueIndexAt(cues, t);
  if (i < 0) return cueX(layer, cues[0]);
  if (i === cues.length - 1) return cueX(layer, cues[i]);
  const a = cues[i];
  const b = cues[i + 1];
  const start = a.t + hold * (b.t - a.t);
  let f = b.t > start ? clamp((t - start) / (b.t - start), 0, 1) : 1;
  if (hold > 0) f = f * f * (3 - 2 * f);
  return cueX(layer, a) + f * (cueX(layer, b) - cueX(layer, a));
}

/**
 * The scene the reader is looking at with the view centred on `centre` (`half` is half the visible width):
 * the scene in the middle of the view, or the first (last) one when the view reaches the start (end) of the
 * embroidery, where the middle of the view can never reach the first (last) scene.
 */
export function startScene(layer: Layer, centre: number, half: number): number {
  const last = layer.scene_starts.length;
  if (centre - half <= sceneRange(layer, 1)[0] + half * 0.05) return 1;
  if (centre + half >= sceneRange(layer, last)[1] - half * 0.05) return last;
  return sceneAt(layer, centre);
}

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Seconds needed to read a scene's script aloud at WORDS_PER_SECOND. */
export function readingSeconds(text: string): number {
  return Math.max(MIN_SCENE_SECONDS, wordCount(text) / WORDS_PER_SECOND);
}

/**
 * Cues for the text-only autoplay: each scene starts at its left edge and is read for as long as its
 * script takes, so the strip crosses the scene while its caption is shown. A final cue reaches the end.
 */
export function autoCues(layer: Layer, scenes: Scene[], lang: Lang): { cues: Cue[]; duration: number } {
  const cues: Cue[] = [];
  let t = 0;
  for (const scene of scenes) {
    const [x0] = sceneRange(layer, scene.n);
    cues.push({ t, scene: scene.n, x: x0 });
    t += readingSeconds(scene.script[lang]);
  }
  const last = scenes[scenes.length - 1];
  if (last) cues.push({ t, scene: last.n, x: sceneRange(layer, last.n)[1] });
  return { cues, duration: t };
}

/** Seconds the highlights tour takes to glide from one stop to the next. */
export const TRAVEL_SECONDS = 4;

/**
 * Cues for the highlights tour: the strip holds still on each stop while its text is read, then glides
 * to the next stop. Each stop has two cues at the same x (arrive, leave), so positionAt holds between them.
 */
export function highlightCues(layer: Layer, stops: Highlight[], lang: Lang): { cues: Cue[]; duration: number } {
  const cues: Cue[] = [];
  let t = 0;
  stops.forEach((stop, i) => {
    if (i > 0) t += TRAVEL_SECONDS;
    const x = scenePoint(layer, stop.scene, stop.at);
    cues.push({ t, scene: stop.scene, x, stop: i });
    t += readingSeconds(stop.text[lang]);
    cues.push({ t, scene: stop.scene, x, stop: i });
  });
  return { cues, duration: t };
}

/** Time at which the tour arrives at a stop; 0 if there is no such stop. */
export function timeForStop(cues: Cue[], stop: number): number {
  return cues.find((c) => c.stop === stop)?.t ?? 0;
}

/** Problems with a recorded cue list, as messages; empty when valid. */
export function validateCues(cues: Cue[], sceneTotal: number): string[] {
  const errors: string[] = [];
  cues.forEach((c, i) => {
    if (!(c.t >= 0)) errors.push(`cue ${i}: t must be >= 0`);
    if (!Number.isInteger(c.scene) || c.scene < 1 || c.scene > sceneTotal) errors.push(`cue ${i}: no scene ${c.scene}`);
    if (i > 0 && c.t <= cues[i - 1].t) errors.push(`cue ${i}: t must increase`);
  });
  return errors;
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

/** Time of the first cue for a scene, or of the last cue before it; 0 if none. */
export function timeForScene(cues: Cue[], scene: number): number {
  let t = 0;
  for (const cue of cues) {
    if (cue.scene > scene) break;
    t = cue.t;
    if (cue.scene === scene) break;
  }
  return t;
}
