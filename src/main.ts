import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/eb-garamond/wght-italic.css";
import "./style.css";
import shieldSvg from "../public/brand/hic-shield.svg?raw";
import lettersSvg from "../public/brand/hic-letters.svg?raw";
import { renderAfterlife } from "./afterlife";
import { highlights, latin, layers, media, milestones, notes, recordedCues, sceneByNumber, scenes, slides, sounds, soundscape } from "./content";
import { Soundscape } from "./soundscape";
import { clear, h, prefersReducedMotion } from "./dom";
import { colon, strings, type Strings } from "./i18n";
import { captionTokens, grammarLabel } from "./latin";
import { chooseLayer, clamp, sceneAt, sceneCentre, scenePoint, sceneRange } from "./layout";
import { icon, type IconName } from "./icons";
import { creditLine } from "./media";
import { Minimap } from "./minimap";
import { autoCues, formatTime, highlightCues, startScene, timeForScene, timeForStop } from "./narration";
import { NotesPanel, notesInRange } from "./notes-panel";
import { Player, type TourPlan } from "./player";
import { shortLabel, sourceList } from "./sources";
import { browserLang, parseState, serializeState, type AppState } from "./state";
import { Strip } from "./strip";
import { thumbnail } from "./thumb";
import { renderCueEditor, startCalibration } from "./tools";
import type { Highlight, Lang, Note, Scene } from "./types";

const app = document.getElementById("app")!;
const state: AppState = parseState(location.search, browserLang(navigator.languages), scenes.length);
const t: Strings = strings[state.lang];
const layer = chooseLayer(layers, state.image);
document.documentElement.lang = state.lang;
document.title = `${t.appTitle} — ${t.appSubtitle}`;

function setUrl(): void {
  history.replaceState(null, "", serializeState(state) + location.hash);
}

// ---------- modal panel (sources, about) ----------

const dialog = h("dialog", { class: "panel" });
document.body.append(dialog);

function openPanel(title: string, ...body: Node[]): void {
  clear(dialog);
  dialog.append(
    h(
      "div",
      { class: "panel-head" },
      h("h2", {}, title),
      h("button", { type: "button", class: "icon", "aria-label": t.close, onclick: () => dialog.close() }, "×"),
    ),
    h("div", { class: "panel-body" }, ...body),
  );
  dialog.showModal();
}
dialog.addEventListener("click", (e) => {
  if (e.target === dialog) dialog.close();
});

function openSources(keys: string[]): void {
  openPanel(t.sources, sourceList(keys));
}

function openAbout(): void {
  const lang = state.lang;
  const allKeys = [
    ...new Set([...scenes, ...notes, ...slides].flatMap((x) => [...x.sources, ...("sections" in x ? (x.sections ?? []).flatMap((s) => s.sources) : [])])),
  ];
  const link = (href: string, label: string) => h("a", { href, target: "_blank", rel: "noopener" }, label);
  openPanel(
    t.aboutTitle,
    h("p", {}, t.aboutText),
    h("p", {}, t.aboutMethod),
    h("p", {}, t.narrationCredit),
    h("h3", {}, t.keyboardTitle),
    h("p", {}, h("small", {}, t.keyboardHint)),
    h("h3", {}, t.imageCredit),
    h("p", {}, `${layer.credit.title}. ${layer.credit.author}. ${layer.credit.licence}. `, link(layer.credit.file_page, "Wikimedia Commons")),
    ...layers
      .filter((l) => l.available && l.id !== layer.id)
      .map((l) => h("p", {}, h("a", { href: serializeState({ ...state, image: l.id }) }, `${t.otherImage}${colon(lang)}${l.credit.title}`))),
    h(
      "p",
      {},
      link("https://www.bayeuxmuseum.com/en/the-bayeux-tapestry/discover-the-bayeux-tapestry/explore-online/", t.officialPanorama),
      h("br"),
      h("small", {}, t.officialCredit),
    ),
    h("h3", {}, t.credit),
    h("p", {}, h("small", {}, t.ambientCredit)),
    h(
      "ul",
      { class: "credits" },
      ...Object.values(sounds).map((s) => h("li", {}, `${s.title} · ${s.author} · ${s.licence} `, link(s.page, "↗"))),
    ),
    h("ul", { class: "credits" }, ...Object.values(media).map((m) => h("li", {}, `${m.title} · `, creditLine(m, lang, t)))),
    h("h3", {}, t.visit),
    h(
      "ul",
      {},
      h("li", {}, link("https://www.bayeuxmuseum.com/", t.visitBayeux)),
      h("li", {}, link("https://www.britishmuseum.org/exhibitions/bayeux-tapestry", t.visitBM)),
    ),
    h("h3", {}, t.bibliography),
    sourceList(allKeys),
  );
}

// ---------- header ----------

/** Our own SVG marks (scripts/make_brand.py), inlined from the build so they need no extra request. */
function brandMark(className: string, markup: string): HTMLElement {
  const span = h("span", { class: className, "aria-hidden": "true" });
  span.innerHTML = markup;
  return span;
}

// The soundscape follows the reader from view to view, and the scene in view along the embroidery.
const ambient = new Soundscape(soundscape);

const FLAGS: Record<Lang, string> = {
  fr: '<svg viewBox="0 0 3 2" aria-hidden="true"><rect width="1" height="2" fill="#002654"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ce1126"/></svg>',
  en: '<svg viewBox="0 0 60 30" preserveAspectRatio="none" aria-hidden="true"><clipPath id="uk-flag"><path d="M30 15h30v15zv15H0zH0V0zV0h30z"/></clipPath><path d="M0 0v30h60V0z" fill="#012169"/><path d="M0 0l60 30m0-30L0 30" stroke="#fff" stroke-width="6"/><path d="M0 0l60 30m0-30L0 30" clip-path="url(#uk-flag)" stroke="#c8102e" stroke-width="4"/><path d="M30 0v30M0 15h60" stroke="#fff" stroke-width="10"/><path d="M30 0v30M0 15h60" stroke="#c8102e" stroke-width="6"/></svg>',
};

function ambientButton(): HTMLButtonElement {
  const button = h("button", { type: "button", class: "icon-button ambient" }, icon("sound"));
  const show = () => {
    button.setAttribute("aria-pressed", String(ambient.on));
    button.setAttribute("aria-label", ambient.on ? t.ambientOff : t.ambientOn);
    button.title = ambient.on ? t.ambientOff : t.ambientOn;
  };
  button.addEventListener("click", () => {
    ambient.toggle();
    show();
  });
  show();
  return button;
}

/** The top bar; `tools` (the tour controls) sits between the brand and the links in the strip view. */
function header(tools?: HTMLElement): HTMLElement {
  const other: Lang = state.lang === "fr" ? "en" : "fr";
  const flag = h("a", {
    class: "flag",
    href: serializeState({ ...state, lang: other }),
    hreflang: other,
    "aria-label": t.switchLangLabel,
    title: t.switchLangLabel,
  });
  flag.innerHTML = FLAGS[other];
  // Icons with their name as tooltip and for screen readers. The three views (embroidery, text, after 1066) form
  // one segmented switch, set apart from the tools (about, sound, language).
  const viewLink = (view: AppState["view"], label: string, name: IconName) =>
    h(
      "a",
      {
        class: "view-option",
        href: serializeState({ ...state, view, tool: "none" }),
        "aria-current": state.view === view ? "page" : undefined,
        "aria-label": label,
        title: label,
      },
      icon(name),
    );
  return h(
    "header",
    { class: "topbar" },
    h(
      "div",
      { class: "brand" },
      h(
        "a",
        { href: serializeState({ ...state, view: "strip", tool: "none" }), class: "brand-link" },
        // The shield and the letters in one plain box that breaks the stripes; the subtitle stands outside it.
        h(
          "span",
          { class: "brand-box" },
          brandMark("brand-shield", shieldSvg),
          h("h1", {}, brandMark("brand-word", lettersSvg), h("span", { class: "visually-hidden" }, t.appTitle)),
        ),
        h("p", {}, t.appSubtitle),
      ),
    ),
    tools ?? "",
    h(
      "nav",
      { class: "topnav" },
      h(
        "div",
        { class: "view-switch", role: "group", "aria-label": t.views },
        viewLink("strip", t.stripView, "strip"),
        viewLink("text", t.textView, "text"),
        viewLink("afterlife", t.afterlife, "after"),
      ),
      h(
        "div",
        { class: "tool-group" },
        h("button", { type: "button", class: "icon-button", "aria-label": t.about, title: t.about, onclick: openAbout }, icon("about")),
        ambientButton(),
        flag,
      ),
    ),
  );
}

function footer(): HTMLElement {
  return h(
    "footer",
    { class: "site-footer" },
    h("p", {}, t.footer, " ", h("button", { type: "button", class: "link", onclick: openAbout }, t.method)),
  );
}

// ---------- scene text ----------

/** The embroidered caption pulses on the image until the reader has opened a translation (remembered here). */
const LATIN_FOUND_KEY = "bayeux-latin-found";
function markLatinFound(): void {
  document.documentElement.classList.add("latin-found");
  try {
    localStorage.setItem(LATIN_FOUND_KEY, "1");
  } catch {
    // Storage blocked: the words simply pulse again next time.
  }
}
try {
  if (localStorage.getItem(LATIN_FOUND_KEY)) document.documentElement.classList.add("latin-found");
} catch {
  // Storage blocked.
}

/** The titulus as clickable words; a click shows the word's lemma, meaning and grammar underneath. */
function latinLine(scene: Scene, lang: Lang): HTMLElement[] {
  const gloss = h("p", { class: "word-gloss", "aria-live": "polite" }, h("small", { class: "word-hint" }, t.wordHint));
  const line = h("p", { class: "latin", lang: "la", title: t.latin });
  let pressed: HTMLButtonElement | null = null;
  for (const token of captionTokens(scene.latin)) {
    if (line.childNodes.length > 0) line.append(" ");
    if (token.kind === "separator") {
      line.append(token.text);
      continue;
    }
    const word = latin.words[token.key];
    const button = h(
      "button",
      { type: "button", class: "word", "aria-pressed": "false" },
      ...token.parts.map((part) => (part.supplied ? h("span", { class: "supplied" }, `[${part.text}]`) : part.text)),
    );
    button.addEventListener("click", () => {
      markLatinFound();
      pressed?.setAttribute("aria-pressed", "false");
      if (pressed === button) {
        pressed = null;
        gloss.replaceChildren(h("small", { class: "word-hint" }, t.wordHint));
        return;
      }
      pressed = button;
      button.setAttribute("aria-pressed", "true");
      if (!word) return;
      const supplied = token.parts.some((part) => part.supplied);
      gloss.replaceChildren(
        h("strong", { lang: "la" }, token.key),
        word.lemma.toUpperCase() !== token.key ? h("span", { class: "lemma", lang: "la" }, ` (${word.lemma})`) : "",
        `${colon(lang)}${word.gloss[lang]}`,
        h("small", {}, ` · ${grammarLabel(word.gram, t.grammar)}`),
        supplied ? h("small", { class: "supplied-hint" }, h("br"), t.wordSupplied) : "",
      );
    });
    line.append(button);
  }
  return [line, gloss];
}

function sceneInfo(scene: Scene, lang: Lang): HTMLElement[] {
  return [
    h("p", { class: "scene-kicker" }, `${t.scene} ${scene.n} / ${scenes.length}`),
    h("h2", {}, scene.title[lang]),
    ...latinLine(scene, lang),
    h("p", { class: "gloss", title: t.translation }, lang === "fr" ? `« ${scene.gloss.fr} »` : `“${scene.gloss.en}”`),
    h("p", { class: "script" }, scene.script[lang]),
    h(
      "p",
      { class: "scene-sources" },
      h(
        "button",
        { type: "button", class: "link", onclick: () => openSources(scene.sources) },
        `${t.sources}${colon(lang)}`,
        scene.sources.map(shortLabel).join(" · "),
      ),
    ),
  ];
}

// ---------- text view ----------

function noteDetails(note: Note, lang: Lang): HTMLElement {
  return h(
    "details",
    { class: `text-note lens-${note.lens}` },
    h("summary", {}, h("span", { class: "lens-tag" }, t.lenses[note.lens]), " ", note.title[lang]),
    h("p", {}, note.summary[lang]),
    ...(note.sections ?? []).flatMap((s) => [h("h4", {}, s.heading[lang]), h("p", {}, s.text[lang])]),
    sourceList([...note.sources, ...(note.sections ?? []).flatMap((s) => s.sources)]),
  );
}

function renderText(): void {
  const lang = state.lang;
  const main = h(
    "main",
    { class: "text-view" },
    h("h1", {}, t.textViewTitle),
    ...scenes.map((scene) =>
      h(
        "article",
        { id: `scene-${scene.n}`, class: "text-scene" },
        ...sceneInfo(scene, lang),
        ...notes.filter((n) => n.scene === scene.n).map((n) => noteDetails(n, lang)),
      ),
    ),
    h("p", { class: "what-next" }, h("a", { href: serializeState({ ...state, view: "afterlife" }) }, t.whatNext)),
  );
  app.replaceChildren(header(), main, footer());
  if (state.scene) document.getElementById(`scene-${state.scene}`)?.scrollIntoView();
}

// ---------- strip view ----------

function renderStrip(): void {
  const lang = state.lang;
  const info = h("section", { class: "scene-info", "aria-live": "polite" });
  const playButton = h("button", { type: "button", class: "primary play icon-button" });
  const timeLabel = h("span", { class: "time" });
  const speedSelect = h(
    "select",
    { class: "speed-select", "aria-label": t.speed },
    ...[0.75, 1, 1.25, 1.5].map((v) => h("option", { value: String(v), selected: v === 1 }, `${v}×`)),
  );
  const tourSelect = h(
    "select",
    { "aria-label": t.tourLabel },
    h("option", { value: "full", selected: state.tour === "full" }, t.tourFull),
    h("option", { value: "highlights", selected: state.tour === "highlights" }, t.tourHighlights),
  );

  let currentScene = 0;
  let currentStop = 0;
  let frame = 0;
  /** Until when the view is animating to a scene chosen with the arrows or keys. */
  let movingUntil = 0;
  let lastSyncCentre = Number.NaN;
  const xOfNote = new Map<string, number>();

  const strip = new Strip({
    layer,
    notes,
    lang,
    label: t.stripLabel,
    onNote: (note) => openNote(note),
    onCaption: (scene) => {
      showScene(scene);
      const latinLine = info.querySelector(".latin");
      latinLine?.scrollIntoView({ block: "center", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      latinLine?.querySelector<HTMLButtonElement>(".word")?.click();
    },
    onChange: () => {
      // Viewport events fire on every animation frame; work once per frame.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    },
    onUserMove: () => {
      movingUntil = 0;
      player.pause();
    },
  });
  for (const note of notes) xOfNote.set(note.id, strip.notePoint(note).x);

  const panel = new NotesPanel({
    notes,
    lang,
    t,
    lenses: state.lenses,
    onLenses: (lenses) => {
      state.lenses = lenses;
      setUrl();
      strip.filterMarkers((n) => lenses.includes(n.lens));
      sync();
    },
    onOpen: (note) => strip.select(note),
    onShow: (note) => {
      player.pause();
      stage.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
      strip.setCentre(xOfNote.get(note.id) ?? strip.centre(), !prefersReducedMotion());
    },
    thumb: (note) => thumbnail(layer, strip.noteRect(note)),
  });
  strip.filterMarkers((n) => state.lenses.includes(n.lens));

  /** Opens a note from its frame and scrolls down to it; its picture brings the reader back up. */
  function openNote(note: Note): void {
    panel.show(note);
    panel.el.scrollIntoView({ block: "start", behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }

  const minimap = new Minimap(
    layer,
    scenes,
    milestones,
    lang,
    { overview: t.overview, milestones: t.milestones },
    (x, smooth) => {
      player.pause();
      strip.setCentre(x, smooth && !prefersReducedMotion());
    },
  );

  const showScene = (n: number) => {
    if (n === currentScene) return;
    currentScene = n;
    if (state.tour === "full") info.replaceChildren(...sceneInfo(sceneByNumber(n), lang));
    state.scene = n;
    setUrl();
  };

  /** The highlights tour's card: the moment's text, its scene's caption, and links to go on. */
  function stopCard(i: number): HTMLElement[] {
    const stop: Highlight = highlights[i];
    const scene = sceneByNumber(stop.scene);
    const note = stop.note ? notes.find((n) => n.id === stop.note) : undefined;
    return [
      h("p", { class: "scene-kicker" }, `${t.highlight} ${i + 1} / ${highlights.length} · ${t.scene} ${scene.n}`),
      h("h2", {}, stop.title[lang]),
      h("p", { class: "script" }, stop.text[lang]),
      h(
        "p",
        { class: "stop-nav" },
        h("button", { type: "button", class: "link", disabled: i === 0, onclick: () => goToStop(i - 1) }, `← ${t.prevStop}`),
        h(
          "button",
          { type: "button", class: "link", disabled: i === highlights.length - 1, onclick: () => goToStop(i + 1) },
          `${t.nextStop} →`,
        ),
        note ? h("button", { type: "button", class: "link", onclick: () => openNote(note) }, t.readNote) : "",
      ),
      ...latinLine(scene, lang),
      h("p", { class: "gloss", title: t.translation }, lang === "fr" ? `« ${scene.gloss.fr} »` : `“${scene.gloss.en}”`),
      h(
        "p",
        { class: "scene-sources" },
        h(
          "button",
          { type: "button", class: "link", onclick: () => openSources(stop.sources) },
          `${t.sources}${colon(lang)}`,
          stop.sources.map(shortLabel).join(" · "),
        ),
      ),
    ];
  }

  const showStop = (i: number) => {
    currentStop = clamp(i, 0, highlights.length - 1);
    info.replaceChildren(...stopCard(currentStop));
  };

  const goToStop = (i: number) => {
    player.pause();
    showStop(i);
    const stop = highlights[currentStop];
    strip.setCentre(scenePoint(layer, stop.scene, stop.at), !prefersReducedMotion());
    showScene(stop.scene);
  };

  function sync(): void {
    const centre = strip.centre();
    const half = strip.visibleWidth() / 2;
    minimap.update(centre, half * 2);
    // The scene follows the view when it moves; while a scene-to-scene move animates, it is the move's target.
    // A zoom (no move) keeps it, as does a move the view's edge stops (scenes 1 and 2 can share the first view).
    const moved = !(Math.abs(centre - lastSyncCentre) <= half * 0.01);
    lastSyncCentre = centre;
    if (!player.playing && moved && performance.now() > movingUntil) showScene(startScene(layer, centre, half));
    strip.showCaption(sceneAt(layer, centre));
    ambient.setScene(sceneAt(layer, centre));
    panel.showInView(notesInRange(notes, (n) => xOfNote.get(n.id) ?? 0, centre - half, centre + half, panel.currentLenses));
  }

  const updateControls = () => {
    playButton.replaceChildren(icon(player.playing ? "pause" : "play"));
    playButton.setAttribute("aria-label", player.playing ? t.pauseLabel : t.playLabel);
    playButton.title = player.playing ? t.pause : t.play;
    timeLabel.textContent = `${formatTime(player.time)} / ${formatTime(player.total)}`;
    timeLabel.title = player.mode === "audio" ? t.modeAudio : t.modeText;
    ambient.duck(player.playing && player.mode === "audio");
  };

  const tourPlan = (): TourPlan =>
    state.tour === "highlights"
      ? { text: highlightCues(layer, highlights, lang) }
      : { text: autoCues(layer, scenes, lang), audio: { src: `audio/narration.${lang}.mp3`, cues: recordedCues[lang] } };
  const makePlayer = () =>
    new Player(layer, tourPlan(), {
      onFrame: (x, cue) => {
        strip.setCentre(x);
        showScene(cue.scene);
        if (cue.stop !== undefined && cue.stop !== currentStop) showStop(cue.stop);
        updateControls();
      },
      onStateChange: updateControls,
    });
  let player = makePlayer();

  const goToScene = (n: number) => {
    player.pause();
    const target = clamp(n, 1, scenes.length);
    movingUntil = performance.now() + 1000;
    strip.setCentre(sceneCentre(layer, target), !prefersReducedMotion());
    showScene(target);
  };

  playButton.addEventListener("click", () => {
    if (player.playing) {
      player.pause();
      return;
    }
    // The tour shows the full height of the embroidery.
    strip.fitHeight(true);
    const centre = strip.centre();
    const half = strip.visibleWidth() / 2;
    // Paused and not moved since: go on from the same word.
    if (player.lastX !== null && player.time > 0 && player.time < player.total - 0.5 && Math.abs(centre - player.lastX) < half * 0.02) {
      player.resume();
      return;
    }
    // Otherwise start from what is in view: the stop shown, or the scene in the middle of the view.
    player.play(
      state.tour === "highlights"
        ? timeForStop(player.cueList, currentStop)
        : timeForScene(player.cueList, currentScene || startScene(layer, centre, half)),
      centre,
    );
  });
  tourSelect.addEventListener("change", () => {
    player.pause();
    state.tour = tourSelect.value === "highlights" ? "highlights" : "full";
    setUrl();
    player = makePlayer();
    if (state.tour === "highlights") showStop(currentStop);
    else info.replaceChildren(...sceneInfo(sceneByNumber(currentScene || 1), lang));
    updateControls();
  });
  speedSelect.addEventListener("change", () => player.setSpeed(Number(speedSelect.value)));


  document.addEventListener("keydown", (e) => {
    if (dialog.open || e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    const step = strip.element.clientWidth * 0.2;
    switch (e.key) {
      case "ArrowRight":
        player.pause();
        strip.panByPixels(step);
        break;
      case "ArrowLeft":
        player.pause();
        strip.panByPixels(-step);
        break;
      case "ArrowUp":
        if (!strip.zoomedIn()) return;
        strip.panByPixels(0, -step / 2);
        break;
      case "ArrowDown":
        if (!strip.zoomedIn()) return;
        strip.panByPixels(0, step / 2);
        break;
      case "+":
      case "=":
        player.pause();
        strip.zoomBy(1.4);
        break;
      case "-":
        strip.zoomBy(1 / 1.4);
        break;
      case "0":
        strip.fitHeight();
        break;
      case "]":
      case "PageDown":
        if (state.tour === "highlights") goToStop(currentStop + 1);
        else goToScene(currentScene + 1);
        break;
      case "[":
      case "PageUp":
        if (state.tour === "highlights") goToStop(currentStop - 1);
        // Back to this scene first when the view has moved on past it, like a music player; else the one before.
        else {
          const pastIt = strip.centre() - sceneCentre(layer, currentScene) > strip.visibleWidth() * 0.25;
          goToScene(pastIt && performance.now() > movingUntil ? currentScene : currentScene - 1);
        }
        break;
      case "Home":
        goToScene(1);
        break;
      case "End":
        goToScene(scenes.length);
        break;
      case "Escape":
        if (!panel.openNote) return;
        panel.close();
        break;
      case " ":
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLAnchorElement) return;
        playButton.click();
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  /** The arrows beside the embroidery move by scene, or by moment in the highlights tour. */
  const step = (d: number) => (state.tour === "highlights" ? goToStop(currentStop + d) : goToScene(currentScene + d));
  const zoomButton = (label: string, text: string, action: () => void) =>
    h("button", { type: "button", "aria-label": label, title: label, onclick: action }, text);
  // A one-time hint on how to use the embroidery; it goes at the first drag or tap (remembered on this device).
  const HINT_KEY = "bayeux-hint-seen";
  let hintSeen = false;
  try {
    hintSeen = localStorage.getItem(HINT_KEY) === "1";
  } catch {
    // Storage blocked: the hint simply shows again next time.
  }
  const hint = h("p", { class: "stage-hint", hidden: hintSeen, "aria-hidden": "true" }, t.stageHint);
  const dismissHint = () => {
    if (hint.hidden) return;
    hint.hidden = true;
    try {
      localStorage.setItem(HINT_KEY, "1");
    } catch {
      // Storage blocked.
    }
  };
  strip.element.addEventListener("pointerdown", dismissHint, { once: true });

  const stage = h(
    "section",
    { class: "stage" },
    strip.element,
    h(
      "div",
      { class: "zoom-controls" },
      zoomButton(t.zoomIn, "+", () => {
        player.pause();
        strip.zoomBy(1.6);
      }),
      zoomButton(t.zoomOut, "−", () => strip.zoomBy(1 / 1.6)),
      zoomButton(t.zoomFit, "⤢", () => strip.fitHeight()),
    ),
    hint,
    h("button", { type: "button", class: "nav prev", "aria-label": t.prevScene, onclick: () => step(-1) }, "‹"),
    h("button", { type: "button", class: "nav next", "aria-label": t.nextScene, onclick: () => step(1) }, "›"),
  );
  // On phones these sit in a bar at the bottom of the screen, with previous / next beside play.
  const stepButton = (d: number, label: string, name: IconName) =>
    h("button", { type: "button", class: "icon-button tool-step", "aria-label": label, title: label, onclick: () => step(d) }, icon(name));
  const tools = h(
    "div",
    { class: "tour-tools" },
    stepButton(-1, t.prevScene, "prev"),
    playButton,
    stepButton(1, t.nextScene, "next"),
    tourSelect,
    speedSelect,
    timeLabel,
  );
  const main = h(
    "main",
    { class: "strip-view" },
    stage,
    minimap.el,
    panel.lensBar,
    h("div", { class: "reading" }, info, panel.el),
    h("p", { class: "what-next" }, h("a", { href: serializeState({ ...state, view: "afterlife" }) }, t.whatNext)),
  );
  app.replaceChildren(header(tools), main, footer());

  // Size the viewer, then open at the requested scene once the image is ready.
  const start = state.scene ?? 1;
  const fromUrl = state.scene !== null;
  const fit = () => {
    // On phones the embroidery takes under half the screen, leaving room for the reading below.
    const phone = window.innerWidth <= 640;
    const height = phone
      ? clamp(window.innerHeight * 0.42, 200, 420)
      : clamp(Math.min(window.innerHeight - 300, window.innerHeight * 0.58), 220, 680);
    strip.element.style.height = `${height}px`;
  };
  window.addEventListener("resize", fit);
  fit();
  strip.viewer.addOnceHandler("open", () => {
    strip.setCentre(fromUrl ? sceneCentre(layer, start) : sceneRange(layer, 1)[0] + strip.visibleWidth() / 2);
    showScene(start);
    // The scene asked for stays, even where the view's edge keeps it off-centre.
    lastSyncCentre = strip.centre();
    sync();
  });
  showScene(start);
  // The highlights tour opens on the first moment at or after the requested scene.
  if (state.tour === "highlights") showStop(Math.max(0, highlights.findIndex((stop) => stop.scene >= start)));
  updateControls();

  if (state.tool === "calibrate") startCalibration(main, t, strip, layer, scenes);
}

if (state.tool === "cues") {
  const main = h("main", { class: "tool-view" });
  app.replaceChildren(header(), main, footer());
  renderCueEditor(main, t, scenes, state.lang);
} else if (state.view === "text") {
  renderText();
} else if (state.view === "afterlife") {
  app.replaceChildren(header());
  const root = h("div");
  app.append(root, footer());
  renderAfterlife(root, state.lang, t, serializeState({ ...state, view: "strip" }));
} else {
  renderStrip();
}
