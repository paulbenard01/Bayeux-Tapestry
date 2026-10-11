// Geometry of the strip, in source pixels of the image layer. Pure functions only.
import type { Box, Layer } from "./types";

export function sceneCount(layer: Layer): number {
  return layer.scene_starts.length;
}

/** [start, end) of scene n (1-based) in source pixels. */
export function sceneRange(layer: Layer, n: number): [number, number] {
  const i = n - 1;
  if (i < 0 || i >= layer.scene_starts.length) throw new Error(`No scene ${n}`);
  const end = i + 1 < layer.scene_starts.length ? layer.scene_starts[i + 1] : layer.width;
  return [layer.scene_starts[i], end];
}

/** The scene containing x; clamps to the first and last scene. */
export function sceneAt(layer: Layer, x: number): number {
  const starts = layer.scene_starts;
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= x) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

/** x of a point at fraction `at` (0-1) across scene n. */
export function scenePoint(layer: Layer, n: number, at: number): number {
  const [x0, x1] = sceneRange(layer, n);
  return x0 + clamp(at, 0, 1) * (x1 - x0);
}

export function sceneCentre(layer: Layer, n: number): number {
  return scenePoint(layer, n, 0.5);
}

/** A scene-relative box converted to source pixels. */
export function boxToSource(layer: Layer, n: number, box: Box): Box {
  const [x0, x1] = sceneRange(layer, n);
  const w = x1 - x0;
  return { x: x0 + box.x * w, y: box.y * layer.height, w: box.w * w, h: box.h * layer.height };
}

/** Index of the item whose x is nearest to centre, within halfBand; -1 if none. */
export function nearestWithin(xs: number[], centre: number, halfBand: number): number {
  let best = -1;
  let bestDist = Infinity;
  xs.forEach((x, i) => {
    const d = Math.abs(x - centre);
    if (d <= halfBand && d < bestDist) {
      best = i;
      bestDist = d;
    }
  });
  return best;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}
