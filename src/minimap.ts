// A thin overview of the whole strip with the visible window; click or drag to travel.
import { clamp, sceneRange } from "./layout";
import { h } from "./dom";
import type { Layer, Scene } from "./types";

export class Minimap {
  readonly el: HTMLDivElement;
  private readonly window: HTMLDivElement;

  constructor(
    private readonly layer: Layer,
    scenes: Scene[],
    label: string,
    onSeek: (x: number) => void,
  ) {
    this.window = h("div", { class: "minimap-window" });
    this.el = h("div", { class: "minimap", role: "presentation", title: label });
    if (layer.available) {
      this.el.append(h("img", { class: "minimap-image", src: `tiles/${layer.id}/overview.jpg`, alt: "" }));
    } else {
      for (const scene of scenes) {
        const [x0, x1] = sceneRange(layer, scene.n);
        this.el.append(
          h("div", {
            class: `minimap-scene ${scene.n % 2 ? "odd" : "even"}`,
            style: `left:${(x0 / layer.width) * 100}%;width:${((x1 - x0) / layer.width) * 100}%`,
          }),
        );
      }
    }
    this.el.append(this.window);
    let dragging = false;
    const seek = (e: PointerEvent) => {
      const rect = this.el.getBoundingClientRect();
      onSeek(clamp((e.clientX - rect.left) / rect.width, 0, 1) * layer.width);
    };
    this.el.addEventListener("pointerdown", (e) => {
      dragging = true;
      this.el.setPointerCapture(e.pointerId);
      seek(e);
    });
    this.el.addEventListener("pointermove", (e) => dragging && seek(e));
    this.el.addEventListener("pointerup", () => (dragging = false));
  }

  update(centre: number, visibleWidth: number): void {
    const w = this.layer.width;
    const left = clamp(centre - visibleWidth / 2, 0, w);
    const right = clamp(centre + visibleWidth / 2, 0, w);
    this.window.style.left = `${(left / w) * 100}%`;
    this.window.style.width = `${((right - left) / w) * 100}%`;
  }
}
