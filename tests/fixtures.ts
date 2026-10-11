import type { Layer } from "../src/types";

/** A small layer: 4 scenes over 1000 px. */
export const testLayer: Layer = {
  id: "test",
  credit: { title: "", file_page: "", author: "", licence: "" },
  source_url: "",
  width: 1000,
  height: 100,
  tile_width: 250,
  available: false,
  calibrated: false,
  scene_starts: [0, 100, 400, 700],
};
