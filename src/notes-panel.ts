// Notes under the tapestry: lens filter, cards for the stretch in view, and the open note in full.
import { sceneByNumber } from "./content";
import { h } from "./dom";
import type { Strings } from "./i18n";
import { renderMedia } from "./media";
import { sourceList } from "./sources";
import { LENSES, type Lang, type Lens, type Note } from "./types";

/** Notes whose marker lies in [from, to], in strip order, optionally for one lens. */
export function notesInRange(
  notes: Note[],
  xOf: (note: Note) => number,
  from: number,
  to: number,
  lens: Lens | null,
): Note[] {
  return notes
    .filter((n) => (lens === null || n.lens === lens) && xOf(n) >= from && xOf(n) <= to)
    .sort((a, b) => xOf(a) - xOf(b));
}

export interface NotesPanelOptions {
  notes: Note[];
  lang: Lang;
  t: Strings;
  lens: Lens | null;
  onLens: (lens: Lens | null) => void;
  onOpen: (note: Note | null) => void;
  onShow: (note: Note) => void;
}

export class NotesPanel {
  readonly el: HTMLElement;
  readonly lensBar: HTMLElement;
  private readonly body: HTMLElement;
  private lens: Lens | null;
  private open: Note | null = null;
  private inView: Note[] = [];

  constructor(private readonly opts: NotesPanelOptions) {
    this.lens = opts.lens;
    this.lensBar = h("div", { class: "lens-bar", role: "group", "aria-label": opts.t.lensLabel });
    this.body = h("div", { class: "notes-body" });
    this.el = h("section", { class: "notes-panel", "aria-live": "polite" }, this.body);
    this.renderLensBar();
  }

  get currentLens(): Lens | null {
    return this.lens;
  }

  get openNote(): Note | null {
    return this.open;
  }

  private renderLensBar(): void {
    const { t, notes } = this.opts;
    const chip = (lens: Lens | null, label: string) => {
      const count = lens ? notes.filter((n) => n.lens === lens).length : notes.length;
      return h(
        "button",
        {
          type: "button",
          class: `lens-chip ${lens ? `lens-${lens}` : "lens-all"}`,
          title: `${count} ${t.notesLabel.toLowerCase()}`,
          "aria-pressed": String(this.lens === lens),
          onclick: () => {
            this.lens = lens;
            this.renderLensBar();
            this.opts.onLens(lens);
          },
        },
        label,
      );
    };
    this.lensBar.replaceChildren(
      h("span", { class: "lens-bar-label" }, t.notesLabel),
      chip(null, t.lensAll),
      ...LENSES.map((lens) => chip(lens, t.lenses[lens])),
    );
  }

  /** Updates the list of notes in view (ignored while a note is open). */
  showInView(notes: Note[]): void {
    const same = notes.length === this.inView.length && notes.every((n, i) => n === this.inView[i]);
    this.inView = notes;
    if (this.open || (same && this.body.childElementCount > 0)) return;
    const { t, lang } = this.opts;
    if (notes.length === 0) {
      this.body.replaceChildren(h("h2", {}, t.notesInView), h("p", { class: "empty" }, t.notesNone));
      return;
    }
    this.body.replaceChildren(
      h("h2", {}, t.notesInView),
      h(
        "ul",
        { class: "note-cards" },
        ...notes.map((note) =>
          h(
            "li",
            { class: `note-card lens-${note.lens}` },
            h("p", { class: "lens-tag" }, t.lenses[note.lens]),
            h("h3", {}, note.title[lang]),
            h("p", {}, note.summary[lang]),
            h(
              "button",
              { type: "button", class: "link", onclick: () => this.show(note, true) },
              note.sections || note.media ? t.readMore : t.showOnTapestry,
            ),
          ),
        ),
      ),
    );
  }

  /** Opens a note in full (from a marker or a card). */
  show(note: Note, fromCard = false): void {
    const { t, lang } = this.opts;
    this.open = note;
    const scene = sceneByNumber(note.scene);
    const sources = [...new Set([...note.sources, ...(note.sections ?? []).flatMap((s) => s.sources)])];
    this.body.replaceChildren(
      h(
        "article",
        { class: `note-detail lens-${note.lens}` },
        h(
          "div",
          { class: "note-detail-head" },
          h("button", { type: "button", class: "link", onclick: () => this.close() }, `← ${t.backToNotes}`),
          h("button", { type: "button", class: "link", onclick: () => this.opts.onShow(note) }, t.showOnTapestry),
        ),
        h("p", { class: "lens-tag" }, t.lenses[note.lens]),
        h("h2", {}, note.title[lang]),
        h("p", { class: "panel-scene" }, `${t.scene} ${scene.n} · `, h("em", {}, scene.title[lang])),
        h("p", { class: "summary" }, note.summary[lang]),
        ...(note.media ?? []).map((id) => renderMedia(id, lang, t)),
        ...(note.sections ?? []).flatMap((s) => [h("h3", {}, s.heading[lang]), h("p", {}, s.text[lang])]),
        h("h3", {}, t.sources),
        sourceList(sources),
      ),
    );
    this.opts.onOpen(note);
    if (fromCard) this.opts.onShow(note);
  }

  close(): void {
    this.open = null;
    this.opts.onOpen(null);
    const notes = this.inView;
    this.inView = [];
    this.showInView(notes);
  }
}
