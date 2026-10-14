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

/** Percent-encodes a file name the way MediaWiki does (it keeps , ; : @ $ ! * ( ) ~ as they are). */
export function wikiEncode(name) {
  return encodeURIComponent(name).replace(/%(2C|3B|3A|40|24|21|2A|28|29|7E)/g, (m) => decodeURIComponent(m));
}

export function commonsPath(title) {
  const name = title.replace(/^File:/, "").replaceAll(" ", "_");
  const digest = createHash("md5").update(name).digest("hex");
  return { name, dir: `${digest[0]}/${digest.slice(0, 2)}` };
}

export function thumbUrl(title, width) {
  const { name, dir } = commonsPath(title);
  const q = wikiEncode(name);
  return `https://upload.wikimedia.org/wikipedia/commons/thumb/${dir}/${q}/${width}px-${q}`;
}

export function originalUrl(title) {
  const { name, dir } = commonsPath(title);
  return `https://upload.wikimedia.org/wikipedia/commons/${dir}/${wikiEncode(name)}`;
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
  const failed = [];
  for (const [id, item] of Object.entries(media)) {
    if (!item.commons || (wanted.size && !wanted.has(id))) continue;
    const out = join(ROOT, "public", item.file);
    if (existsSync(out)) continue;
    mkdirSync(dirname(out), { recursive: true });
    const tmp = `${out}.download`;
    try {
      if (item.kind === "image") {
        const width = item.width ?? 1280;
        if (!STANDARD_WIDTHS.includes(width)) throw new Error(`width must be one of ${STANDARD_WIDTHS}`);
        writeFileSync(tmp, await download(thumbUrl(item.commons, width)));
        execFileSync("vips", ["copy", tmp, `${out}[Q=82,strip]`]);
      } else if (item.kind === "audio") {
        writeFileSync(tmp, await download(originalUrl(item.commons)));
        execFileSync("ffmpeg", ["-loglevel", "error", "-y", "-i", tmp, "-ac", "1", "-b:a", "96k", "-map_metadata", "-1", out]);
      }
      console.log(`${id}: public/${item.file}`);
    } catch (error) {
      // One missing file should not stop the others; the run still fails at the end.
      failed.push(`${id}: ${error.message}`);
    } finally {
      if (existsSync(tmp)) unlinkSync(tmp);
    }
    await new Promise((r) => setTimeout(r, 1500));
  }
  if (failed.length) {
    console.error(`Failed:\n${failed.join("\n")}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
