// A picture or map clip with its caption and credit.
import { media } from "./content";
import { h, prefersReducedMotion } from "./dom";
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

/** Starts a clip when it comes into view (once), and replays it on click. */
const clipWatcher =
  typeof IntersectionObserver === "undefined"
    ? null
    : new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            const video = entry.target as HTMLVideoElement;
            if (entry.isIntersecting && video.dataset.played !== "true") {
              video.dataset.played = "true";
              void video.play().catch(() => undefined);
            }
          }
        },
        { threshold: 0.5 },
      );

/** A map clip: plays by itself, muted, without controls, and stops on its last frame (the whole route). With
 * reduced motion it shows the poster and ordinary controls instead. */
function mapClip(item: MediaItem, lang: Lang): HTMLVideoElement {
  const still = prefersReducedMotion();
  const video = h("video", {
    src: localPath(item.file, lang),
    poster: item.poster && localPath(item.poster, lang),
    playsinline: true,
    preload: still ? "none" : "auto",
    controls: still,
    "aria-label": item.title,
  });
  video.muted = true;
  if (!still) {
    video.addEventListener("click", () => {
      video.currentTime = 0;
      void video.play().catch(() => undefined);
    });
    clipWatcher?.observe(video);
  }
  return video;
}

export function renderMedia(id: string, lang: Lang, t: Strings): HTMLElement | null {
  const item = media[id];
  if (!item || item.kind === "audio") return null;
  const visual =
    item.kind === "video"
      ? mapClip(item, lang)
      : h("img", { src: item.file, alt: item.title, loading: "lazy", decoding: "async" });
  return h("figure", { class: `media media-${item.kind}` }, visual, h("figcaption", {}, item.caption[lang], " ", creditLine(item, lang, t)));
}
