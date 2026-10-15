// A thin overview of the whole strip with the visible window, the notes (a dot in each lens's colour, shown for
// the lenses selected) and the main events; click or drag to travel.
import { h } from "./dom";
import { clamp, scenePoint, sceneRange } from "./layout";
import type { Lang, Layer, Milestone, Scene } from "./types";

export class Minimap {
  readonly el: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly window: HTMLDivElement;
  private readonly ticks: { x: number; el: HTMLButtonElement }[] = [];
  private readonly noteRow: HTMLDivElement;
  private readonly dots: { lens: string; el: HTMLButtonElement }[] = [];

  constructor(
    private readonly layer: Layer,
    scenes: Scene[],
    milestones: Milestone[],
    lang: Lang,
    labels: { overview: string; milestones: string },
    onSeek: (x: number, smooth: boolean) => void,
  ) {
    this.window = h("div", { class: "minimap-window" });
    this.bar = h("div", { class: "minimap", role: "presentation", title: labels.overview });
    if (layer.available) {
      this.bar.append(h("img", { class: "minimap-image", src: `tiles/${layer.id}/overview.jpg`, alt: "" }));
    } else {
      for (const scene of scenes) {
        const [x0, x1] = sceneRange(layer, scene.n);
        this.bar.append(
          h("div", {
            class: `minimap-scene ${scene.n % 2 ? "odd" : "even"}`,
            style: `left:${(x0 / layer.width) * 100}%;width:${((x1 - x0) / layer.width) * 100}%`,
          }),
        );
      }
    }
    this.bar.append(this.window);

    // Main events: small ticks just under the bar; the label shows on hover or focus (a legend would crowd the page).
    const events = h(
      "ol",
      { class: "milestones", "aria-label": labels.milestones },
      ...milestones.map((m) => {
        const x = scenePoint(layer, m.scene, m.at ?? 0.5);
        const share = x / layer.width;
        const tick = h("button", {
          type: "button",
          class: `milestone-tick${share > 0.85 ? " end" : share < 0.15 ? " start" : ""}`,
          "data-label": m.label[lang],
          "aria-label": m.label[lang],
          onclick: () => onSeek(x, true),
        });
        this.ticks.push({ x, el: tick });
        return h("li", { style: `left:${share * 100}%` }, tick);
      }),
    );

    let dragging = false;
    const seek = (e: PointerEvent, smooth: boolean) => {
      const rect = this.bar.getBoundingClientRect();
      onSeek(clamp((e.clientX - rect.left) / rect.width, 0, 1) * layer.width, smooth);
    };
    this.bar.addEventListener("pointerdown", (e) => {
      dragging = true;
      this.bar.setPointerCapture(e.pointerId);
      seek(e, false);
    });
    this.bar.addEventListener("pointermove", (e) => dragging && seek(e, false));
    this.bar.addEventListener("pointerup", () => (dragging = false));
    this.noteRow = h("div", { class: "minimap-notes" });
    this.el = h("div", { class: "minimap-wrap" }, this.bar, this.noteRow, events);
    this.onSeek = onSeek;
  }

  private readonly onSeek: (x: number, smooth: boolean) => void;

  /** A dot for each note, in its lens's colour, under the overview; a click travels to the note. */
  setNotes(items: { x: number; lens: string; title: string }[]): void {
    for (const item of items) {
      const dot = h("button", {
        type: "button",
        class: `minimap-dot lens-${item.lens}`,
        style: `left:${(item.x / this.layer.width) * 100}%`,
        title: item.title,
        "aria-label": item.title,
        onclick: () => this.onSeek(item.x, true),
      });
      this.dots.push({ lens: item.lens, el: dot });
      this.noteRow.append(dot);
    }
  }

  /** Shows the dots of the selected lenses only. */
  filterNotes(lenses: readonly string[]): void {
    for (const dot of this.dots) dot.el.classList.toggle("hidden", !lenses.includes(dot.lens));
  }

  update(centre: number, visibleWidth: number): void {
    const w = this.layer.width;
    const left = clamp(centre - visibleWidth / 2, 0, w);
    const right = clamp(centre + visibleWidth / 2, 0, w);
    this.window.style.left = `${(left / w) * 100}%`;
    this.window.style.width = `${((right - left) / w) * 100}%`;
    // The event in view keeps its label shown, so the ticks are not hover-only.
    const current = this.ticks.find((tick) => tick.x >= left && tick.x <= right);
    for (const tick of this.ticks) tick.el.classList.toggle("current", tick === current);
  }
}
