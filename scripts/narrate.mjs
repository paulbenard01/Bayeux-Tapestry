// Generates the narration with ElevenLabs text-to-speech: one clip per scene from the `script` texts in
// content/scenes.yaml, then one continuous track per language and its cue file.
//
//   ELEVENLABS_API_KEY=... node scripts/narrate.mjs [fr] [en]
//   node scripts/narrate.mjs --join [fr] [en]     rebuild the tracks from the kept clips (no key, no credits)
//
// Writes
//   assets/narration/<lang>/scene-NN.mp3   the clips as delivered (kept so only changed scenes are regenerated)
//   assets/narration/<lang>/manifest.json  per scene: hash of the text, model and voice that made the clip
//   public/audio/narration.<lang>.mp3      the joined track (mono, 96 kbps, loudness-normalised)
//   content/narration/cues.<lang>.json     [{t, scene}]: when each scene's clip starts in the track
//
// Options (environment): ELEVENLABS_MODEL (default eleven_multilingual_v2), ELEVENLABS_VOICE_EN,
// ELEVENLABS_VOICE_FR (voice ids, instead of the voices named in VOICES),
// MAX_CREDITS (refuse to spend more than this in one run, default 25000), DRY_RUN=1 (count only).
// Needs ffmpeg. The key is only read here, on the machine running the script; it never reaches the site.
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import yaml from "js-yaml";

const API = "https://api.elevenlabs.io";
const KEY = process.env.ELEVENLABS_API_KEY ?? "";
const MODEL = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
const MAX_CREDITS = Number(process.env.MAX_CREDITS || 25000);
const DRY_RUN = process.env.DRY_RUN === "1";
// Paul's choice (2026-10-14): Adam Stone, a smooth, relaxed British voice from the library (found by name), and
// Nicolas, the French voice of the first reading (by id).
const VOICES = { en: { name: "Adam Stone" }, fr: { id: "iCKVfVbyCo5AAswzTkkX", name: "Nicolas - Informative Presenter" } };
// Steady, unemphatic delivery for an academic register.
const VOICE_SETTINGS = { stability: 0.65, similarity_boost: 0.75, style: 0, use_speaker_boost: true, speed: 0.95 };
/** Silence after each scene, in seconds, so the strip has time to glide to the next one. */
const PAUSE = 1.2;
/** Silence before the first scene, so the first words are not clipped while a device (Bluetooth above all)
 * wakes up or the browser starts decoding. */
const LEAD = 1.5;
const RATE = 44100;

const JOIN_ONLY = process.argv.includes("--join");
const args = process.argv.slice(2).filter((a) => a !== "--join");
const langs = args.length ? args : ["fr", "en"];
const scenes = yaml.load(readFileSync("content/scenes.yaml", "utf8"));

async function api(path, init = {}) {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { "xi-api-key": KEY, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  if (!res.ok) throw new Error(`${init.method ?? "GET"} ${path}: HTTP ${res.status} ${await res.text()}`);
  return res;
}

/** The voice's id in the account; a library voice found by name is added to the account first. */
async function voiceByName(name) {
  const q = encodeURIComponent(name);
  const starts = (v) => v.name.toLowerCase().startsWith(name.toLowerCase());
  const owned = (await (await api(`/v2/voices?search=${q}`)).json()).voices.find(starts);
  if (owned) return { id: owned.voice_id, name };
  const shared = (await (await api(`/v1/shared-voices?search=${q}&page_size=20`)).json()).voices.filter(starts);
  if (!shared.length) throw new Error(`no voice named ${name} in the account or the library`);
  const v = shared[0];
  await api(`/v1/voices/add/${v.public_owner_id}/${v.voice_id}`, { method: "POST", body: JSON.stringify({ new_name: name }) });
  return { id: v.voice_id, name };
}

async function voiceFor(lang) {
  const fromEnv = process.env[`ELEVENLABS_VOICE_${lang.toUpperCase()}`];
  if (fromEnv) return { id: fromEnv, name: fromEnv };
  return VOICES[lang].id ? VOICES[lang] : voiceByName(VOICES[lang].name);
}

const text = (scene, lang) => scene.script[lang].replace(/\s+/g, " ").trim();
const hash = (s) => createHash("sha256").update(s).digest("hex").slice(0, 16);

/** Exact length of an audio file in seconds, by decoding it. */
function seconds(file) {
  const pcm = execFileSync("ffmpeg", ["-v", "error", "-i", file, "-f", "s16le", "-ac", "1", "-ar", String(RATE), "-"], {
    maxBuffer: 1 << 30,
  });
  return pcm.length / 2 / RATE;
}

async function remainingCredits() {
  const sub = await (await api("/v1/user/subscription")).json();
  return sub.character_limit - sub.character_count;
}

async function main() {
  // --join: rebuild the tracks and cues from the clips already made, without calling ElevenLabs.
  if (JOIN_ONLY) {
    for (const lang of langs) joinTrack({ lang, dir: join("assets/narration", lang) });
    return;
  }
  if (!KEY && !DRY_RUN) throw new Error("ELEVENLABS_API_KEY is not set");
  const plans = [];
  for (const lang of langs) {
    const dir = join("assets/narration", lang);
    mkdirSync(dir, { recursive: true });
    const manifestFile = join(dir, "manifest.json");
    const manifest = existsSync(manifestFile) ? JSON.parse(readFileSync(manifestFile, "utf8")) : { scenes: {} };
    const voice = DRY_RUN ? { id: manifest.voice?.id ?? "?", name: manifest.voice?.name ?? "?" } : await voiceFor(lang);
    const todo = scenes.filter((s) => {
      const m = manifest.scenes[s.n];
      const file = join(dir, `scene-${String(s.n).padStart(2, "0")}.mp3`);
      return !(m && m.hash === hash(text(s, lang)) && m.model === MODEL && m.voice === voice.id && existsSync(file));
    });
    plans.push({ lang, dir, manifestFile, manifest, voice, todo });
  }

  const needed = plans.reduce((sum, p) => sum + p.todo.reduce((n, s) => n + text(s, p.lang).length, 0), 0);
  for (const p of plans) console.log(`${p.lang}: ${p.todo.length} of ${scenes.length} scenes to generate, voice ${p.voice.name}`);
  console.log(`about ${needed} characters (credits) needed with ${MODEL}`);
  if (DRY_RUN) return;
  if (needed > MAX_CREDITS) throw new Error(`refusing to spend ${needed} credits (MAX_CREDITS is ${MAX_CREDITS})`);
  if (needed > 0) {
    const left = await remainingCredits();
    console.log(`${left} credits left on the account`);
    if (needed > left) throw new Error(`not enough credits: ${needed} needed, ${left} left`);
  }

  for (const p of plans) {
    for (const scene of p.todo) {
      const i = scenes.indexOf(scene);
      const body = {
        text: text(scene, p.lang),
        model_id: MODEL,
        voice_settings: VOICE_SETTINGS,
        // Neighbouring texts keep the intonation continuous across clips.
        previous_text: i > 0 ? text(scenes[i - 1], p.lang) : undefined,
        next_text: i < scenes.length - 1 ? text(scenes[i + 1], p.lang) : undefined,
        apply_text_normalization: "auto",
      };
      const res = await api(`/v1/text-to-speech/${p.voice.id}?output_format=mp3_44100_128`, {
        method: "POST",
        body: JSON.stringify(body),
      });
      const file = join(p.dir, `scene-${String(scene.n).padStart(2, "0")}.mp3`);
      writeFileSync(file, Buffer.from(await res.arrayBuffer()));
      p.manifest.scenes[scene.n] = { hash: hash(body.text), model: MODEL, voice: p.voice.id };
      p.manifest.voice = p.voice;
      p.manifest.model = MODEL;
      // Saved after every clip so an interrupted run resumes where it stopped.
      writeFileSync(p.manifestFile, `${JSON.stringify(p.manifest, null, 2)}\n`);
      console.log(`${p.lang} scene ${scene.n}: ${body.text.length} characters`);
    }
    joinTrack(p);
  }
}

/** Joins the clips, each padded with a pause, into one track, and writes the cues. */
function joinTrack({ lang, dir }) {
  const files = scenes.map((s) => join(dir, `scene-${String(s.n).padStart(2, "0")}.mp3`));
  const cues = [];
  const filters = [];
  let t = LEAD;
  files.forEach((file, i) => {
    cues.push({ t: Math.round(t * 100) / 100, scene: scenes[i].n });
    const lead = i === 0 ? LEAD : 0;
    const length = lead + seconds(file) + PAUSE;
    // Pad each clip to an exact length so the cue times match the joined track; the first one starts after LEAD.
    const delay = lead ? `adelay=${lead * 1000}:all=1,` : "";
    filters.push(`[${i}:a]aresample=${RATE},aformat=channel_layouts=mono,${delay}apad=whole_dur=${length.toFixed(4)}[a${i}]`);
    t += length - lead;
  });
  const graph = `${filters.join(";")};${files.map((_, i) => `[a${i}]`).join("")}concat=n=${files.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11[out]`;
  mkdirSync("public/audio", { recursive: true });
  execFileSync("ffmpeg", [
    "-v", "error", "-y",
    ...files.flatMap((f) => ["-i", f]),
    "-filter_complex", graph, "-map", "[out]",
    "-ar", String(RATE), "-ac", "1", "-c:a", "libmp3lame", "-b:a", "96k",
    `public/audio/narration.${lang}.mp3`,
  ], { stdio: "inherit" });
  writeFileSync(`content/narration/cues.${lang}.json`, `${JSON.stringify(cues, null, 2)}\n`);
  console.log(`${lang}: public/audio/narration.${lang}.mp3, ${Math.round(t)} s, ${cues.length} cues`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
