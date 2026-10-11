import hotspotsData from "../content/hotspots.yaml";
import cuesEn from "../content/narration/cues.en.json";
import cuesFr from "../content/narration/cues.fr.json";
import scenesData from "../content/scenes.yaml";
import sourcesData from "../content/sources.yaml";
import storiesData from "../content/stories.yaml";
import layerData from "../layers/commons.yaml";
import type { Cue, Hotspot, Lang, Layer, Scene, Source, Story } from "./types";

export const scenes = scenesData as Scene[];
export const stories = storiesData as Story[];
export const hotspots = hotspotsData as Hotspot[];
export const sources = sourcesData as Record<string, Source>;
export const layer = layerData as Layer;
export const recordedCues: Record<Lang, Cue[]> = { fr: cuesFr as Cue[], en: cuesEn as Cue[] };

export function sceneByNumber(n: number): Scene {
  const scene = scenes.find((s) => s.n === n);
  if (!scene) throw new Error(`No scene ${n}`);
  return scene;
}
