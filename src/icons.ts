// Small line icons (24 x 24, drawn in currentColor) for the menus, so the bars need no words.
import { h } from "./dom";

const PATHS = {
  // A page of text: the text version.
  text: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/>',
  // The embroidery: a long strip with a figure, to go back to it from other views.
  strip: '<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M6 15l3-4 3 3 2-2 4 3"/>',
  // An hourglass: what happened after 1066.
  after: '<path d="M7 3h10M7 21h10M8 3c0 5 8 6 8 9s-8 4-8 9M16 3c0 5-8 6-8 9s8 4 8 9"/>',
  // Information: about, sources and credits.
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  // A note: the ambient sound.
  sound: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
  pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/>',
  prev: '<path d="M15 5l-7 7 7 7"/>',
  next: '<path d="M9 5l7 7-7 7"/>',
} as const;

export type IconName = keyof typeof PATHS;

export function iconSvg(name: IconName): string {
  return `<svg class="icon" viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${PATHS[name]}</svg>`;
}

export function icon(name: IconName): HTMLSpanElement {
  const span = h("span", { class: "icon-wrap" });
  span.innerHTML = iconSvg(name);
  return span;
}
