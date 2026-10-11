"""Cut a public-domain panorama of the Bayeux Tapestry into web tiles for one image layer.

Usage: python scripts/make_tiles.py LAYER_ID [--height H]

Reads `source_url` from layers/LAYER_ID.yaml, downloads it once (descriptive User-Agent, streamed to
assets/raw/), optionally scales it to H pixels high (with libvips when installed, which streams huge
PNGs line by line; Pillow otherwise), writes public/tiles/LAYER_ID/NN.jpg (tile_width wide, metadata
stripped) and overview.jpg for the mini-map, then sets the real size and `available: true` in the layer.
Only use sources whose licence allows it (see CLAUDE.md, rule 1).
"""

import argparse
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
USER_AGENT = "BayeuxTapestryApp/0.1 (https://github.com/paulbenard01/Bayeux-Tapestry)"
RAW = ROOT / "assets" / "raw"
OVERVIEW_WIDTH = 4000
QUALITY = 82

Image.MAX_IMAGE_PIXELS = None  # panoramas are tens of thousands of pixels long


def layer_value(text: str, key: str) -> str:
    match = re.search(rf"^{key}: (.+)$", text, re.M)
    if not match:
        raise SystemExit(f"{key} missing from the layer file")
    return match.group(1).strip()


def fetch(url: str) -> Path:
    path = RAW / url.rsplit("/", 1)[-1]
    if not path.exists():
        RAW.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(request, timeout=600) as response, open(path, "wb") as out:
            shutil.copyfileobj(response, out, length=1 << 20)
    return path


def scaled(path: Path, height: int | None) -> Image.Image:
    if height is None:
        return Image.open(path).convert("RGB")
    out = RAW / f"{path.stem}-{height}.png"
    if not out.exists():
        if shutil.which("vips"):
            src_height = int(subprocess.check_output(["vipsheader", "-f", "height", str(path)]).decode())
            scale = height / src_height
            # Sequential access lets libvips stream a multi-gigabyte PNG instead of decoding it whole.
            subprocess.run(["vips", "resize", f"{path}[access=sequential]", str(out), str(scale)], check=True)
        else:
            image = Image.open(path)
            image.resize((round(image.width * height / image.height), height), Image.LANCZOS).save(out)
    image = Image.open(out)
    if image.mode == "RGBA":
        background = Image.new("RGB", image.size, "white")
        background.paste(image, mask=image.getchannel("A"))
        return background
    return image.convert("RGB")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("layer")
    parser.add_argument("--height", type=int)
    args = parser.parse_args()
    layer_file = ROOT / "layers" / f"{args.layer}.yaml"
    text = layer_file.read_text()
    image = scaled(fetch(layer_value(text, "source_url")), args.height)
    width, height = image.size
    step = int(layer_value(text, "tile_width"))
    out = ROOT / "public" / "tiles" / args.layer
    out.mkdir(parents=True, exist_ok=True)
    for old in out.glob("*.jpg"):
        old.unlink()
    for i, x in enumerate(range(0, width, step)):
        tile = image.crop((x, 0, min(x + step, width), height))
        tile.save(out / f"{i:02d}.jpg", "JPEG", quality=QUALITY, optimize=True, progressive=True)
    overview_height = max(1, round(height * OVERVIEW_WIDTH / width))
    image.resize((OVERVIEW_WIDTH, overview_height), Image.LANCZOS).save(
        out / "overview.jpg", "JPEG", quality=QUALITY, optimize=True
    )
    text = re.sub(r"^width: \d+$", f"width: {width}", text, flags=re.M)
    text = re.sub(r"^height: \d+$", f"height: {height}", text, flags=re.M)
    text = re.sub(r"^available: \w+$", "available: true", text, flags=re.M)
    layer_file.write_text(text)
    print(f"{args.layer}: {width}x{height}, {len(list(out.glob('[0-9]*.jpg')))} tiles")


if __name__ == "__main__":
    main()
