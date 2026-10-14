// Generates the horse calls of the soundscape with ElevenLabs sound effects (no free recording was found):
// a few short snorts and neighs, each trimmed, faded and normalised, as public/audio/sfx/<id>.mp3 (mono).
//
//   ELEVENLABS_API_KEY=... node scripts/make_sfx.mjs [id ...]
//
// Existing files are kept unless named. The app varies their pitch each time it plays one. Needs ffmpeg.
import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";

const KEY = process.env.ELEVENLABS_API_KEY ?? "";
const OUT = "public/audio/sfx";

const SNORT =
  "A single horse snorting softly through its nostrils, a short blowing snort, outdoors, close, no other sounds";
const NEIGH = "A single horse neighing once, a short whinny in the open air, at a little distance, no other sounds";
/** id -> prompt and length in seconds. */
const EFFECTS = {
  snort1: [SNORT, 1.5],
  snort2: [`${SNORT}, a little deeper`, 1.5],
  snort3: [`${SNORT}, with a shake of the head`, 2],
  neigh1: [NEIGH, 2.5],
  neigh2: [`${NEIGH}, slightly higher`, 2.5],
};

async function generate(id, [text, seconds]) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.6 }),
  });
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status} ${await res.text()}`);
  const raw = `${OUT}/${id}.raw.mp3`;
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  // Trim the silence at both ends (reversing to trim the end), with a short fade out; then set the peak to -1 dB.
  const silence = "silenceremove=start_periods=1:start_threshold=-45dB";
  const shape = `${silence},areverse,${silence},afade=t=in:d=0.08,areverse`;
  const { stderr } = spawnSync("ffmpeg", ["-v", "info", "-i", raw, "-af", `${shape},volumedetect`, "-f", "null", "-"]);
  const peak = Number(/max_volume: (-?[\d.]+) dB/.exec(stderr.toString())?.[1] ?? 0);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", `${shape},volume=${(-1 - peak).toFixed(2)}dB`,
    "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "80k", "-map_metadata", "-1", `${OUT}/${id}.mp3`]);
  rmSync(raw);
  console.log(`${id}: written`);
}

if (!KEY) throw new Error("ELEVENLABS_API_KEY is not set");
mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
for (const [id, spec] of Object.entries(EFFECTS)) {
  if (only.length ? only.includes(id) : !existsSync(`${OUT}/${id}.mp3`)) await generate(id, spec);
}
