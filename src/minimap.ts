// A thin overview of the whole strip with the visible window and the main events; click or drag to travel.
import { h } from "./dom";
import { clamp, scenePoint, sceneRange } from "./layout";
import type { Lang, Layer, Milestone, Scene } from "./types";

export class Minimap {
  readonly el: HTMLDivElement;
  private readonly bar: HTMLDivElement;
  private readonly window: HTMLDivElement;

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

    // Main events: a numbered tick on the bar, and a legend of buttons under it (labels would collide).
    const events = h(
      "ol",
      { class: "milestones", "aria-label": labels.milestones },
      ...milestones.map((m, i) => {
        const x = scenePoint(layer, m.scene, m.at ?? 0.5);
        this.bar.append(
          h("span", { class: "milestone-tick", style: `left:${(x / layer.width) * 100}%`, "aria-hidden": "true" }, String(i + 1)),
        );
        return h(
          "li",
          {},
          h("button", { type: "button", onclick: () => onSeek(x, true) }, h("span", { class: "num" }, String(i + 1)), m.label[lang]),
        );
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
    this.el = h("div", { class: "minimap-wrap" }, this.bar, events);
  }

  update(centre: number, visibleWidth: number): void {
    const w = this.layer.width;
    const left = clamp(centre - visibleWidth / 2, 0, w);
    const right = clamp(centre + visibleWidth / 2, 0, w);
    this.window.style.left = `${(left / w) * 100}%`;
    this.window.style.width = `${((right - left) / w) * 100}%`;
  }
}
