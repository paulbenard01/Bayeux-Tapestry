// URL state, so any moment can be shared: ?lang=en&scene=23, ?view=text|afterlife, ?tool=cues|calibrate,
// ?image=<layer>, ?lens=<lens>.
import { LENSES, type Lang, type Lens } from "./types";

export type View = "strip" | "text" | "afterlife";
export type Tool = "none" | "cues" | "calibrate";

export interface AppState {
  lang: Lang;
  scene: number | null;
  view: View;
  tool: Tool;
  /** Image layer id; null for the default. */
  image: string | null;
  /** Notes filter; null for all lenses. */
  lens: Lens | null;
}

export function parseState(search: string, defaultLang: Lang, sceneTotal: number): AppState {
  const p = new URLSearchParams(search);
  const lang = p.get("lang");
  const scene = Number(p.get("scene"));
  const view = p.get("view");
  const tool = p.get("tool");
  const image = p.get("image");
  const lens = p.get("lens");
  return {
    lang: lang === "fr" || lang === "en" ? lang : defaultLang,
    scene: Number.isInteger(scene) && scene >= 1 && scene <= sceneTotal ? scene : null,
    view: view === "text" || view === "afterlife" ? view : "strip",
    tool: tool === "cues" || tool === "calibrate" ? tool : "none",
    image: image && /^[a-z0-9-]+$/.test(image) ? image : null,
    lens: LENSES.includes(lens as Lens) ? (lens as Lens) : null,
  };
}

export function serializeState(state: AppState): string {
  const p = new URLSearchParams();
  p.set("lang", state.lang);
  if (state.scene !== null) p.set("scene", String(state.scene));
  if (state.view !== "strip") p.set("view", state.view);
  if (state.tool !== "none") p.set("tool", state.tool);
  if (state.image) p.set("image", state.image);
  if (state.lens) p.set("lens", state.lens);
  return `?${p.toString()}`;
}

/** French for French browsers, English otherwise. */
export function browserLang(languages: readonly string[]): Lang {
  return languages.some((l) => l.toLowerCase().startsWith("fr")) ? "fr" : "en";
}
