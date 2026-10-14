// The afterlife slideshow (?view=afterlife): what happened to the embroidery after it was made.
// The current slide is kept in the URL hash (#3) so a slide can be shared.
import { slides } from "./content";
import { h } from "./dom";
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
    history.replaceState(null, "", `${location.search}#${index + 1}`);
  }

  prev.addEventListener("click", () => go(index - 1));
  next.addEventListener("click", () => go(index + 1));
  document.addEventListener("keydown", (e) => {
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
      h("p", { class: "slide-foot" }, counter),
    ),
  );
  go(index);
}
