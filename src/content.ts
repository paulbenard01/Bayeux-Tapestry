import slidesData from "../content/afterlife.yaml";
import highlightsData from "../content/highlights.yaml";
import latinData from "../content/latin.yaml";
import mediaData from "../content/media.yaml";
import milestonesData from "../content/milestones.yaml";
import cuesEn from "../content/narration/cues.en.json";
import cuesFr from "../content/narration/cues.fr.json";
import notesData from "../content/notes.yaml";
import scenesData from "../content/scenes.yaml";
import soundscapeData from "../content/soundscape.yaml";
import sourcesData from "../content/sources.yaml";
import bayeux2017Data from "../layers/bayeux2017.yaml";
import commonsData from "../layers/commons.yaml";
import type { SceneSounds } from "./soundscape";
import type { Cue, Highlight, Lang, LatinGlossary, Layer, MediaItem, Milestone, Note, Scene, Slide, Source } from "./types";

export const scenes = scenesData as Scene[];
export const notes = notesData as Note[];
export const media = mediaData as Record<string, MediaItem>;
export const milestones = milestonesData as Milestone[];
export const slides = slidesData as Slide[];
export const sources = sourcesData as Record<string, Source>;
export const highlights = highlightsData as Highlight[];
export const latin = latinData as LatinGlossary;
export const soundscape = soundscapeData as Record<number, SceneSounds>;
/** Image layers, preferred first. */
export const layers = [bayeux2017Data, commonsData] as Layer[];
export const recordedCues: Record<Lang, Cue[]> = { fr: cuesFr as Cue[], en: cuesEn as Cue[] };

export function sceneByNumber(n: number): Scene {
  const scene = scenes.find((s) => s.n === n);
  if (!scene) throw new Error(`No scene ${n}`);
  return scene;
}
