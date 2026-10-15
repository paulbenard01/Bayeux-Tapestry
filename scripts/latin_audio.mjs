// Reads each scene's Latin caption aloud with ElevenLabs, for the speaker button beside the caption: the words as
// expanded by the editor (EDWARD[US] -> Edwardus, ⁊ -> et), in lower case so they are read as words, not letters.
// Written to public/audio/latin/scene-NN.mp3 (mono), with manifest.json (a hash of each text and the voice);
// only captions whose text or voice changed are read again.
//
//   ELEVENLABS_API_KEY=... node scripts/latin_audio.mjs
//
// The voice is French (Nicolas, as for the French narration): one modern reading, not a reconstruction of how
// the captions sounded in the 11th century. Needs ffmpeg.
import { createHash } from "node:crypto";
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import yaml from "js-yaml";

const KEY = process.env.ELEVENLABS_API_KEY ?? "";
const OUT = "public/audio/latin";
const VOICE = { id: "iCKVfVbyCo5AAswzTkkX", name: "Nicolas - Informative Presenter" };
const MODEL = "eleven_multilingual_v2";
const SETTINGS = { stability: 0.7, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.85 };
/** Silence before each reading. */
const LEAD = 0.35;

/**
 * "EDWARD[US] ⁊ REX — ODO" -> "edwardus et rex, odo" (the same expansion as src/latin.ts captionTokens); the
 * dashes between separate captions become a pause.
 */
export function spoken(latin) {
  return latin
    .split("—")
    .map((part) =>
      part
        .split(/\s+/)
        .filter((w) => /[\p{L}⁊]/u.test(w))
        .map((w) => w.replace(/[[\]]/g, "").replace(/⁊/g, "et").replace(/[^\p{L}]/gu, ""))
        .filter(Boolean)
        .join(" "),
    )
    .filter(Boolean)
    .join(", ")
    .toLowerCase();
}

const hash = (s) => createHash("sha256").update(`${VOICE.id}${MODEL}${s}`).digest("hex").slice(0, 16);

async function read(n, text) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE.id}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ text: `${text}.`, model_id: MODEL, voice_settings: SETTINGS }),
  });
  if (!res.ok) throw new Error(`scene ${n}: HTTP ${res.status} ${await res.text()}`);
  const raw = `${OUT}/scene-${n}.raw.mp3`;
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  // Trim the silence at both ends, set the peak to -1 dB, then put LEAD seconds of silence first so the first
  // syllable is not clipped while the device starts playing.
  const silence = "silenceremove=start_periods=1:start_threshold=-50dB";
  const shape = `${silence},areverse,${silence},areverse`;
  const { stderr } = spawnSync("ffmpeg", ["-v", "info", "-i", raw, "-af", `${shape},volumedetect`, "-f", "null", "-"]);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(stderr.toString())?.[1] ?? 0);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", `${shape},volume=${(-1 - peak).toFixed(2)}dB,adelay=${LEAD * 1000}:all=1`,
    "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "64k", "-map_metadata", "-1",
    `${OUT}/scene-${String(n).padStart(2, "0")}.mp3`]);
  rmSync(raw);
}

if (process.argv[1]?.endsWith("latin_audio.mjs")) {
  if (!KEY) throw new Error("ELEVENLABS_API_KEY is not set");
  mkdirSync(OUT, { recursive: true });
  const manifestFile = `${OUT}/manifest.json`;
  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};
  const scenes = yaml.load(readFileSync("content/scenes.yaml", "utf8"));
  for (const scene of scenes) {
    const text = spoken(scene.latin);
    const file = `${OUT}/scene-${String(scene.n).padStart(2, "0")}.mp3`;
    if (manifest[scene.n] === hash(text) && existsSync(file)) continue;
    await read(scene.n, text);
    manifest[scene.n] = hash(text);
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`scene ${scene.n}: ${text}`);
  }
}
