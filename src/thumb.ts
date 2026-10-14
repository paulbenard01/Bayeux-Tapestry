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

function loadTile(layer: Layer, level: number, col: number, row: number): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `tiles/${layer.id}/image_files/${level}/${col}_${row}.jpg`;
  });
}

/**
 * A canvas showing the rectangle. A coarse version (a few small tiles, usually cached) appears at once and is
 * replaced by the sharp one when all its tiles have arrived.
 */
export function thumbnail(layer: Layer, rect: Box, targetWidth = Math.min(900, 440 * (window.devicePixelRatio || 1))): HTMLCanvasElement {
  const area = padded(layer, rect, 0.06);
  const fine = tilePlan(layer, area, targetWidth);
  const coarse = tilePlan(layer, area, targetWidth / 4);
  const canvas = h("canvas", { class: "thumb", width: fine.width, height: fine.height });
  const ctx = canvas.getContext("2d");
  if (!ctx) return canvas;
  let sharp = false;
  const k = fine.width / Math.max(1, coarse.width);
  for (const tile of coarse.tiles) {
    void loadTile(layer, coarse.level, tile.col, tile.row)
      .then((img) => {
        if (!sharp) ctx.drawImage(img, tile.x * k, tile.y * k, img.width * k, img.height * k);
      })
      .catch(() => undefined);
  }
  void Promise.all(fine.tiles.map((tile) => loadTile(layer, fine.level, tile.col, tile.row).then((img) => ({ tile, img }))))
    .then((loaded) => {
      sharp = true;
      for (const { tile, img } of loaded) ctx.drawImage(img, tile.x, tile.y);
    })
    .catch(() => undefined);
  return canvas;
}
