// The tapestry viewer: OpenSeadragon deep zoom, in the layer's coordinates (layer.width x layer.height).
// OpenSeadragon's viewport units make the image 1 wide, so a layer x maps to x / layer.width.
import OpenSeadragon from "openseadragon";
import { h } from "./dom";
import { boxToSource, clamp, inBox, noteBox } from "./layout";
import type { Box, Lang, Layer, Note } from "./types";

export interface StripOptions {
  layer: Layer;
  notes: Note[];
  lang: Lang;
  label: string;
  onNote: (note: Note) => void;
  /** Called on every viewport change (pan, zoom, animation frame). */
  onChange: () => void;
  /** Called when the user moves the view by hand (drag, wheel, pinch, keys handled elsewhere). */
  onUserMove: () => void;
}

export class Strip {
  readonly element: HTMLDivElement;
  readonly viewer: OpenSeadragon.Viewer;
  private readonly layer: Layer;
  /** Each note's frame on the image, and its rectangle in layer units for hit testing. */
  private readonly frames = new Map<string, { el: HTMLDivElement; rect: Box; note: Note }>();
  private hidden = new Set<string>();
  private hovered: string | null = null;
  /** Zoom of the last height fit, to tell a resize from a reader's zoom. */
  private lastFit = 1;

  constructor(private readonly opts: StripOptions) {
    this.layer = opts.layer;
    this.element = h("div", { class: "viewer", role: "region", "aria-label": opts.label });
    this.viewer = OpenSeadragon({
      element: this.element,
      tileSources: `tiles/${this.layer.id}/image.dzi`,
      showNavigationControl: false,
      visibilityRatio: 1,
      constrainDuringPan: true,
      // One screen pixel per deep-zoom pixel at most (two on high-density screens).
      maxZoomPixelRatio: 1,
      minZoomImageRatio: 1,
      animationTime: 0.8,
      springStiffness: 7,
      immediateRender: false,
      preserveViewport: true,
      gestureSettingsMouse: { scrollToZoom: true, clickToZoom: false, dblClickToZoom: true, flickEnabled: true },
      gestureSettingsTouch: { pinchToZoom: true, flickEnabled: true, clickToZoom: false, dblClickToZoom: true },
    });
    this.viewer.addHandler("open", () => {
      this.fitHeight(true);
      this.buildFrames();
      opts.onChange();
    });
    // Frames let the mouse through (so the embroidery still drags); a click (not a drag) inside one opens it.
    this.viewer.addHandler("canvas-click", (event) => {
      if (!event.quick) return;
      const hit = this.frameAt(event.position);
      if (hit) this.opts.onNote(hit);
    });
    this.element.addEventListener("pointermove", (e) => {
      if (!this.ready) return;
      const rect = this.element.getBoundingClientRect();
      const hit = this.frameAt(new OpenSeadragon.Point(e.clientX - rect.left, e.clientY - rect.top));
      this.setHovered(hit?.id ?? null);
    });
    this.element.addEventListener("pointerleave", () => this.setHovered(null));
    this.viewer.addHandler("viewport-change", () => opts.onChange());
    // The app handles the keyboard itself (scenes, tour, zoom).
    this.viewer.addHandler("canvas-key", (event) => {
      (event as unknown as { preventDefaultAction: boolean }).preventDefaultAction = true;
    });
    this.viewer.addHandler("canvas-drag", () => opts.onUserMove());
    this.viewer.addHandler("canvas-pinch", () => opts.onUserMove());
    // Horizontal swipes on a trackpad (or Shift + wheel) pan along the strip; vertical wheel zooms.
    this.viewer.addHandler("canvas-scroll", (event) => {
      const wheel = event.originalEvent as WheelEvent;
      opts.onUserMove();
      const dx = Math.abs(wheel.deltaX) > Math.abs(wheel.deltaY) ? wheel.deltaX : wheel.shiftKey ? wheel.deltaY : 0;
      if (dx !== 0) {
        (event as unknown as { preventDefaultAction: boolean }).preventDefaultAction = true;
        this.panByPixels(dx);
      }
    });
    // After a resize, refit the height unless the reader has zoomed in.
    this.viewer.addHandler("resize", () => {
      if (!this.ready) return;
      const zoomedIn = this.viewer.viewport.getZoom(true) > this.lastFit * 1.05;
      if (zoomedIn) this.viewer.viewport.applyConstraints(true);
      else this.fitHeight(true);
    });
  }

  /** Layer units per viewport unit. */
  private get w(): number {
    return this.layer.width;
  }

  private get ready(): boolean {
    return this.viewer.world.getItemCount() > 0;
  }

  /** Zoom at which the image height exactly fills the viewer. */
  private fitZoom(): number {
    // Measure the element itself: OpenSeadragon's cached container size can predate the element's layout.
    const width = this.element.clientWidth || 1;
    const height = this.element.clientHeight || 1;
    return height / (width * (this.layer.height / this.w));
  }

  /** Zooms so the full height fits, keeping (or moving to) the given centre. */
  fitHeight(immediately = false, x = this.centre()): void {
    const zoom = this.fitZoom();
    this.lastFit = zoom;
    // Never zoom out past the full height (minZoomLevel is a viewport option missing from the typings).
    (this.viewer.viewport as unknown as { minZoomLevel: number }).minZoomLevel = zoom * 0.999;
    this.viewer.viewport.zoomTo(zoom, undefined, immediately);
    this.setCentre(x, !immediately);
  }

  zoomBy(factor: number): void {
    this.viewer.viewport.zoomBy(factor);
    this.viewer.viewport.applyConstraints();
  }

  /** Layer x at the centre of the view. */
  centre(): number {
    return this.ready ? this.viewer.viewport.getCenter(true).x * this.w : 0;
  }

  /** Width of the view, in layer units. */
  visibleWidth(): number {
    return this.ready ? this.viewer.viewport.getBounds(true).width * this.w : this.w / 20;
  }

  /** Whether the view is zoomed in past fitting the height. */
  zoomedIn(): boolean {
    return this.ready && this.viewer.viewport.getZoom(true) > this.lastFit * 1.05;
  }

  setCentre(x: number, smooth = false): void {
    if (!this.ready) return;
    const centre = this.viewer.viewport.getCenter(true);
    const point = new OpenSeadragon.Point(clamp(x, 0, this.w) / this.w, centre.y);
    this.viewer.viewport.panTo(point, !smooth);
    this.viewer.viewport.applyConstraints(!smooth);
  }

  panByPixels(dx: number, dy = 0): void {
    const delta = this.viewer.viewport.deltaPointsFromPixels(new OpenSeadragon.Point(dx, dy));
    this.viewer.viewport.panBy(delta);
    this.viewer.viewport.applyConstraints();
  }

  /** Layer x of a pointer position given in viewer-element pixels. */
  xFromPixel(pixel: OpenSeadragon.Point): number {
    return this.viewer.viewport.pointFromPixel(pixel).x * this.w;
  }

  private toRect(box: Box): OpenSeadragon.Rect {
    return new OpenSeadragon.Rect(box.x / this.w, box.y / this.w, box.w / this.w, box.h / this.w);
  }

  /** A note's frame in layer units. */
  noteRect(note: Note): Box {
    return boxToSource(this.layer, note.scene, noteBox(note));
  }

  /** The centre of a note's frame, in layer units (for ordering and travelling to it). */
  notePoint(note: Note): { x: number; y: number } {
    const r = this.noteRect(note);
    return { x: r.x + r.w / 2, y: r.y + r.h / 2 };
  }

  private buildFrames(): void {
    for (const note of this.opts.notes) {
      const rect = this.noteRect(note);
      const el = h(
        "div",
        { class: `note-frame lens-${note.lens}`, "data-note": note.id, "aria-hidden": "true" },
        h("span", { class: "note-frame-label" }, note.title[this.opts.lang]),
      );
      this.frames.set(note.id, { el, rect, note });
      this.viewer.addOverlay({ element: el, location: this.toRect(rect) });
    }
  }

  /** The visible note whose frame contains the given viewer pixel; the smallest frame wins where they overlap. */
  private frameAt(pixel: OpenSeadragon.Point): Note | null {
    const p = this.viewer.viewport.pointFromPixel(pixel);
    const x = p.x * this.w;
    const y = p.y * this.w;
    let best: { note: Note; area: number } | null = null;
    for (const { rect, note } of this.frames.values()) {
      if (this.hidden.has(note.id) || !inBox(rect, x, y)) continue;
      const area = rect.w * rect.h;
      if (!best || area < best.area) best = { note, area };
    }
    return best?.note ?? null;
  }

  private setHovered(id: string | null): void {
    if (id === this.hovered) return;
    if (this.hovered) this.frames.get(this.hovered)?.el.classList.remove("hover");
    this.hovered = id;
    if (id) this.frames.get(id)?.el.classList.add("hover");
    this.element.classList.toggle("over-note", id !== null);
  }

  /** Shows only the frames whose note passes the filter. */
  filterMarkers(visible: (note: Note) => boolean): void {
    this.hidden = new Set(this.opts.notes.filter((n) => !visible(n)).map((n) => n.id));
    for (const [id, frame] of this.frames) frame.el.classList.toggle("hidden", this.hidden.has(id));
  }

  /** Marks the open note's frame (or clears it). */
  select(note: Note | null): void {
    for (const [id, frame] of this.frames) frame.el.classList.toggle("selected", id === note?.id);
  }

  /** Adds a thin vertical marker at x (calibration tool). */
  addMarker(el: HTMLElement, x: number): void {
    this.viewer.addOverlay({
      element: el,
      location: new OpenSeadragon.Rect(x / this.w, 0, 0.5 / this.w, this.layer.height / this.w),
    });
  }
}
