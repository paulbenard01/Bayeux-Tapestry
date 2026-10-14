// Downloads the Commons media listed in content/media.yaml into public/ (run by the Media workflow).
// Usage: node scripts/fetch_media.mjs [id ...]
//
// Images: a `width`-px thumbnail from Wikimedia's thumbnail service, re-encoded as JPEG with metadata
// stripped (libvips). Audio: the original file, converted to mono 96 kbps MP3 (ffmpeg) so every browser
// plays it. Existing files are kept; delete one to fetch it again. Descriptive User-Agent, polite pauses.
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import yaml from "js-yaml";

const ROOT = new URL("..", import.meta.url).pathname;
const USER_AGENT = "BayeuxTapestryApp/0.1 (https://github.com/paulbenard01/Bayeux-Tapestry)";
const STANDARD_WIDTHS = [330, 500, 960, 1280, 1920];

export function commonsPath(title) {
  const name = title.replace(/^File:/, "").replaceAll(" ", "_");
  const digest = createHash("md5").update(name).digest("hex");
  return { name, dir: `${digest[0]}/${digest.slice(0, 2)}` };
}

export function thumbUrl(title, width) {
  const { name, dir } = commonsPath(title);
  const q = encodeURIComponent(name);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${q}/${width}px-${q}`;
}

export function originalUrl(title) {
  const { name, dir } = commonsPath(title);
  return `https://upload.wikimedia.org/wikipedia/commons/${dir}/${encodeURIComponent(name)}`;
}

async function download(url) {
  for (let attempt = 1; attempt <= 4; attempt++) {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (response.ok) return Buffer.from(await response.arrayBuffer());
    if (response.status !== 429 || attempt === 4) throw new Error(`${response.status} for ${url}`);
    await new Promise((r) => setTimeout(r, 5000 * attempt));
  }
  throw new Error("unreachable");
}

async function main() {
  const wanted = new Set(process.argv.slice(2));
  const media = yaml.load(readFileSync(join(ROOT, "content/media.yaml"), "utf8"));
  for (const [id, item] of Object.entries(media)) {
    if (!item.commons || (wanted.size && !wanted.has(id))) continue;
    const out = join(ROOT, "public", item.file);
    if (existsSync(out)) continue;
    mkdirSync(dirname(out), { recursive: true });
    const tmp = `${out}.download`;
    if (item.kind === "image") {
      const width = item.width ?? 1280;
      if (!STANDARD_WIDTHS.includes(width)) throw new Error(`${id}: width must be one of ${STANDARD_WIDTHS}`);
      writeFileSync(tmp, await download(thumbUrl(item.commons, width)));
      execFileSync("vips", ["copy", tmp, `${out}[Q=82,strip]`]);
    } else if (item.kind === "audio") {
      writeFileSync(tmp, await download(originalUrl(item.commons)));
      execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", tmp, "-ac", "1", "-b:a", "96k", "-map_metadata", "-1", out]);
    }
    unlinkSync(tmp);
    console.log(`${id}: public/${item.file}`);
    await new Promise((r) => setTimeout(r, 1500));
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
