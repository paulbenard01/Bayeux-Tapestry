// Generates sound effects for the soundscape with ElevenLabs (where no free recording was found or good enough):
// short calls (snorts, neighs, a hawk, a war horn, barks, ship creaks, a sacred shimmer), trimmed, faded and
// normalised, and two seamless beds (a banquet hall, a distant battle), as public/audio/sfx/<id>.mp3 (mono).
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
const HAWK = "A single hawk's sharp cry, a falcon screeching once high in the open sky, no other sounds";
const BARK = "Two or three hunting hounds barking a few times outdoors, at a little distance, no other sounds";
const CREAK =
  "The wooden hull and mast of an old sailing ship creaking slowly as it rolls on the waves, ropes straining, no voices, no music";
const SHIMMER =
  "A delicate glittering sparkle: many tiny soft high twinkles scattered like falling dust, airy and gentle, swelling in and fading away, no bells, no choir, no melody, no drums";
/** id -> prompt, length in seconds, and whether it is a bed to loop. */
const EFFECTS = {
  snort1: [SNORT, 1.5],
  snort2: [`${SNORT}, a little deeper`, 1.5],
  snort3: [`${SNORT}, with a shake of the head`, 2],
  neigh1: [NEIGH, 2.5],
  neigh2: [`${NEIGH}, slightly higher`, 2.5],
  hawk1: [HAWK, 2],
  hawk2: [`${HAWK}, two short cries`, 2],
  horn1: ["A medieval war horn, an oliphant, sounding one long low call to arms far away in the distance, echoing over a wide field, no other sounds", 4],
  cowhorn: ["A simple medieval cow horn blown once far away across open country: one short rough low signal, then its echo, no other sounds", 3],
  handbells: ["Two small bronze handbells rung slowly and steadily by two people walking in a funeral procession outdoors, soft, no other sounds", 6, true],
  shimmer1: [SHIMMER, 3.5],
  shimmer2: [`${SHIMMER}, slightly brighter`, 3.5],
  bark1: [BARK, 2],
  bark2: [`${BARK}, deeper voices`, 2],
  bark3: [`${BARK}, one dog then the others answer`, 2.5],
  creak1: [CREAK, 2.5],
  creak2: [`${CREAK}, a long low groan of timber`, 2.5],
  creak3: [`${CREAK}, a short sharp creak`, 1.5],
  feast: [
    "A medieval banquet in a great hall: many people talking and laughing together at a little distance, cups and wooden bowls clinking, a crackling fire, continuous, no music",
    10, true,
  ],
  melee: [
    "A medieval battle heard from a little distance: many soldiers shouting and crying out, swords and axes clashing on shields, continuous, no music, no explosions, no gunfire",
    10, true,
  ],
};

/** Joins the end of a bed into its start (crossfading the last `overlap` seconds) so it loops without a seam. */
function seamless(file, overlap = 1.5) {
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-ac", "1", "-ar", "44100", "-f", "f32le", "-"], { maxBuffer: 1 << 28 });
  const x = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.length / 4);
  const n = Math.floor(44100 * overlap);
  const out = x.slice(0, x.length - n);
  for (let i = 0; i < n; i++) {
    const r = i / n;
    out[i] = x[i] * r + x[x.length - n + i] * (1 - r);
  }
  let peak = 0;
  for (const v of out) peak = Math.max(peak, Math.abs(v));
  const gain = peak ? 10 ** (-1 / 20) / peak : 1;
  for (let i = 0; i < out.length; i++) out[i] *= gain;
  return Buffer.from(out.buffer);
}

async function generate(id, [text, seconds, loop]) {
  const res = await fetch("https://api.elevenlabs.io/v1/sound-generation?output_format=mp3_44100_128", {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ text, duration_seconds: seconds, prompt_influence: 0.6 }),
  });
  if (!res.ok) throw new Error(`${id}: HTTP ${res.status} ${await res.text()}`);
  const raw = `${OUT}/${id}.raw.mp3`;
  writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
  if (loop) {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "f32le", "-ar", "44100", "-ac", "1", "-i", "pipe:0",
      "-c:a", "libmp3lame", "-b:a", "80k", "-map_metadata", "-1", `${OUT}/${id}.mp3`], { input: seamless(raw) });
    rmSync(raw);
    console.log(`${id}: written (loop)`);
    return;
  }
  // Trim the silence at both ends (reversing to trim the end), with a short fade out; then set the peak to -1 dB.
  // The threshold is relative to the clip's own peak, so a soft sound (a shimmer) is not trimmed away entirely.
  const measure = (filters) => {
    const { stderr } = spawnSync("ffmpeg", ["-v", "info", "-i", raw, "-af", `${filters}volumedetect`, "-f", "null", "-"]);
    return Number(/max_volume: (-?[\d.]+) dB/.exec(stderr.toString())?.[1] ?? 0);
  };
  const silence = `silenceremove=start_periods=1:start_threshold=${(measure("") - 40).toFixed(1)}dB`;
  const shape = `${silence},areverse,${silence},afade=t=in:d=0.08,areverse`;
  const peak = measure(`${shape},`);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-i", raw, "-af", `${shape},volume=${(-1 - peak).toFixed(2)}dB`,
    "-ac", "1", "-ar", "44100", "-c:a", "libmp3lame", "-b:a", "80k", "-map_metadata", "-1", `${OUT}/${id}.mp3`]);
  rmSync(raw);
  const length = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", `${OUT}/${id}.mp3`]));
  if (!(length > 0.3)) throw new Error(`${id}: only ${length} s after trimming`);
  console.log(`${id}: written, ${length.toFixed(2)} s`);
}

if (!KEY) throw new Error("ELEVENLABS_API_KEY is not set");
mkdirSync(OUT, { recursive: true });
const only = process.argv.slice(2);
for (const [id, spec] of Object.entries(EFFECTS)) {
  if (only.length ? only.includes(id) : !existsSync(`${OUT}/${id}.mp3`)) await generate(id, spec);
}
