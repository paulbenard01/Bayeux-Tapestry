"""Crops details of the embroidery for the afterlife slides, from our own deep-zoom tiles of the 2017 photography
(public domain on Wikimedia Commons, credited like the main image). Nothing is downloaded.

Run: python scripts/make_details.py  (writes public/media/details/<id>.jpg; needs Pillow and PyYAML)
"""

from pathlib import Path

import yaml
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
LAYER = yaml.safe_load((ROOT / "layers" / "bayeux2017.yaml").read_text())
LEVEL = 17  # 1,500 px high
TILE, OVERLAP = 510, 1
WIDTH = 1280

# id: ((scene, fraction across it), (scene, fraction)): where the crop starts and ends.
DETAILS = {
    "detail-cart": ((37, 0.35), (37, 1.0)),
    "detail-opening": ((1, 0.0), (1, 1.0)),
    "detail-comet": ((32, 0.25), (33, 1.0)),
    "detail-oath": ((23, 0.0), (23, 1.0)),
}


def scene_x(scene: int, at: float) -> float:
    starts = LAYER["scene_starts"]
    x0 = starts[scene - 1]
    x1 = starts[scene] if scene < len(starts) else LAYER["width"]
    return x0 + at * (x1 - x0)


def crop(x0: float, x1: float) -> Image.Image:
    """The band of the embroidery between source x0 and x1 (in layer units), from the tiles at LEVEL."""
    scale = 1500 / LAYER["height"]
    band = LAYER["band"]
    left, right = int(x0 * scale), int(x1 * scale)
    top, bottom = int(band["top"] * 1500), int(band["bottom"] * 1500)
    out = Image.new("RGB", (right - left, bottom - top))
    tiles = ROOT / "public" / "tiles" / LAYER["id"] / "image_files" / str(LEVEL)
    for col in range(left // TILE, right // TILE + 1):
        for row in range(top // TILE, bottom // TILE + 1):
            path = tiles / f"{col}_{row}.jpg"
            if not path.exists():
                continue
            # A tile's image starts one overlap pixel before its grid cell, except in the first row or column.
            x = col * TILE - (OVERLAP if col else 0)
            y = row * TILE - (OVERLAP if row else 0)
            out.paste(Image.open(path), (x - left, y - top))
    return out


if __name__ == "__main__":
    folder = ROOT / "public" / "media" / "details"
    folder.mkdir(parents=True, exist_ok=True)
    for name, (start, end) in DETAILS.items():
        image = crop(scene_x(*start), scene_x(*end))
        if image.width > WIDTH:
            image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
        image.save(folder / f"{name}.jpg", quality=82, optimize=True)
        print(name, image.size)
