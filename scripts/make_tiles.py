"""Build the deep-zoom image (DZI pyramid) and mini-map overview for one image layer.

Usage: python scripts/make_tiles.py LAYER_ID [--source PATH]

Reads `source_url` and `zoom_height` from layers/LAYER_ID.yaml, downloads the source once
(descriptive User-Agent, streamed to assets/raw/), scales it to `zoom_height` pixels high and writes
public/tiles/LAYER_ID/image.dzi + image_files/ (512 px JPEG tiles, metadata stripped) and overview.jpg.
Needs libvips (`vips`), which streams multi-gigabyte PNGs line by line.

The layer's `width`/`height` are the coordinate system that scenes, notes and boxes are written in; the
deep-zoom image only has to keep the same aspect ratio, which is checked here.
Only use sources whose licence allows it (see CLAUDE.md, rule 1).
"""

import argparse
import re
import shutil
import subprocess
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
USER_AGENT = "BayeuxTapestryApp/0.1 (https://github.com/paulbenard01/Bayeux-Tapestry)"
RAW = ROOT / "assets" / "raw"
OVERVIEW_WIDTH = 4000
TILE_SIZE = 510  # plus a 1 px overlap on each side: 512 px files
QUALITY = 80


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


def header(path: Path, field: str) -> int:
    return int(subprocess.check_output(["vipsheader", "-f", field, str(path)]).decode())


def vips(*args: str) -> None:
    subprocess.run(["vips", *args], check=True)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("layer")
    parser.add_argument("--source", help="local file instead of the layer's source_url")
    args = parser.parse_args()
    layer_file = ROOT / "layers" / f"{args.layer}.yaml"
    text = layer_file.read_text()
    source = Path(args.source) if args.source else fetch(layer_value(text, "source_url"))
    zoom_height = int(layer_value(text, "zoom_height"))
    RAW.mkdir(parents=True, exist_ok=True)

    # Scale (sequential access streams the PNG), then drop any alpha onto white.
    scaled = RAW / f"{args.layer}-{zoom_height}.v"
    scale = zoom_height / header(source, "height")
    vips("resize", f"{source}[access=sequential]", str(scaled), str(scale))
    if header(scaled, "bands") == 4:
        flat = RAW / f"{args.layer}-{zoom_height}-flat.v"
        vips("flatten", str(scaled), str(flat), "--background", "255")
        scaled = flat

    width, height = header(scaled, "width"), header(scaled, "height")
    layer_ratio = int(layer_value(text, "width")) / int(layer_value(text, "height"))
    if abs(width / height - layer_ratio) / layer_ratio > 0.005:
        raise SystemExit(f"aspect ratio {width}x{height} does not match the layer's coordinates")

    out = ROOT / "public" / "tiles" / args.layer
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    vips(
        "dzsave",
        str(scaled),
        str(out / "image"),
        "--tile-size",
        str(TILE_SIZE),
        "--overlap",
        "1",
        "--suffix",
        f".jpg[Q={QUALITY},strip]",
    )
    vips("thumbnail", str(scaled), str(out / f"overview.jpg[Q={QUALITY},strip]"), str(OVERVIEW_WIDTH))
    text = re.sub(r"^available: \w+$", "available: true", text, flags=re.M)
    layer_file.write_text(text)
    files = sum(1 for _ in (out / "image_files").rglob("*.jpg"))
    print(f"{args.layer}: deep zoom {width}x{height}, {files} tiles")


if __name__ == "__main__":
    main()
