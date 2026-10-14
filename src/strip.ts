// The tapestry viewer: OpenSeadragon deep zoom, in the layer's coordinates (layer.width x layer.height).
// OpenSeadragon's viewport units make the image 1 wide, so a layer x maps to x / layer.width.
import OpenSeadragon from "openseadragon";
import { h } from "./dom";
import { boxToSource, clamp, scenePoint } from "./layout";
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

/** Where a marker sits in the embroidery band when it has no box: in the upper border, off the figures. */
const DEFAULT_MARKER_Y = 0.08;

export class Strip {
  readonly element: HTMLDivElement;
  readonly viewer: OpenSeadragon.Viewer;
  private readonly layer: Layer;
  private readonly markers = new Map<string, HTMLButtonElement>();
  private readonly highlight: HTMLDivElement;
  /** Zoom of the last height fit, to tell a resize from a reader's zoom. */
  private lastFit = 1;

  constructor(private readonly opts: StripOptions) {
    this.layer = opts.layer;
    this.element = h("div", { class: "viewer", role: "region", "aria-label": opts.label });
    this.highlight = h("div", { class: "note-highlight", "aria-hidden": "true" });
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
      this.buildMarkers();
      opts.onChange();
    });
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

  /** Marker position for a note, in layer units. */
  notePoint(note: Note): { x: number; y: number } {
    if (note.box) {
      // On the top edge of the box, so the marker does not hide what the note is about.
      const box = boxToSource(this.layer, note.scene, note.box);
      return { x: box.x + box.w / 2, y: box.y };
    }
    const band = this.layer.band;
    const yInBand = note.y ?? DEFAULT_MARKER_Y;
    return {
      x: scenePoint(this.layer, note.scene, note.at),
      y: (band.top + yInBand * (band.bottom - band.top)) * this.layer.height,
    };
  }

  private buildMarkers(): void {
    this.opts.notes.forEach((note, i) => {
      const { x, y } = this.notePoint(note);
      const marker = h(
        "button",
        {
          type: "button",
          class: `note-marker lens-${note.lens}`,
          "aria-label": note.title[this.opts.lang],
          title: note.title[this.opts.lang],
          "data-note": note.id,
        },
        String(i + 1),
      );
      // OpenSeadragon's mouse tracker swallows plain clicks on overlays; its own handler gets them.
      new OpenSeadragon.MouseTracker({
        element: marker,
        clickHandler: () => this.opts.onNote(note),
      });
      marker.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          this.opts.onNote(note);
        }
      });
      this.markers.set(note.id, marker);
      this.viewer.addOverlay({
        element: marker,
        location: new OpenSeadragon.Point(x / this.w, y / this.w),
        placement: OpenSeadragon.Placement.CENTER,
      });
    });
    this.viewer.addOverlay({ element: this.highlight, location: new OpenSeadragon.Rect(0, 0, 0, 0) });
  }

  /** Shows only markers whose note passes the filter. */
  filterMarkers(visible: (note: Note) => boolean): void {
    for (const note of this.opts.notes) {
      this.markers.get(note.id)?.classList.toggle("hidden", !visible(note));
    }
  }

  /** Outlines a note's box (or clears it) and marks its marker as selected. */
  select(note: Note | null): void {
    for (const [id, marker] of this.markers) marker.classList.toggle("selected", id === note?.id);
    if (note?.box) {
      this.viewer.updateOverlay(this.highlight, this.toRect(boxToSource(this.layer, note.scene, note.box)));
      this.highlight.classList.add("visible");
    } else {
      this.highlight.classList.remove("visible");
    }
  }

  /** Adds a thin vertical marker at x (calibration tool). */
  addMarker(el: HTMLElement, x: number): void {
    this.viewer.addOverlay({
      element: el,
      location: new OpenSeadragon.Rect(x / this.w, 0, 0.5 / this.w, this.layer.height / this.w),
    });
  }
}
