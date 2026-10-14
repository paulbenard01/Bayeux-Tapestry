import { describe, expect, it } from "vitest";
import { slideFromHash } from "../src/afterlife";
import { localPath } from "../src/media";
import { notesInRange, toggleLens } from "../src/notes-panel";
import { LENSES, type Note } from "../src/types";

const note = (id: string, lens: Note["lens"]): Note => ({
  id,
  lens,
  scene: 1,
  at: 0,
  title: { fr: "", en: "" },
  summary: { fr: "", en: "" },
  sources: [],
  review_status: "unreviewed",
  lang_review: "draft",
});

describe("notesInRange", () => {
  const notes = [note("a", "art"), note("b", "history"), note("c", "art"), note("d", "material")];
  const x: Record<string, number> = { a: 50, b: 10, c: 300, d: 120 };
  const xOf = (n: Note) => x[n.id];

  it("keeps notes whose marker is in view, in strip order", () => {
    expect(notesInRange(notes, xOf, 0, 200, LENSES).map((n) => n.id)).toEqual(["b", "a", "d"]);
  });
  it("filters by lenses", () => {
    expect(notesInRange(notes, xOf, 0, 400, ["art"]).map((n) => n.id)).toEqual(["a", "c"]);
    expect(notesInRange(notes, xOf, 0, 400, ["art", "material"]).map((n) => n.id)).toEqual(["a", "d", "c"]);
    expect(notesInRange(notes, xOf, 0, 400, [])).toEqual([]);
  });
  it("includes the edges and returns nothing for an empty stretch", () => {
    expect(notesInRange(notes, xOf, 120, 120, LENSES).map((n) => n.id)).toEqual(["d"]);
    expect(notesInRange(notes, xOf, 500, 900, LENSES)).toEqual([]);
  });
});

describe("toggleLens", () => {
  it("turns one lens off and on again, keeping lens order", () => {
    const off = toggleLens(LENSES, "art");
    expect(off).not.toContain("art");
    expect(toggleLens(off, "art")).toEqual([...LENSES]);
  });
  it("makes all clear everything when all are on, and bring everything back otherwise", () => {
    expect(toggleLens(LENSES, null)).toEqual([]);
    expect(toggleLens([], null)).toEqual([...LENSES]);
    expect(toggleLens(["art"], null)).toEqual([...LENSES]);
  });
});

describe("localPath", () => {
  it("fills in the language of bilingual map clips", () => {
    expect(localPath("media/maps/brittany.{lang}.mp4", "fr")).toBe("media/maps/brittany.fr.mp4");
    expect(localPath("media/woad.jpg", "en")).toBe("media/woad.jpg");
  });
});

describe("slideFromHash", () => {
  it("reads a 1-based slide number, falling back to the first slide", () => {
    expect(slideFromHash("#3", 15)).toBe(2);
    expect(slideFromHash("", 15)).toBe(0);
    expect(slideFromHash("#99", 15)).toBe(0);
    expect(slideFromHash("#x", 15)).toBe(0);
  });
});
