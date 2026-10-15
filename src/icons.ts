// Small line icons (24 x 24, drawn in currentColor) for the menus, so the bars need no words.
import { h } from "./dom";

const PATHS = {
  // A page of text: the text version.
  text: '<path d="M6 3h9l3 3v15H6z"/><path d="M9 10h6M9 14h6M9 18h4"/>',
  // The embroidery: a long strip with a figure, to go back to it from other views.
  strip: '<rect x="2" y="7" width="20" height="10" rx="1"/><path d="M6 15l3-4 3 3 2-2 4 3"/>',
  // A clock whose hand runs on, with an arrow: what happened after 1066.
  after: '<path d="M20 12a8 8 0 1 1-2.3-5.7"/><path d="M20 4v4h-4"/><path d="M12 8v4l3 2"/>',
  // Information: about, sources and credits.
  about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5"/>',
  // A note: the ambient sound.
  sound: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  speak: '<path d="M4 9h4l5-4v14l-5-4H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',
  play: '<path d="M8 5l11 7-11 7z" fill="currentColor"/>',
  pause: '<path d="M7 5h3v14H7zM14 5h3v14h-3z" fill="currentColor"/>',
  // A magnifying glass: every point of interest in one list.
  search: '<circle cx="10.5" cy="10.5" r="6.5"/><path d="M15.5 15.5L21 21"/>',
  // A picture and a map, beside a note's title when it has one.
  image: '<rect x="3" y="5" width="18" height="14" rx="1"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  map: '<path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z"/><path d="M9 4v14M15 6v14"/>',
  // LinkedIn, as its letters: a link to the author's profile.
  linkedin: '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M8 10.5V17M8 7.3v.2M11.5 17v-6.5M11.5 13c0-1.6 1.1-2.7 2.5-2.7s2.5 1 2.5 2.7V17"/>',
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
