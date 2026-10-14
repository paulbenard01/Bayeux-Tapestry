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

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Section {
  heading: Bilingual;
  text: Bilingual;
  sources: string[];
}

/** The angles a note can take on the tapestry. */
export const LENSES = ["history", "material", "art", "society", "afterlife"] as const;
export type Lens = (typeof LENSES)[number];

export interface Note {
  id: string;
  lens: Lens;
  scene: number;
  /** Marker position within the scene, 0 = left edge, 1 = right edge (ignored when there is a box). */
  at: number;
  /** Marker height within the embroidery band, 0 = top, 1 = bottom (default 0.08, the upper border). */
  y?: number;
  /** Region the note is about: x/w relative to the scene, y/h relative to the embroidery band. */
  box?: Box;
  title: Bilingual;
  /** Two to four sentences, shown on the card. */
  summary: Bilingual;
  /** Longer reading, shown when the card is opened. */
  sections?: Section[];
  /** Ids in content/media.yaml. */
  media?: string[];
  sources: string[];
  review_status: ReviewStatus;
  lang_review: LangReview;
  check?: string;
}

/** A picture or map clip shown with a note or a slide. */
export interface MediaItem {
  kind: "image" | "video" | "audio";
  /** Path under public/, e.g. media/napoleon.jpg or media/maps/harold-1064.mp4. */
  file: string;
  /** Still frame for a video. */
  poster?: string;
  /** Wikimedia Commons file title (pictures and music fetched by scripts/fetch_media.mjs). */
  commons?: string;
  /** Thumbnail width fetched for a Commons picture. */
  width?: number;
  title: string;
  author: string;
  licence: string;
  /** Where it comes from: the Commons file page, or "Map-clip-render" for our own map clips. */
  source_url: string;
  caption: Bilingual;
}

/** A main event marked under the mini-map. */
export interface Milestone {
  scene: number;
  at?: number;
  label: Bilingual;
}

/** A slide of the afterlife slideshow (?view=afterlife). */
export interface Slide {
  id: string;
  date: string;
  title: Bilingual;
  text: Bilingual;
  media?: string[];
  sources: string[];
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
  /** Height of the deep-zoom image (public/tiles/<id>/image.dzi); coordinates stay in width x height. */
  zoom_height: number;
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
