export type Lang = "fr" | "en";
export type Bilingual = Record<Lang, string>;
export type ReviewStatus = "unreviewed" | "reviewed";
export type LangReview = "draft" | "reviewed";

export interface Scene {
  n: number;
  latin: string;
  gloss: Bilingual;
  title: Bilingual;
  place?: string;
  script: Bilingual;
  sources: string[];
  review_status: ReviewStatus;
  lang_review: LangReview;
  check?: string;
}

export interface Story {
  id: string;
  scene: number;
  /** Position within the scene, 0 = left edge, 1 = right edge. */
  at: number;
  title: Bilingual;
  text: Bilingual;
  sources: string[];
  review_status: ReviewStatus;
  lang_review: LangReview;
  check?: string;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface HotspotSection {
  heading: Bilingual;
  text: Bilingual;
  sources: string[];
}

export interface Hotspot {
  id: string;
  scene: number;
  /** Scene-relative box: x/w in 0-1 of the scene width, y/h in 0-1 of the image height. */
  box: Box;
  title: Bilingual;
  sections: HotspotSection[];
  review_status: ReviewStatus;
  lang_review: LangReview;
  check?: string;
}

export interface Source {
  kind: "object" | "primary" | "secondary" | "web";
  citation: string;
  url?: string;
  status: "checked" | "to_check";
  note?: string;
}

export interface Layer {
  id: string;
  credit: { title: string; file_page: string; author: string; licence: string };
  source_url: string;
  width: number;
  height: number;
  tile_width: number;
  /** Top and bottom of the embroidery as fractions of the image height; boxes are placed within it. */
  band: { top: number; bottom: number };
  available: boolean;
  calibrated: boolean;
  /** Left edge of each scene, in source pixels, ascending; index 0 is scene 1. */
  scene_starts: number[];
}

/** A narration cue: at audio time t (seconds) the given scene (or exact x) is centred. */
export interface Cue {
  t: number;
  scene: number;
  x?: number;
}
