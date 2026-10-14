// A picture or map clip with its caption and credit.
import { media } from "./content";
import { h } from "./dom";
import { colon, type Strings } from "./i18n";
import type { Lang, MediaItem } from "./types";

/** "Title. Author. Licence." with a link to where it comes from. */
export function creditLine(item: MediaItem, lang: Lang, t: Strings): HTMLElement {
  const link = item.source_url.startsWith("https://")
    ? h("a", { href: item.source_url, target: "_blank", rel: "noopener" }, "↗")
    : null;
  return h("small", { class: "credit" }, `${t.credit}${colon(lang)}${item.author}. ${item.licence}. `, link);
}

/** A media path for a language: map clips exist in French and English ({lang} in the path). */
export function localPath(path: string, lang: Lang): string {
  return path.replace("{lang}", lang);
}

export function renderMedia(id: string, lang: Lang, t: Strings): HTMLElement | null {
  const item = media[id];
  if (!item || item.kind === "audio") return null;
  const visual =
    item.kind === "video"
      ? h("video", {
          src: localPath(item.file, lang),
          poster: item.poster && localPath(item.poster, lang),
          controls: true,
          muted: true,
          playsinline: true,
          preload: "none",
          "aria-label": item.title,
        })
      : h("img", { src: item.file, alt: item.title, loading: "lazy", decoding: "async" });
  return h("figure", { class: `media media-${item.kind}` }, visual, h("figcaption", {}, item.caption[lang], " ", creditLine(item, lang, t)));
}
