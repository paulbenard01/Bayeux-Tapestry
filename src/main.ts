import "@fontsource-variable/atkinson-hyperlegible-next";
import "@fontsource-variable/eb-garamond";
import "@fontsource-variable/eb-garamond/wght-italic.css";
import "./style.css";
import { hotspots, layers, recordedCues, sceneByNumber, scenes, stories } from "./content";
import { clear, h, prefersReducedMotion } from "./dom";
import { strings, type Strings } from "./i18n";
import { chooseLayer, clamp, nearestWithin, sceneAt, sceneCentre, sceneRange, scenePoint } from "./layout";
import { Minimap } from "./minimap";
import { formatTime } from "./narration";
import { Player } from "./player";
import { shortLabel, sourceList } from "./sources";
import { browserLang, parseState, serializeState, type AppState } from "./state";
import { Strip } from "./strip";
import { renderCueEditor, startCalibration } from "./tools";
import type { Hotspot, Lang, Scene } from "./types";

const app = document.getElementById("app")!;
const state: AppState = parseState(location.search, browserLang(navigator.languages), scenes.length);
const t: Strings = strings[state.lang];
const layer = chooseLayer(layers, state.image);
document.documentElement.lang = state.lang;
document.title = `${t.appTitle} — ${t.appSubtitle}`;

function setUrl(): void {
  history.replaceState(null, "", serializeState(state));
}

// ---------- shared panel (hotspots, sources, about) ----------

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

function paragraphs(text: string): HTMLElement {
  return h("p", {}, text);
}

function openHotspot(hotspot: Hotspot): void {
  const lang = state.lang;
  openPanel(
    hotspot.title[lang],
    h("p", { class: "panel-scene" }, `${t.scene} ${hotspot.scene} · `, h("em", {}, sceneByNumber(hotspot.scene).latin)),
    ...hotspot.sections.flatMap((s) => [h("h3", {}, s.heading[lang]), paragraphs(s.text[lang])]),
    h("h3", {}, t.sources),
    sourceList(hotspot.sections.flatMap((s) => s.sources)),
  );
}

function openSources(keys: string[]): void {
  openPanel(t.sources, sourceList(keys));
}

function openAbout(): void {
  const allKeys = [...new Set([...scenes, ...stories].flatMap((x) => x.sources))];
  openPanel(
    t.aboutTitle,
    paragraphs(t.aboutText),
    h("h3", {}, t.imageCredit),
    h(
      "p",
      {},
      `${layer.credit.title}. ${layer.credit.author}. ${layer.credit.licence}. `,
      h("a", { href: layer.credit.file_page, target: "_blank", rel: "noopener" }, "Wikimedia Commons"),
    ),
    ...layers
      .filter((l) => l.available && l.id !== layer.id)
      .map((l) => h("p", {}, h("a", { href: serializeState({ ...state, image: l.id }) }, `${t.otherImage}${state.lang === "fr" ? " : " : ": "}${l.credit.title}`))),
    h(
      "p",
      {},
      h(
        "a",
        {
          href: "https://www.bayeuxmuseum.com/en/the-bayeux-tapestry/discover-the-bayeux-tapestry/explore-online/",
          target: "_blank",
          rel: "noopener",
        },
        t.officialPanorama,
      ),
      h("br"),
      h("small", {}, t.officialCredit),
    ),
    h("h3", {}, t.visit),
    h(
      "ul",
      {},
      h("li", {}, h("a", { href: "https://www.bayeuxmuseum.com/", target: "_blank", rel: "noopener" }, t.visitBayeux)),
      h(
        "li",
        {},
        h("a", { href: "https://www.britishmuseum.org/exhibitions/bayeux-tapestry", target: "_blank", rel: "noopener" }, t.visitBM),
      ),
    ),
    h("h3", {}, t.bibliography),
    sourceList(allKeys),
  );
}

// ---------- header ----------

function header(): HTMLElement {
  const other: Lang = state.lang === "fr" ? "en" : "fr";
  return h(
    "header",
    { class: "topbar" },
    h("div", { class: "brand" }, h("h1", {}, t.appTitle), h("p", {}, t.appSubtitle)),
    h(
      "nav",
      { class: "topnav" },
      h(
        "a",
        { href: serializeState({ ...state, view: state.view === "text" ? "strip" : "text", tool: "none" }) },
        state.view === "text" ? t.stripView : t.textView,
      ),
      h("button", { type: "button", onclick: openAbout }, t.about),
      h(
        "a",
        { href: serializeState({ ...state, lang: other }), hreflang: other, lang: other, "aria-label": t.switchLangLabel },
        t.switchLang,
      ),
    ),
  );
}

// ---------- scene information under the strip ----------

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
        `${t.sources}${lang === "fr" ? " : " : ": "}`,
        scene.sources.map(shortLabel).join(" · "),
      ),
    ),
  ];
}

// ---------- text view ----------

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
        ...stories
          .filter((s) => s.scene === scene.n)
          .map((s) => h("aside", { class: "text-story" }, h("h3", {}, s.title[lang]), h("p", {}, s.text[lang]))),
        ...hotspots
          .filter((hs) => hs.scene === scene.n)
          .map((hs) => h("button", { type: "button", class: "deeper", onclick: () => openHotspot(hs) }, `${t.moreAbout}${lang === "fr" ? " : " : ": "}${hs.title[lang]}`)),
      ),
    ),
  );
  app.replaceChildren(header(), main);
  if (state.scene) document.getElementById(`scene-${state.scene}`)?.scrollIntoView();
}

// ---------- strip view ----------

function renderStrip(): void {
  const lang = state.lang;
  const strip = new Strip({ layer, scenes, hotspots, lang, label: t.stripLabel, onHotspot: openHotspot });
  const minimap = new Minimap(layer, scenes, t.overview, (x) => {
    player.pause();
    strip.setCentre(x);
  });
  const storyXs = stories.map((s) => scenePoint(layer, s.scene, s.at));
  const storyCard = h("aside", { class: "story-card", "aria-live": "polite" });
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

  let currentScene = 0;
  let currentStory = -2;

  const showScene = (n: number) => {
    if (n === currentScene) return;
    currentScene = n;
    info.replaceChildren(...sceneInfo(sceneByNumber(n), lang));
    sceneSelect.value = String(n);
    state.scene = n;
    setUrl();
  };

  const showStory = (centre: number) => {
    const i = nearestWithin(storyXs, centre, strip.visibleWidth() * 0.3);
    if (i === currentStory) return;
    currentStory = i;
    if (i < 0) {
      storyCard.classList.remove("visible");
      return;
    }
    const story = stories[i];
    storyCard.replaceChildren(h("h3", {}, story.title[lang]), h("p", {}, story.text[lang]));
    storyCard.classList.add("visible");
  };

  const sync = () => {
    const centre = strip.centre();
    minimap.update(centre, strip.visibleWidth());
    if (!player.playing) showScene(sceneAt(layer, centre));
    showStory(centre);
  };

  const updateControls = () => {
    playButton.textContent = player.playing ? `❚❚ ${t.pause}` : `▶ ${t.play}`;
    playButton.setAttribute("aria-label", player.playing ? t.pauseLabel : t.playLabel);
    timeLabel.textContent = `${formatTime(player.time)} / ${formatTime(player.total)} · ${
      player.mode === "audio" ? t.modeAudio : t.modeText
    }`;
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

  playButton.addEventListener("click", () =>
    player.playing ? player.pause() : player.play(currentScene || 1),
  );
  speedSelect.addEventListener("change", () => player.setSpeed(Number(speedSelect.value)));
  sceneSelect.addEventListener("change", () => goToScene(Number(sceneSelect.value)));
  strip.viewport.addEventListener("scroll", sync, { passive: true });
  // Any manual move takes back control from the tour.
  strip.viewport.addEventListener("pointerdown", () => player.pause());
  strip.viewport.addEventListener("touchstart", () => player.pause(), { passive: true });
  strip.viewport.addEventListener(
    "wheel",
    (e) => {
      player.pause();
      if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
        e.preventDefault();
        strip.viewport.scrollLeft += e.deltaY;
      }
    },
    { passive: false },
  );
  document.addEventListener("keydown", (e) => {
    if (dialog.open || e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
    const step = strip.visibleWidth() * 0.15;
    const [x0] = sceneRange(layer, currentScene || 1);
    switch (e.key) {
      case "ArrowRight":
        player.pause();
        strip.setCentre(strip.centre() + step);
        break;
      case "ArrowLeft":
        player.pause();
        strip.setCentre(strip.centre() - step);
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
      case " ":
        if (e.target instanceof HTMLButtonElement) return;
        playButton.click();
        break;
      default:
        return;
    }
    e.preventDefault();
  });

  const stage = h(
    "section",
    { class: "stage" },
    strip.viewport,
    storyCard,
    h("button", { type: "button", class: "nav prev", "aria-label": t.prevScene, onclick: () => goToScene(currentScene - 1) }, "‹"),
    h("button", { type: "button", class: "nav next", "aria-label": t.nextScene, onclick: () => goToScene(currentScene + 1) }, "›"),
  );
  const controls = h(
    "div",
    { class: "controls" },
    playButton,
    timeLabel,
    h("label", { class: "speed" }, `${t.speed} `, speedSelect),
    sceneSelect,
  );
  const main = h(
    "main",
    { class: "strip-view" },
    stage,
    minimap.el,
    controls,
    layer.available ? null : h("p", { class: "note" }, t.placeholderNote),
    info,
    h("p", { class: "hint" }, t.keyboardHint),
  );
  app.replaceChildren(header(), main);

  // Read before the first sync, which rewrites state.scene from the scroll position.
  const start = state.scene ?? 1;
  const fromUrl = state.scene !== null;
  const fit = () => {
    // Leave room below for the controls and the scene text; phones get a shorter strip.
    const available = Math.min(window.innerHeight - 330, window.innerHeight * 0.55);
    strip.resize(clamp(available, 200, Math.min(layer.height * 2.2, 640)));
    sync();
  };
  window.addEventListener("resize", fit);
  fit();
  strip.setCentre(fromUrl ? sceneCentre(layer, start) : sceneRange(layer, 1)[0] + strip.visibleWidth() / 2);
  sync();
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
} else {
  renderStrip();
}
