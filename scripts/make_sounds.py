"""Downloads the recorded sounds listed in content/sounds.yaml (CC0, OpenGameArt.org), cuts, loops and normalises
them, and writes public/audio/sfx/<id>.mp3 (mono). Downloads are cached in .cache/sounds/.

Run: python scripts/make_sounds.py   (needs ffmpeg, numpy and PyYAML)
"""

import io
import subprocess
import urllib.request
import zipfile
from pathlib import Path

import numpy as np
import yaml

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache" / "sounds"
OUT = ROOT / "public" / "audio" / "sfx"
SR = 44100
UA = "BayeuxTapestryApp/0.1 (non-commercial portfolio project)"


def fetch(url: str) -> bytes:
    path = CACHE / url.rsplit("/", 1)[1]
    if not path.exists():
        CACHE.mkdir(parents=True, exist_ok=True)
        request = urllib.request.Request(url, headers={"User-Agent": UA})
        path.write_bytes(urllib.request.urlopen(request, timeout=120).read())
    return path.read_bytes()


def decode(data: bytes) -> np.ndarray:
    """Any audio file -> mono float32 at SR."""
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", "pipe:0", "-ac", "1", "-ar", str(SR), "-f", "f32le", "pipe:1"],
        input=data, capture_output=True, check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def fade(x: np.ndarray, seconds_in: float, seconds_out: float) -> np.ndarray:
    n_in, n_out = int(SR * seconds_in), int(SR * seconds_out)
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)
    return x


def seamless(x: np.ndarray, overlap: float = 1.5) -> np.ndarray:
    """A loop whose end flows into its start: the last `overlap` seconds are crossfaded over the first."""
    n = int(SR * overlap)
    out = x[: len(x) - n].copy()
    ramp = np.linspace(0, 1, n)
    out[:n] = x[:n] * ramp + x[len(x) - n :] * (1 - ramp)
    return out


def normalise(x: np.ndarray, peak_db: float = -1.0) -> np.ndarray:
    peak = np.abs(x).max() or 1
    return x * (10 ** (peak_db / 20) / peak)


def sprite(clips: list[np.ndarray], every: float) -> np.ndarray:
    step = int(SR * every)
    out = np.zeros(step * len(clips), dtype=np.float32)
    for i, clip in enumerate(clips):
        clip = clip[:step]
        out[i * step : i * step + len(clip)] = clip
    return out


def build(spec: dict) -> np.ndarray:
    data = fetch(spec["url"])
    if "zip" in spec:
        archive = zipfile.ZipFile(io.BytesIO(data))
        clips = [fade(decode(archive.read(name)), 0, 0.05) for name in spec["zip"]]
        return sprite([normalise(c) for c in clips], spec["every"])
    x = decode(data)
    if "hits" in spec:
        length = int(SR * spec["hit"])
        clips = []
        for t in spec["hits"]:
            start = int(SR * t)
            clips.append(normalise(fade(x[start : start + length].copy(), 0.002, 0.04)))
        return sprite(clips, spec["every"])
    start, duration = spec.get("cut", [0, len(x) / SR])
    x = x[int(SR * start) : int(SR * (start + duration))].copy()
    if spec.get("loop"):
        return normalise(seamless(x))
    return normalise(fade(x, 0.005, 0.05))


def write_mp3(x: np.ndarray, path: Path) -> None:
    subprocess.run(
        ["ffmpeg", "-v", "error", "-y", "-f", "f32le", "-ar", str(SR), "-ac", "1", "-i", "pipe:0",
         "-codec:a", "libmp3lame", "-b:a", "80k", "-map_metadata", "-1", str(path)],
        input=x.astype(np.float32).tobytes(), check=True,
    )


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for sound_id, spec in yaml.safe_load((ROOT / "content" / "sounds.yaml").read_text()).items():
        audio = build(spec)
        write_mp3(audio, OUT / f"{sound_id}.mp3")
        print(f"{sound_id}: {len(audio) / SR:.1f} s")
