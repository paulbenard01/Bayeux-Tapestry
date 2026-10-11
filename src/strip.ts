// The horizontal strip: tiles (or a placeholder), hotspots, and scrolling in source-pixel terms.
import { boxToSource, clamp, sceneRange } from "./layout";
import { h } from "./dom";
import type { Hotspot, Lang, Layer, Scene } from "./types";

const TILE_DIR = "tiles";

export interface StripOptions {
  layer: Layer;
  scenes: Scene[];
  hotspots: Hotspot[];
  lang: Lang;
  label: string;
  onHotspot: (hotspot: Hotspot) => void;
}

export class Strip {
  readonly viewport: HTMLDivElement;
  private readonly track: HTMLDivElement;
  private readonly layer: Layer;
  private readonly tiles: HTMLImageElement[] = [];
  private readonly positioned: { el: HTMLElement; x: number; y: number; w: number; h: number }[] = [];
  /** Display pixels per source pixel. */
  scale = 1;
  /** Blank space before and after the strip, so the first and last scenes can be centred. */
  private pad = 0;

  constructor(private readonly opts: StripOptions) {
    this.layer = opts.layer;
    this.track = h("div", { class: "track" });
    this.viewport = h("div", {
      class: "viewport",
      tabindex: 0,
      role: "region",
      "aria-label": opts.label,
    });
    this.viewport.append(this.track);
    if (this.layer.available) this.buildTiles();
    else this.buildPlaceholder();
    this.buildHotspots();
    this.viewport.addEventListener("scroll", () => this.loadVisibleTiles(), { passive: true });
  }

  private buildTiles(): void {
    const count = Math.ceil(this.layer.width / this.layer.tile_width);
    for (let i = 0; i < count; i++) {
      const w = Math.min(this.layer.tile_width, this.layer.width - i * this.layer.tile_width);
      const img = h("img", { class: "tile", alt: "", decoding: "async", draggable: "false" });
      img.dataset.src = `${TILE_DIR}/${this.layer.id}/${String(i).padStart(2, "0")}.jpg`;
      this.tiles.push(img);
      this.track.append(img);
      this.positioned.push({ el: img, x: i * this.layer.tile_width, y: 0, w, h: this.layer.height });
    }
  }

  /** Until the image is available, each scene is drawn as a labelled panel. */
  private buildPlaceholder(): void {
    for (const scene of this.opts.scenes) {
      const [x0, x1] = sceneRange(this.layer, scene.n);
      const el = h(
        "div",
        { class: `placeholder ${scene.n % 2 ? "odd" : "even"}`, "aria-hidden": "true" },
        h("span", { class: "placeholder-n" }, String(scene.n)),
        h("span", { class: "placeholder-title" }, scene.title[this.opts.lang]),
      );
      this.track.append(el);
      this.positioned.push({ el, x: x0, y: 0, w: x1 - x0, h: this.layer.height });
    }
  }

  private buildHotspots(): void {
    for (const hotspot of this.opts.hotspots) {
      const box = boxToSource(this.layer, hotspot.scene, hotspot.box);
      const el = h(
        "button",
        { class: "hotspot", type: "button", onclick: () => this.opts.onHotspot(hotspot) },
        h("span", { class: "hotspot-chip" }, "+ ", hotspot.title[this.opts.lang]),
      );
      this.track.append(el);
      this.positioned.push({ el, ...box });
    }
  }

  /** Adds an element positioned in source pixels (used by the calibration tool). */
  addMarker(el: HTMLElement, x: number): void {
    this.track.append(el);
    this.positioned.push({ el, x, y: 0, w: 0, h: this.layer.height });
    this.place(this.positioned[this.positioned.length - 1]);
  }

  /** Fits the strip to a display height in pixels, keeping the same centre. */
  resize(displayHeight: number): void {
    const centre = this.centre();
    this.scale = displayHeight / this.layer.height;
    this.pad = this.viewport.clientWidth / 2;
    this.track.style.width = `${this.layer.width * this.scale + 2 * this.pad}px`;
    this.track.style.height = `${displayHeight}px`;
    for (const item of this.positioned) this.place(item);
    this.setCentre(centre);
    this.loadVisibleTiles();
  }

  private place(item: { el: HTMLElement; x: number; y: number; w: number; h: number }): void {
    const s = this.scale;
    Object.assign(item.el.style, {
      left: `${this.pad + item.x * s}px`,
      top: `${item.y * s}px`,
      width: `${item.w * s}px`,
      height: `${item.h * s}px`,
    });
  }

  /** Source x at the centre of the viewport. */
  centre(): number {
    return this.scale > 0 ? this.viewport.scrollLeft / this.scale : 0;
  }

  /** Width of the viewport in source pixels. */
  visibleWidth(): number {
    return this.viewport.clientWidth / this.scale;
  }

  setCentre(x: number, smooth = false): void {
    const left = clamp(x, 0, this.layer.width) * this.scale;
    if (smooth) this.viewport.scrollTo({ left, behavior: "smooth" });
    else this.viewport.scrollLeft = left;
  }

  /** Source x for a pointer event on the track. */
  sourceXFromEvent(e: MouseEvent): number {
    const rect = this.viewport.getBoundingClientRect();
    return (this.viewport.scrollLeft + e.clientX - rect.left - this.pad) / this.scale;
  }

  private loadVisibleTiles(): void {
    if (this.tiles.length === 0) return;
    const margin = this.visibleWidth();
    const from = this.centre() - this.visibleWidth() / 2 - margin;
    const to = this.centre() + this.visibleWidth() / 2 + margin;
    this.tiles.forEach((img, i) => {
      const x0 = i * this.layer.tile_width;
      if (!img.src && x0 + this.layer.tile_width >= from && x0 <= to && img.dataset.src) {
        img.src = img.dataset.src;
      }
    });
  }
}
