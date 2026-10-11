// URL state, so any moment can be shared: ?lang=en&scene=23, ?view=text, ?tool=cues|calibrate.
import type { Lang } from "./types";

export type View = "strip" | "text";
export type Tool = "none" | "cues" | "calibrate";

export interface AppState {
  lang: Lang;
  scene: number | null;
  view: View;
  tool: Tool;
}

export function parseState(search: string, defaultLang: Lang, sceneTotal: number): AppState {
  const p = new URLSearchParams(search);
  const lang = p.get("lang");
  const scene = Number(p.get("scene"));
  const view = p.get("view");
  const tool = p.get("tool");
  return {
    lang: lang === "fr" || lang === "en" ? lang : defaultLang,
    scene: Number.isInteger(scene) && scene >= 1 && scene <= sceneTotal ? scene : null,
    view: view === "text" ? "text" : "strip",
    tool: tool === "cues" || tool === "calibrate" ? tool : "none",
  };
}

export function serializeState(state: AppState): string {
  const p = new URLSearchParams();
  p.set("lang", state.lang);
  if (state.scene !== null) p.set("scene", String(state.scene));
  if (state.view !== "strip") p.set("view", state.view);
  if (state.tool !== "none") p.set("tool", state.tool);
  return `?${p.toString()}`;
}

/** French for French browsers, English otherwise. */
export function browserLang(languages: readonly string[]): Lang {
  return languages.some((l) => l.toLowerCase().startsWith("fr")) ? "fr" : "en";
}
