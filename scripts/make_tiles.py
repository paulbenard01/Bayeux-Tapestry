"""Cut the Wikimedia Commons panorama of the Bayeux Tapestry into web tiles.

Usage: python scripts/make_tiles.py [path-or-url]

Downloads the public-domain Commons file once (descriptive User-Agent, cached in assets/raw/),
writes public/tiles/commons/NN.jpg (tile_width wide, metadata stripped) and overview.jpg for the
mini-map, then sets `available: true` and the real size in layers/commons.yaml.
Never point this at the Bayeux Museum's panorama: its terms forbid extracting images.
"""

import re
import sys
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SOURCE_URL = "https://upload.wikimedia.org/wikipedia/commons/f/fe/Tapisserie_de_Bayeux_31109.jpg"
USER_AGENT = "BayeuxTapestryApp/0.1 (https://github.com/paulbenard01/bayeux-tapestry)"
CACHE = ROOT / "assets" / "raw" / "Tapisserie_de_Bayeux_31109.jpg"
OUT = ROOT / "public" / "tiles" / "commons"
LAYER = ROOT / "layers" / "commons.yaml"
OVERVIEW_WIDTH = 4000
QUALITY = 85

Image.MAX_IMAGE_PIXELS = None  # a 30,000 px strip is expected


def fetch(source: str) -> Path:
    if not source.startswith("http"):
        return Path(source)
    if not CACHE.exists():
        CACHE.parent.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(source, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=120) as response:
            CACHE.write_bytes(response.read())
    return CACHE


def tile_width() -> int:
    match = re.search(r"^tile_width: (\d+)$", LAYER.read_text(), re.M)
    if not match:
        raise SystemExit("tile_width missing from layers/commons.yaml")
    return int(match.group(1))


def update_layer(width: int, height: int) -> None:
    text = LAYER.read_text()
    text = re.sub(r"^width: \d+$", f"width: {width}", text, flags=re.M)
    text = re.sub(r"^height: \d+$", f"height: {height}", text, flags=re.M)
    text = re.sub(r"^available: \w+$", "available: true", text, flags=re.M)
    LAYER.write_text(text)


def main() -> None:
    path = fetch(sys.argv[1] if len(sys.argv) > 1 else SOURCE_URL)
    image = Image.open(path).convert("RGB")
    width, height = image.size
    step = tile_width()
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob("*.jpg"):
        old.unlink()
    for i, x in enumerate(range(0, width, step)):
        tile = image.crop((x, 0, min(x + step, width), height))
        tile.save(OUT / f"{i:02d}.jpg", "JPEG", quality=QUALITY, optimize=True, progressive=True)
    overview_height = max(1, round(height * OVERVIEW_WIDTH / width))
    image.resize((OVERVIEW_WIDTH, overview_height), Image.LANCZOS).save(
        OUT / "overview.jpg", "JPEG", quality=QUALITY, optimize=True
    )
    update_layer(width, height)
    print(f"{width}x{height}: {len(list(OUT.glob('[0-9]*.jpg')))} tiles in {OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
