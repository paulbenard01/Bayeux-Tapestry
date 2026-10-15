// The afterlife slideshow (?view=afterlife): what happened to the embroidery after it was made.
// The current slide is kept in the URL hash (#3) so a slide can be shared. The presentation reads each slide aloud
// (scripts/tour_audio.mjs) and moves on to the next; any other click, key or swipe stops it.
import { slides } from "./content";
import { h } from "./dom";
import { icon } from "./icons";
import { exclusiveVoice } from "./voice";
import type { Strings } from "./i18n";
import { renderMedia } from "./media";
import { shortLabel, sourceList } from "./sources";
import type { Lang } from "./types";

export function slideFromHash(hash: string, total: number): number {
  const n = Number(hash.replace("#", ""));
  return Number.isInteger(n) && n >= 1 && n <= total ? n - 1 : 0;
}

export function renderAfterlife(root: HTMLElement, lang: Lang, t: Strings, backHref: string): void {
  let index = slideFromHash(location.hash, slides.length);
  const stage = h("div", { class: "slide-stage", "aria-live": "polite" });
  const counter = h("span", { class: "slide-counter" });
  const prev = h("button", { type: "button", class: "nav-slide", "aria-label": t.slidePrev }, "‹");
  const next = h("button", { type: "button", class: "nav-slide", "aria-label": t.slideNext }, "›");
  const timeline = h(
    "ol",
    { class: "slide-timeline" },
    ...slides.map((s, i) => h("li", {}, h("button", { type: "button", onclick: () => go(i) }, s.date))),
  );

  // ---------- the presentation ----------
  const voice = exclusiveVoice(new Audio());
  voice.preload = "auto";
  let presenting = false;
  let nextTimer = 0;
  const playButton = h("button", { type: "button", class: "primary play icon-button slides-play" });
  const showPlay = () => {
    playButton.replaceChildren(icon(presenting ? "pause" : "play"));
    playButton.setAttribute("aria-label", presenting ? t.pauseSlides : t.playSlides);
    playButton.title = presenting ? t.pauseSlides : t.playSlides;
  };
  const speak = () => {
    voice.src = `audio/afterlife/${lang}/${slides[index].id}.mp3`;
    void voice.play().catch(() => stop());
  };
  function stop(): void {
    if (!presenting) return;
    presenting = false;
    window.clearTimeout(nextTimer);
    voice.pause();
    showPlay();
  }
  voice.addEventListener("ended", () => {
    if (!presenting) return;
    if (index >= slides.length - 1) {
      stop();
      return;
    }
    // A breath between slides, then the next one, read.
    nextTimer = window.setTimeout(() => {
      if (!presenting) return;
      go(index + 1);
      speak();
    }, 1200);
  });
  // Paused from elsewhere (another voice, the system's media keys): the presentation stops too.
  voice.addEventListener("pause", () => {
    if (presenting && !voice.ended) stop();
  });
  playButton.addEventListener("click", () => {
    if (presenting) {
      stop();
      return;
    }
    presenting = true;
    showPlay();
    speak();
  });
  showPlay();
  // Any other interaction is the reader taking over: stop.
  const takeOver = (e: Event) => {
    if (e.target instanceof Node && playButton.contains(e.target)) return;
    stop();
  };

  function go(i: number): void {
    index = Math.max(0, Math.min(slides.length - 1, i));
    const slide = slides[index];
    stage.replaceChildren(
      h(
        "article",
        { class: "slide" },
        h(
          "div",
          { class: "slide-media" },
          ...(slide.media ?? []).map((id) => renderMedia(id, lang, t)),
        ),
        h(
          "div",
          { class: "slide-text" },
          h("p", { class: "slide-date" }, slide.date),
          h("h2", {}, slide.title[lang]),
          h("p", {}, slide.text[lang]),
          h(
            "details",
            { class: "slide-sources" },
            h("summary", {}, `${t.sources} · ${slide.sources.map(shortLabel).join(" · ")}`),
            sourceList(slide.sources),
          ),
        ),
      ),
    );
    counter.textContent = `${index + 1} / ${slides.length}`;
    prev.disabled = index === 0;
    next.disabled = index === slides.length - 1;
    timeline.querySelectorAll("button").forEach((b, j) => b.setAttribute("aria-current", String(j === index)));
    // Keep the current date in view when the dates scroll sideways (phones), without moving the page.
    const current = timeline.querySelectorAll("button")[index];
    if (current && timeline.scrollWidth > timeline.clientWidth) {
      timeline.scrollTo({ left: current.offsetLeft - timeline.clientWidth / 2 + current.offsetWidth / 2 });
    }
    history.replaceState(null, "", `${location.search}#${index + 1}`);
  }

  prev.addEventListener("click", () => go(index - 1));
  next.addEventListener("click", () => go(index + 1));
  document.addEventListener("pointerdown", takeOver);
  document.addEventListener("keydown", (e) => {
    if (e.target !== playButton) stop();
    if (e.key === "ArrowRight" || e.key === "PageDown") go(index + 1);
    else if (e.key === "ArrowLeft" || e.key === "PageUp") go(index - 1);
    else return;
    e.preventDefault();
  });

  root.replaceChildren(
    h(
      "main",
      { class: "afterlife-view" },
      h(
        "header",
        { class: "afterlife-head" },
        h("h1", {}, t.afterlifeTitle),
        h("p", {}, t.afterlifeIntro),
        h("a", { href: backHref, class: "back" }, `← ${t.backToTapestry}`),
      ),
      timeline,
      h("div", { class: "slide-frame" }, prev, stage, next),
      h("p", { class: "slide-foot" }, playButton, counter),
    ),
  );
  go(index);
}
