// A small picture of what a note is about, assembled from the deep-zoom tiles the viewer already uses.
import { h } from "./dom";
import type { Box, Layer } from "./types";

/** Tile size and overlap of the deep-zoom images written by scripts/make_tiles.py. */
export const TILE_SIZE = 510;
export const TILE_OVERLAP = 1;

export interface TilePlan {
  level: number;
  /** Size of the picture, in pixels of that level. */
  width: number;
  height: number;
  /** Each tile to draw, with where its top-left corner goes in the picture. */
  tiles: { col: number; row: number; x: number; y: number }[];
}

/** Deep-zoom level count - 1: the level where the image is at full size. */
export function maxLevel(layer: Layer): number {
  const scale = layer.zoom_height / layer.height;
  return Math.ceil(Math.log2(Math.max(layer.width * scale, layer.zoom_height)));
}

/**
 * Which tiles to draw for a rectangle (layer units), at the smallest level that is still at least
 * `targetWidth` pixels wide for it, and where each tile goes.
 */
export function tilePlan(layer: Layer, rect: Box, targetWidth: number): TilePlan {
  const top = maxLevel(layer);
  const full = layer.zoom_height / layer.height; // full-size pixels per layer unit
  const widthAtFull = rect.w * full;
  const steps = Math.max(0, Math.floor(Math.log2(widthAtFull / targetWidth)));
  const level = top - steps;
  const s = full / 2 ** steps; // level pixels per layer unit
  const levelWidth = Math.ceil((layer.width * full) / 2 ** steps);
  const levelHeight = Math.ceil(layer.zoom_height / 2 ** steps);
  const x0 = Math.max(0, Math.floor(rect.x * s));
  const y0 = Math.max(0, Math.floor(rect.y * s));
  const x1 = Math.min(levelWidth, Math.ceil((rect.x + rect.w) * s));
  const y1 = Math.min(levelHeight, Math.ceil((rect.y + rect.h) * s));
  const tiles: TilePlan["tiles"] = [];
  for (let col = Math.floor(x0 / TILE_SIZE); col <= Math.floor((x1 - 1) / TILE_SIZE); col++) {
    for (let row = Math.floor(y0 / TILE_SIZE); row <= Math.floor((y1 - 1) / TILE_SIZE); row++) {
      // A tile's image starts one overlap pixel before its grid cell, except in the first row or column.
      const x = col * TILE_SIZE - (col > 0 ? TILE_OVERLAP : 0) - x0;
      const y = row * TILE_SIZE - (row > 0 ? TILE_OVERLAP : 0) - y0;
      tiles.push({ col, row, x, y });
    }
  }
  return { level, width: x1 - x0, height: y1 - y0, tiles };
}

/** A rectangle grown by a margin (a fraction of its size) on every side, kept inside the image. */
export function padded(layer: Layer, rect: Box, margin: number): Box {
  const x = Math.max(0, rect.x - rect.w * margin);
  const y = Math.max(0, rect.y - rect.h * margin);
  const right = Math.min(layer.width, rect.x + rect.w * (1 + margin));
  const bottom = Math.min(layer.height, rect.y + rect.h * (1 + margin));
  return { x, y, w: right - x, h: bottom - y };
}

/** A canvas showing the rectangle; tiles are drawn as they arrive (the browser usually has them cached). */
export function thumbnail(layer: Layer, rect: Box, targetWidth = 720): HTMLCanvasElement {
  const plan = tilePlan(layer, padded(layer, rect, 0.06), targetWidth);
  const canvas = h("canvas", { class: "thumb", width: plan.width, height: plan.height });
  const ctx = canvas.getContext("2d");
  for (const tile of plan.tiles) {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => ctx?.drawImage(img, tile.x, tile.y);
    img.src = `tiles/${layer.id}/image_files/${plan.level}/${tile.col}_${tile.row}.jpg`;
  }
  return canvas;
}
