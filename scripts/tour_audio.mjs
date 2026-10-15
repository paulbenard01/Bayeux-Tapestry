// Voices the highlights tour and the afterlife slideshow with ElevenLabs, with the narration's voices
// (Adam Stone in English, Nicolas in French), each text as "title. text":
//
//   public/audio/afterlife/<lang>/<slide id>.mp3   one clip per slide, after a short silence (the slideshow plays
//                                                  them one after another)
//   assets/highlights/<lang>/<stop id>.mp3         one clip per stop, kept so only changed stops are read again
//   public/audio/highlights.<lang>.mp3             the stops joined: a silence first, then for each stop its clip,
//                                                  a pause, and the time the strip takes to travel to the next
//   content/narration/highlights.<lang>.json       [{t, scene, stop}]: each stop's arrival and departure
//
//   ELEVENLABS_API_KEY=... node scripts/tour_audio.mjs [fr] [en]
//
// A manifest beside the clips (hash of text and voice) means only new or changed texts are read. Needs ffmpeg.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import yaml from "js-yaml";

const KEY = process.env.ELEVENLABS_API_KEY ?? "";
const MODEL = "eleven_multilingual_v2";
const VOICES = { en: "auq43ws1oslv0tO4BDa7", fr: "iCKVfVbyCo5AAswzTkkX" };
const SETTINGS = { stability: 0.65, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.95 };
const RATE = 44100;
/** Silence before each slide's clip and before the first stop, so no first word is clipped. */
const LEAD = 0.6;
const TRACK_LEAD = 1.5;
const CLIP_LEAD = 0.3;
/** After a stop's clip: a pause, then the strip's travel to the next stop (TRAVEL_SECONDS in src/narration.ts). */
const AFTER = 1.0;
const TRAVEL = 4;

const langs = process.argv.slice(2).length ? process.argv.slice(2) : ["fr", "en"];
const text = (item, lang) => `${item.title[lang]}. ${item.text[lang]}`.replace(/\s+/g, " ").trim();
const hash = (lang, s) => createHash("sha256").update(`${VOICES[lang]}${MODEL}${s}`).digest("hex").slice(0, 16);

async function speak(lang, words, file) {
  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICES[lang]}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": KEY, "content-type": "application/json" },
    body: JSON.stringify({ text: words, model_id: MODEL, voice_settings: SETTINGS, apply_text_normalization: "auto" }),
  });
  if (!res.ok) throw new Error(`${file}: HTTP ${res.status} ${await res.text()}`);
  writeFileSync(file, Buffer.from(await res.arrayBuffer()));
}

/** Exact length in seconds, by decoding. */
function seconds(file) {
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", String(RATE), "-"], {
    maxBuffer: 1 << 30,
  });
  return pcm.length / 2 / RATE;
}

/** Reads every item whose text changed into dir/<id>.mp3 (as delivered); returns the manifest. */
async function readAll(lang, items, dir) {
  mkdirSync(dir, { recursive: true });
  const manifestFile = `${dir}/manifest.json`;
  const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : {};
  for (const item of items) {
    const words = text(item, lang);
    const file = `${dir}/${item.id}.raw.mp3`;
    if (manifest[item.id] === hash(lang, words) && existsSync(file)) continue;
    await speak(lang, words, file);
    manifest[item.id] = hash(lang, words);
    writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`${lang} ${item.id}: ${words.length} characters`);
  }
}

if (!KEY) throw new Error("ELEVENLABS_API_KEY is not set");
const slides = yaml.load(readFileSync("content/afterlife.yaml", "utf8"));
const stops = yaml.load(readFileSync("content/highlights.yaml", "utf8"));

for (const lang of langs) {
  // Afterlife: each slide's clip after a short silence, mono 96 kbps.
  const slideDir = `assets/afterlife/${lang}`;
  await readAll(lang, slides, slideDir);
  mkdirSync(`public/audio/afterlife/${lang}`, { recursive: true });
  for (const slide of slides) {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${slideDir}/${slide.id}.raw.mp3`,
      "-af", `adelay=${LEAD * 1000}:all=1,loudnorm=I=-16:TP=-1.5:LRA=11`, "-ar", String(RATE), "-ac", "1",
      "-c:a", "libmp3lame", "-b:a", "96k", "-map_metadata", "-1", `public/audio/afterlife/${lang}/${slide.id}.mp3`]);
  }
  console.log(`${lang}: ${slides.length} afterlife clips`);

  // Highlights: one track, with each stop's arrival and departure as cues.
  const stopDir = `assets/highlights/${lang}`;
  await readAll(lang, stops, stopDir);
  const files = stops.map((s) => `${stopDir}/${s.id}.raw.mp3`);
  const cues = [];
  const filters = [];
  let t = TRACK_LEAD;
  files.forEach((file, i) => {
    const lead = i === 0 ? TRACK_LEAD : TRAVEL;
    const speech = seconds(file);
    cues.push({ t: Math.round(t * 100) / 100, scene: stops[i].scene, stop: i });
    cues.push({ t: Math.round((t + speech + AFTER) * 100) / 100, scene: stops[i].scene, stop: i });
    // Each clip after its lead silence (the first track lead, then the travel from the previous stop), padded
    // to an exact length so the cues match the joined track.
    const length = lead + speech + AFTER;
    filters.push(`[${i}:a]aresample=${RATE},aformat=channel_layouts=mono,adelay=${lead * 1000}:all=1,apad=whole_dur=${length.toFixed(4)}[a${i}]`);
    t += speech + AFTER + TRAVEL;
  });
  const graph = `${filters.join(";")};${files.map((_, i) => `[a${i}]`).join("")}concat=n=${files.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]`;
  execFileSync("ffmpeg", ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex", graph,
    "-map", "[out]", "-ar", String(RATE), "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k",
    `public/audio/highlights.${lang}.mp3`]);
  writeFileSync(`content/narration/highlights.${lang}.json`, `${JSON.stringify(cues, null, 2)}\n`);
  // Each stop's clip on its own, for the tour (no seeking in the long track), after CLIP_LEAD seconds of silence.
  mkdirSync(`public/audio/highlights/${lang}`, { recursive: true });
  for (const stop of stops) {
    execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${stopDir}/${stop.id}.raw.mp3`,
      "-af", `adelay=${CLIP_LEAD * 1000}:all=1,loudnorm=I=-16:TP=-1.5:LRA=11`, "-ar", String(RATE), "-ac", "1",
      "-c:a", "libmp3lame", "-b:a", "96k", "-map_metadata", "-1", `public/audio/highlights/${lang}/${stop.id}.mp3`]);
  }
  console.log(`${lang}: highlights track, ${Math.round(t)} s`);
}
