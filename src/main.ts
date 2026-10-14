import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/eb-garamond/wght-italic.css";
import "./style.css";
import { renderAfterlife } from "./afterlife";
import { Ambient } from "./ambient";
import { layers, media, milestones, notes, recordedCues, sceneByNumber, scenes, slides } from "./content";
import { clear, h, prefersReducedMotion } from "./dom";
import { colon, strings, type Strings } from "./i18n";
import { chooseLayer, clamp, sceneAt, sceneCentre, sceneRange } from "./layout";
import { creditLine } from "./media";
import { Minimap } from "./minimap";
import { formatTime } from "./narration";
import { NotesPanel, notesInRange } from "./notes-panel";
import { Player } from "./player";
import { shortLabel, sourceList } from "./sources";
import { browserLang, parseState, serializeState, type AppState } from "./state";
import { Strip } from "./strip";
import { renderCueEditor, startCalibration } from "./tools";
import type { Lang, Note, Scene } from "./types";

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

function header(): HTMLElement {
  const other: Lang = state.lang === "fr" ? "en" : "fr";
  const viewLink = (view: AppState["view"], label: string) =>
    h(
      "a",
      { href: serializeState({ ...state, view, tool: "none" }), "aria-current": state.view === view ? "page" : undefined },
      label,
    );
  return h(
    "header",
    { class: "topbar" },
    h("div", { class: "brand" }, h("h1", {}, h("a", { href: serializeState({ ...state, view: "strip", tool: "none" }) }, t.appTitle)), h("p", {}, t.appSubtitle)),
    h(
      "nav",
      { class: "topnav" },
      state.view === "strip" ? viewLink("text", t.textView) : viewLink("strip", t.stripView),
      viewLink("afterlife", t.afterlife),
      h("button", { type: "button", onclick: openAbout }, t.about),
      h("a", { href: serializeState({ ...state, lang: other }), hreflang: other, lang: other, "aria-label": t.switchLangLabel }, t.switchLang),
    ),
  );
}

// ---------- scene text ----------

function sceneInfo(scene: Scene, lang: Lang): HTMLElement[] {
  return [
    h("p", { class: "scene-kicker" }, `${t.scene} ${scene.n} / ${scenes.length}`),
    h("h2", {}, scene.title[lang]),
    h("p", { class: "latin", lang: "la", title: t.latin }, scene.latin),
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
  app.replaceChildren(header(), main);
  if (state.scene) document.getElementById(`scene-${state.scene}`)?.scrollIntoView();
}

// ---------- strip view ----------

function renderStrip(): void {
  const lang = state.lang;
  const info = h("section", { class: "scene-info", "aria-live": "polite" });
  const sceneSelect = h(
    "select",
    { class: "scene-select", "aria-label": t.jumpTo },
    ...scenes.map((s) => h("option", { value: String(s.n) }, `${s.n}. ${s.title[lang]}`)),
  );
  const playButton = h("button", { type: "button", class: "primary play" });
  const timeLabel = h("span", { class: "time" });
  const speedSelect = h(
    "select",
    { "aria-label": t.speed },
    ...[0.75, 1, 1.25, 1.5].map((v) => h("option", { value: String(v), selected: v === 1 }, `${v}×`)),
  );
  const ambient = new Ambient();
  const ambientButton = h("button", { type: "button", class: "ambient", "aria-pressed": "false" }, `♪ ${t.ambientOn}`);

  let currentScene = 0;
  let frame = 0;
  const xOfNote = new Map<string, number>();

  const strip = new Strip({
    layer,
    notes,
    lang,
    label: t.stripLabel,
    onNote: (note) => {
      panel.show(note);
      // Bring the note's heading into view without scrolling the embroidery away.
      const top = panel.el.getBoundingClientRect().top;
      if (top > window.innerHeight - 140) {
        window.scrollBy({ top: top - window.innerHeight + 260, behavior: prefersReducedMotion() ? "auto" : "smooth" });
      }
    },
    onChange: () => {
      // Viewport events fire on every animation frame; work once per frame.
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(sync);
    },
    onUserMove: () => player.pause(),
  });
  for (const note of notes) xOfNote.set(note.id, strip.notePoint(note).x);

  const panel = new NotesPanel({
    notes,
    lang,
    t,
    lens: state.lens,
    onLens: (lens) => {
      state.lens = lens;
      setUrl();
      strip.filterMarkers((n) => lens === null || n.lens === lens);
      sync();
    },
    onOpen: (note) => strip.select(note),
    onShow: (note) => {
      player.pause();
      strip.setCentre(xOfNote.get(note.id) ?? strip.centre(), !prefersReducedMotion());
    },
  });
  strip.filterMarkers((n) => state.lens === null || n.lens === state.lens);

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
    info.replaceChildren(...sceneInfo(sceneByNumber(n), lang));
    sceneSelect.value = String(n);
    state.scene = n;
    setUrl();
  };

  function sync(): void {
    const centre = strip.centre();
    const half = strip.visibleWidth() / 2;
    minimap.update(centre, half * 2);
    if (!player.playing) showScene(sceneAt(layer, centre));
    panel.showInView(notesInRange(notes, (n) => xOfNote.get(n.id) ?? 0, centre - half, centre + half, panel.currentLens));
  }

  const updateControls = () => {
    playButton.textContent = player.playing ? `❚❚ ${t.pause}` : `▶ ${t.play}`;
    playButton.setAttribute("aria-label", player.playing ? t.pauseLabel : t.playLabel);
    timeLabel.textContent = `${formatTime(player.time)} / ${formatTime(player.total)} · ${player.mode === "audio" ? t.modeAudio : t.modeText}`;
    ambient.duck(player.playing && player.mode === "audio");
  };

  const player = new Player(layer, scenes, lang, recordedCues[lang], {
    onFrame: (x, scene) => {
      strip.setCentre(x);
      showScene(scene);
      updateControls();
    },
    onStateChange: updateControls,
  });

  const goToScene = (n: number) => {
    player.pause();
    const target = clamp(n, 1, scenes.length);
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
    player.play(currentScene || 1);
  });
  speedSelect.addEventListener("change", () => player.setSpeed(Number(speedSelect.value)));
  sceneSelect.addEventListener("change", () => goToScene(Number(sceneSelect.value)));
  ambientButton.addEventListener("click", () => {
    const on = ambient.toggle();
    ambientButton.setAttribute("aria-pressed", String(on));
    ambientButton.textContent = on ? `♪ ${t.ambientOff}` : `♪ ${t.ambientOn}`;
  });

  document.addEventListener("keydown", (e) => {
    if (dialog.open || e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    const step = strip.element.clientWidth * 0.2;
    const [x0] = sceneRange(layer, currentScene || 1);
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
        goToScene(currentScene + 1);
        break;
      case "[":
      case "PageUp":
        // Back to the start of this scene first, like a music player.
        goToScene(strip.centre() - x0 > strip.visibleWidth() * 0.6 ? currentScene : currentScene - 1);
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

  const zoomButton = (label: string, text: string, action: () => void) =>
    h("button", { type: "button", "aria-label": label, title: label, onclick: action }, text);
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
    h("button", { type: "button", class: "nav prev", "aria-label": t.prevScene, onclick: () => goToScene(currentScene - 1) }, "‹"),
    h("button", { type: "button", class: "nav next", "aria-label": t.nextScene, onclick: () => goToScene(currentScene + 1) }, "›"),
  );
  const controls = h(
    "div",
    { class: "controls" },
    playButton,
    timeLabel,
    h("label", { class: "speed" }, `${t.speed} `, speedSelect),
    ambientButton,
    sceneSelect,
  );
  const main = h(
    "main",
    { class: "strip-view" },
    stage,
    minimap.el,
    controls,
    panel.lensBar,
    h("div", { class: "reading" }, info, panel.el),
    h("p", { class: "what-next" }, h("a", { href: serializeState({ ...state, view: "afterlife" }) }, t.whatNext)),
    h("p", { class: "hint" }, t.keyboardHint),
  );
  app.replaceChildren(header(), main);

  // Size the viewer, then open at the requested scene once the image is ready.
  const start = state.scene ?? 1;
  const fromUrl = state.scene !== null;
  const fit = () => {
    const height = clamp(Math.min(window.innerHeight - 300, window.innerHeight * 0.58), 220, 680);
    strip.element.style.height = `${height}px`;
  };
  window.addEventListener("resize", fit);
  fit();
  strip.viewer.addOnceHandler("open", () => {
    strip.setCentre(fromUrl ? sceneCentre(layer, start) : sceneRange(layer, 1)[0] + strip.visibleWidth() / 2);
    showScene(start);
    sync();
  });
  showScene(start);
  updateControls();

  if (state.tool === "calibrate") startCalibration(main, t, strip, layer, scenes);
}

if (state.tool === "cues") {
  const main = h("main", { class: "tool-view" });
  app.replaceChildren(header(), main);
  renderCueEditor(main, t, scenes, state.lang);
} else if (state.view === "text") {
  renderText();
} else if (state.view === "afterlife") {
  app.replaceChildren(header());
  const root = h("div");
  app.append(root);
  renderAfterlife(root, state.lang, t, serializeState({ ...state, view: "strip" }));
} else {
  renderStrip();
}
