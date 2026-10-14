import { describe, expect, it } from "vitest";
import { maxLevel, padded, TILE_SIZE, tilePlan } from "../src/thumb";
import type { Layer } from "../src/types";
import { testLayer } from "./fixtures";

// Like the real bayeux2017 layer: 86,864 x 1,000 units, deep zoom 3,000 px high.
const real: Layer = { ...testLayer, width: 86864, height: 1000, zoom_height: 3000 };

describe("maxLevel", () => {
  it("is the level where the image is at full size", () => {
    // 260,592 px wide at full size: 2^18 = 262,144.
    expect(maxLevel(real)).toBe(18);
  });
});

describe("tilePlan", () => {
  it("picks the smallest level still at least the target width", () => {
    // 1,000 units = 3,000 px at full size; 720 px wanted: two halvings (750 px).
    const plan = tilePlan(real, { x: 10000, y: 200, w: 1000, h: 500 }, 720);
    expect(plan.level).toBe(16);
    expect(plan.width).toBe(750);
    expect(plan.height).toBe(375);
  });
  it("covers the rectangle with tiles placed relative to it", () => {
    const plan = tilePlan(real, { x: 10000, y: 200, w: 1000, h: 500 }, 720);
    // At level 16 the rectangle spans x 7,500-8,250 and y 150-525.
    const cols = [...new Set(plan.tiles.map((t) => t.col))];
    const rows = [...new Set(plan.tiles.map((t) => t.row))];
    expect(cols).toEqual([14, 15, 16]);
    expect(rows).toEqual([0, 1]);
    const first = plan.tiles.find((t) => t.col === 14 && t.row === 0)!;
    expect(first).toEqual({ col: 14, row: 0, x: 14 * TILE_SIZE - 1 - 7500, y: -150 });
  });
  it("stays at full size for a small rectangle", () => {
    expect(tilePlan(real, { x: 0, y: 0, w: 50, h: 50 }, 720).level).toBe(18);
  });
});

describe("padded", () => {
  it("grows the rectangle and keeps it inside the image", () => {
    expect(padded(real, { x: 100, y: 100, w: 100, h: 100 }, 0.1)).toEqual({ x: 90, y: 90, w: 120, h: 120 });
    const edge = padded(real, { x: 0, y: 950, w: 100, h: 50 }, 0.5);
    expect(edge.x).toBe(0);
    expect(edge.y + edge.h).toBe(1000);
  });
});
