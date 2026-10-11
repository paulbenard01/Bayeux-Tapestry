import { describe, expect, it } from "vitest";
import { boxToSource, nearestWithin, sceneAt, sceneCentre, sceneRange, scenePoint } from "../src/layout";
import { testLayer } from "./fixtures";

describe("sceneRange", () => {
  it("ends where the next scene starts, and the last at the image width", () => {
    expect(sceneRange(testLayer, 1)).toEqual([0, 100]);
    expect(sceneRange(testLayer, 4)).toEqual([700, 1000]);
  });
  it("rejects scenes that do not exist", () => {
    expect(() => sceneRange(testLayer, 0)).toThrow();
    expect(() => sceneRange(testLayer, 5)).toThrow();
  });
});

describe("sceneAt", () => {
  it("finds the scene containing x, with edges belonging to the scene they start", () => {
    expect(sceneAt(testLayer, 0)).toBe(1);
    expect(sceneAt(testLayer, 99.9)).toBe(1);
    expect(sceneAt(testLayer, 100)).toBe(2);
    expect(sceneAt(testLayer, 650)).toBe(3);
  });
  it("clamps outside the strip", () => {
    expect(sceneAt(testLayer, -50)).toBe(1);
    expect(sceneAt(testLayer, 5000)).toBe(4);
  });
});

describe("scene points and boxes", () => {
  it("places points relative to the scene", () => {
    expect(scenePoint(testLayer, 2, 0)).toBe(100);
    expect(scenePoint(testLayer, 2, 1)).toBe(400);
    expect(sceneCentre(testLayer, 2)).toBe(250);
    expect(scenePoint(testLayer, 2, 2)).toBe(400);
  });
  it("converts scene-relative boxes to source pixels", () => {
    expect(boxToSource(testLayer, 3, { x: 0.5, y: 0.1, w: 0.25, h: 0.5 })).toEqual({ x: 550, y: 10, w: 75, h: 50 });
  });
});

describe("nearestWithin", () => {
  it("returns the nearest item inside the band", () => {
    expect(nearestWithin([100, 300, 520], 500, 50)).toBe(2);
    expect(nearestWithin([100, 300, 520], 200, 120)).toBe(0);
  });
  it("returns -1 when nothing is close enough", () => {
    expect(nearestWithin([100, 300], 700, 50)).toBe(-1);
    expect(nearestWithin([], 0, 50)).toBe(-1);
  });
});
