// Authoring tools: the narration cue editor (?tool=cues) and scene calibration (?tool=calibrate).
// Both run entirely in the browser; the audio file is read locally and never uploaded.
import { h } from "./dom";
import type { Strings } from "./i18n";
import { formatTime } from "./narration";
import type { Strip } from "./strip";
import type { Cue, Lang, Layer, Scene } from "./types";

function download(filename: string, text: string): void {
  const url = URL.createObjectURL(new Blob([text], { type: "application/json" }));
  const a = h("a", { href: url, download: filename });
  document.body.append(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function renderCueEditor(root: HTMLElement, t: Strings, scenes: Scene[], lang: Lang): void {
  const cues: Cue[] = [];
  const audio = h("audio", { controls: true, class: "cue-audio" });
  const status = h("p", { class: "cue-status", "aria-live": "polite" });
  const list = h("ol", { class: "cue-list" });
  let cueLang: Lang = lang;

  const nextScene = () => (cues.length < scenes.length ? scenes[cues.length] : null);
  const refresh = () => {
    const next = nextScene();
    markButton.textContent = next ? `${t.cuesMark} ${next.n} — ${next.title[lang]}` : t.cuesDone;
    markButton.disabled = !next;
    list.replaceChildren(
      ...cues.map((c) => h("li", {}, `${formatTime(c.t)} (${c.t.toFixed(2)} s) → ${t.scene} ${c.scene}`)),
    );
    status.textContent = `${cues.length} / ${scenes.length}`;
  };
  const mark = () => {
    const next = nextScene();
    if (!next) return;
    const time = Math.round(audio.currentTime * 100) / 100;
    if (cues.length > 0 && time <= cues[cues.length - 1].t) return;
    cues.push({ t: time, scene: next.n });
    refresh();
  };

  const markButton = h("button", { type: "button", class: "primary", onclick: mark });
  const fileInput = h("input", {
    type: "file",
    accept: "audio/*",
    onchange: (e: Event) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) audio.src = URL.createObjectURL(file);
    },
  });
  const langSelect = h(
    "select",
    { onchange: (e: Event) => (cueLang = (e.target as HTMLSelectElement).value as Lang) },
    h("option", { value: "fr", selected: lang === "fr" }, "Français"),
    h("option", { value: "en", selected: lang === "en" }, "English"),
  );

  document.addEventListener("keydown", (e) => {
    if (e.code === "Space" && !(e.target instanceof HTMLInputElement)) {
      e.preventDefault();
      mark();
    }
  });

  root.replaceChildren(
    h(
      "section",
      { class: "tool" },
      h("h1", {}, t.cuesTitle),
      h("p", {}, t.cuesHelp),
      h("label", {}, `${t.cuesAudio} `, fileInput),
      h("label", {}, `${t.cuesLang} `, langSelect),
      audio,
      h(
        "div",
        { class: "tool-actions" },
        markButton,
        h("button", {
          type: "button",
          onclick: () => {
            cues.pop();
            refresh();
          },
        }, t.cuesUndo),
        h("button", {
          type: "button",
          onclick: () => download(`cues.${cueLang}.json`, `${JSON.stringify(cues, null, 2)}\n`),
        }, t.cuesExport),
      ),
      status,
      list,
    ),
  );
  refresh();
}

export function startCalibration(root: HTMLElement, t: Strings, strip: Strip, layer: Layer, scenes: Scene[]): void {
  const starts = [...layer.scene_starts];
  let next = 0;
  const banner = h("p", { class: "calibrate-next", "aria-live": "polite" });
  const output = h("textarea", { class: "calibrate-output", rows: 3, readonly: true });
  const refresh = () => {
    banner.textContent = next < scenes.length ? `${t.calibrateNext} ${scenes[next].n} — ${scenes[next].title.fr}` : "✓";
    output.value = `scene_starts: [${starts.map((x) => Math.round(x)).join(", ")}]`;
  };
  strip.viewer.addHandler("canvas-click", (event) => {
    // A quick click marks; a drag is a pan.
    if (!event.quick || next >= scenes.length) return;
    event.preventDefaultAction = true;
    const x = Math.round(strip.xFromPixel(event.position));
    starts[next] = x;
    strip.addMarker(h("div", { class: "calibrate-marker" }, String(scenes[next].n)), x);
    next += 1;
    refresh();
  });
  root.prepend(
    h(
      "section",
      { class: "tool tool-calibrate" },
      h("h1", {}, t.calibrateTitle),
      h("p", {}, t.calibrateHelp),
      banner,
      output,
      h("button", { type: "button", onclick: () => void navigator.clipboard.writeText(output.value) }, t.calibrateCopy),
    ),
  );
  refresh();
}
