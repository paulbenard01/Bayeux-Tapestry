// The soundscape (content/soundscape.yaml): an ethereal hum whose chords follow the mood of the scene in view,
// with quiet effects underneath: recordings (content/sounds.yaml, CC0) and generated effects (scripts/make_sfx.mjs).
// Some scenes add a one-off cue on arrival (a war horn, a sacred shimmer). Off by default; starts only on a click
// (browser autoplay rules). Everything crossfades as the reader moves along the embroidery.

export const MOODS = ["calm", "journey", "sea", "omen", "solemn", "elegy", "tension", "battle"] as const;
export type Mood = (typeof MOODS)[number];
export const LAYERS = [
  "sea", "ships", "wind", "birds", "gulls", "hawk", "horses", "hounds", "workshop", "feast", "fire", "battle",
  "bells", "chant",
] as const;
export type SoundLayer = (typeof LAYERS)[number];
export const GAITS = ["walk", "trot", "gallop"] as const;
export type Gait = (typeof GAITS)[number];
/** One-off sounds played once when the reader arrives at a scene. */
export const CUES = ["horn", "divine"] as const;
export type SoundCue = (typeof CUES)[number];
/**
 * The acoustics of where a scene takes place, as in archaeoacoustic reconstructions: effects ring with the reverb
 * of the open air, a timber hall or a stone church.
 */
export const SPACES = ["open", "hall", "church"] as const;
export type Space = (typeof SPACES)[number];
export const SPACE_REVERB: Record<Space, { seconds: number; wet: number; damping: number }> = {
  open: { seconds: 1.2, wet: 0.12, damping: 4 },
  hall: { seconds: 1.8, wet: 0.35, damping: 3 },
  church: { seconds: 5.5, wet: 0.7, damping: 2 },
};
export type SceneSounds = { mood: Mood; gait?: Gait; cue?: SoundCue; space?: Space } & Partial<Record<SoundLayer, number>>;

/** Recorded sounds, in public/audio/sfx/ (scripts/make_sounds.py). */
const SAMPLES = [
  "hooves", "barks", "waves", "gulls", "wind", "birds", "fire", "anvil", "hammer", "chop", "swords",
  "snort1", "snort2", "snort3", "neigh1", "neigh2", "hawk1", "hawk2", "shimmer1", "shimmer2",
  "bark1", "bark2", "bark3", "creak1", "creak2", "creak3", "feast", "melee", "cowhorn", "handbells", "chant",
] as const;
/** The horses' calls (generated, scripts/make_sfx.mjs): mostly snorts, now and then a neigh. */
const HORSE_CALLS = ["snort1", "snort2", "snort3", "snort1", "snort2", "snort3", "neigh1", "neigh2"] as const;
type Sample = (typeof SAMPLES)[number];

const note = (midi: number) => 440 * 2 ** ((midi - 69) / 12);
/**
 * Airy chords for each mood, as MIDI notes kept mostly between D4 and D6 so the hum stays light. Each mood
 * moves through its chords slowly; moods share notes so moving between them stays smooth.
 */
export const MOOD_CHORDS: Record<Mood, number[][]> = {
  calm: [[62, 66, 69, 73, 76], [67, 71, 74, 78], [64, 69, 71, 76, 79]], // D maj9, G maj7, A sus with added notes
  journey: [[62, 67, 69, 74, 76], [64, 69, 71, 76], [59, 66, 69, 74, 78]], // suspended chords that never settle
  sea: [[62, 69, 76, 81], [64, 71, 78, 83], [60, 67, 74, 79]], // open fifths, like the horizon
  omen: [[62, 65, 69, 76], [58, 65, 70, 74, 76], [61, 64, 69, 73]], // D minor add9, B flat lydian, A
  solemn: [[62, 65, 69, 72], [65, 69, 72, 76], [60, 64, 67, 74]], // D dorian: Dm7, F maj7, C add9
  elegy: [[62, 65, 69, 74], [55, 62, 67, 70], [57, 64, 69, 73]], // D minor, G minor, A
  tension: [[57, 64, 67, 72], [53, 60, 65, 69, 71], [55, 62, 67, 69, 74]], // A minor 7, F lydian, G6
  battle: [[50, 57, 62, 65, 69], [46, 58, 62, 65, 70], [48, 55, 60, 64, 67], [45, 57, 64, 69, 72]], // Dm, B flat, C, Am
};

/** Seconds a chord lasts before the next one of its mood. */
const CHORD_SECONDS: Record<Mood, number> = {
  calm: 12, journey: 10, sea: 13, omen: 11, solemn: 13, elegy: 14, tension: 9, battle: 7,
};

/** Hoofbeats of one stride, as [offset in seconds, loudness], and the stride's length. */
export const GAITS_RHYTHM: Record<Gait, { beats: [number, number][]; stride: number }> = {
  walk: { beats: [[0, 0.8], [0.28, 0.55], [0.55, 0.75], [0.83, 0.5]], stride: 1.1 },
  trot: { beats: [[0, 0.8], [0.19, 0.7]], stride: 0.38 },
  gallop: { beats: [[0, 0.6], [0.08, 0.5], [0.16, 0.7], [0.26, 0.85]], stride: 0.5 },
};

/** A scene in view: where it sits left to right (pan, -1 to 1) and how present it is (1 in the middle of the view). */
export interface Source {
  scene: number;
  pan: number;
  presence: number;
}

/**
 * The scenes in view, from their centres relative to the view's centre (`half` is half the visible width): the
 * scene in the middle is fully present, those towards the edges less so, and their sounds come from their side.
 * Pure.
 */
export function visibleSources(centres: number[], centre: number, half: number): Source[] {
  const out: Source[] = [];
  centres.forEach((x, i) => {
    const d = (x - centre) / half;
    if (Math.abs(d) > 1.15) return;
    out.push({ scene: i + 1, pan: Math.max(-1, Math.min(1, d)) * 0.8, presence: Math.max(0.25, 1 - Math.abs(d) * 0.75) });
  });
  return out;
}

/**
 * Each layer's weight and pan for the scenes in view: the loudest contribution sets the weight, and the pan is
 * the contributions' average, weighted by loudness. Pure.
 */
export function mixSources(
  sources: Source[],
  byScene: Record<number, Partial<SceneSounds>>,
): Record<SoundLayer, { weight: number; pan: number }> {
  const out = {} as Record<SoundLayer, { weight: number; pan: number }>;
  for (const layer of LAYERS) {
    let weight = 0;
    let sum = 0;
    let panSum = 0;
    for (const s of sources) {
      const w = layerTargets(byScene[s.scene])[layer] * s.presence;
      weight = Math.max(weight, w);
      sum += w;
      panSum += w * s.pan;
    }
    out[layer] = { weight, pan: sum > 0 ? panSum / sum : 0 };
  }
  return out;
}

/** Target weight of every effect layer for a scene; unlisted layers are silent. Pure. */
export function layerTargets(sounds: Partial<SceneSounds> | undefined): Record<SoundLayer, number> {
  const out = {} as Record<SoundLayer, number>;
  for (const layer of LAYERS) out[layer] = Math.max(0, Math.min(1, Number(sounds?.[layer] ?? 0)));
  return out;
}

/** How loud each layer is at weight 1: the effects sit under the hum, without being masked by it. */
const LAYER_LEVEL: Record<SoundLayer, number> = {
  sea: 0.16, ships: 0.07, wind: 0.07, birds: 0.06, gulls: 0.035, hawk: 0.05, horses: 0.12, hounds: 0.05,
  workshop: 0.05, feast: 0.08, fire: 0.07, battle: 0.08, bells: 0.07, chant: 0.09,
};
/**
 * How the arrival cues sit in the space: their level, the low-pass that takes the edge off, how much of them is
 * heard through the reverb rather than directly (more reverb sounds further away), and how slowly they fade in.
 * The horn is a call from far off across the field; the shimmer glows in softly.
 */
const CUE_SOUND: Record<SoundCue, { level: number; cutoff: number; wet: number; attack: number }> = {
  horn: { level: 0.035, cutoff: 1100, wet: 2.2, attack: 0.4 },
  divine: { level: 0.045, cutoff: 9000, wet: 1.6, attack: 0.5 },
};

/**
 * The hum's colour for each mood: the cutoff of its low-pass (darker below, lighter above) and its level. Both
 * move slowly (MOOD_GLIDE), so a change of mood is felt rather than heard.
 */
export const MOOD_TONE: Record<Mood, { cutoff: number; level: number }> = {
  calm: { cutoff: 2600, level: 1 },
  journey: { cutoff: 2400, level: 1 },
  sea: { cutoff: 2200, level: 1 },
  solemn: { cutoff: 2000, level: 0.95 },
  tension: { cutoff: 1600, level: 0.9 },
  battle: { cutoff: 1500, level: 0.85 },
  omen: { cutoff: 1300, level: 0.9 },
  elegy: { cutoff: 1200, level: 0.9 },
};
/** Time constant, in seconds, of the hum's change of colour (about three times as long to settle). */
const MOOD_GLIDE = 6;
const MASTER_VOLUME = 0.7;
const DUCKED_VOLUME = 0.2;
const HUM_LEVEL = 0.03;
/** Seconds (time constant) for layers to follow a scene change. */
const FADE = 1.5;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

export class Soundscape {
  on = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humBus: GainNode | null = null;
  private air: BiquadFilterNode | null = null;
  private readonly cuePlayed = new Map<number, number>();
  private reverb: ConvolverNode | null = null;
  private readonly gains = new Map<SoundLayer, GainNode>();
  private readonly buffers = new Map<Sample, AudioBuffer>();
  private targets = layerTargets(undefined);
  private mood: Mood = "calm";
  private gait: Gait = "walk";
  private chordIndex = 0;
  private chordVoices: GainNode[] = [];
  private timers: number[] = [];
  private ducked = false;
  private scene = 0;
  /** The scenes in view and the mix they make (see setView). */
  private sources: Source[] = [];
  private readonly bedPans = new Map<SoundLayer, StereoPannerNode>();
  private placeIn: GainNode | null = null;
  private readonly placeWet = new Map<Space, GainNode>();
  private space: Space = "open";

  /** `centres`: each scene's centre along the strip, to place its sounds left or right of the view. */
  constructor(
    private readonly byScene: Record<number, SceneSounds>,
    private readonly centres: number[] = [],
  ) {}

  /**
   * Follows the view: every scene in view adds its layers, from its side and fainter towards the edges. Called on
   * every viewport change; only a noticeable change reschedules a layer.
   */
  setView(centre: number, half: number): void {
    if (!this.centres.length || half <= 0) return;
    this.sources = visibleSources(this.centres, centre, half);
    const mix = mixSources(this.sources, this.byScene);
    for (const layer of LAYERS) {
      const { weight, pan } = mix[layer];
      const before = this.targets[layer];
      this.targets[layer] = weight;
      if (!this.ctx) continue;
      const now = this.ctx.currentTime;
      if (Math.abs(weight - before) > 0.02) this.gains.get(layer)?.gain.setTargetAtTime(weight * LAYER_LEVEL[layer], now, FADE);
      const bed = this.bedPans.get(layer);
      if (bed && Math.abs(bed.pan.value - pan) > 0.05) bed.pan.setTargetAtTime(pan, now, 0.5);
    }
  }

  /** Where a one-off sound of `layer` comes from: one of the scenes in view that has it, picked by loudness. */
  private panFor(layer: SoundLayer): number {
    const weighted = this.sources
      .map((s) => ({ pan: s.pan, w: layerTargets(this.byScene[s.scene])[layer] * s.presence }))
      .filter((s) => s.w > 0);
    const total = weighted.reduce((a, s) => a + s.w, 0);
    let r = Math.random() * total;
    for (const s of weighted) {
      r -= s.w;
      if (r <= 0) return Math.max(-1, Math.min(1, s.pan + rand(-0.1, 0.1)));
    }
    return rand(-0.3, 0.3);
  }

  toggle(): boolean {
    if (this.on) this.stop();
    else this.start();
    return this.on;
  }

  /** Lowers everything while the narration speaks. */
  duck(ducked: boolean): void {
    // Called on every tour frame: only a change reschedules the volume.
    if (ducked === this.ducked) return;
    this.ducked = ducked;
    this.setMaster(0.8);
  }

  /** Moves to the sounds and mood of a scene. */
  setScene(scene: number): void {
    // Called on every viewport change: only a new scene reschedules the layers.
    if (scene === this.scene) return;
    this.scene = scene;
    const sounds = this.byScene[scene];
    // Without the view (no scene positions), the layers follow this scene alone.
    if (!this.centres.length) this.targets = layerTargets(sounds);
    this.gait = sounds?.gait ?? "walk";
    this.space = sounds?.space ?? "open";
    const mood = sounds?.mood ?? "calm";
    if (!this.ctx) {
      this.mood = mood;
      return;
    }
    if (!this.centres.length) {
      for (const [layer, gain] of this.gains) {
        gain.gain.setTargetAtTime(this.targets[layer] * LAYER_LEVEL[layer], this.ctx.currentTime, FADE);
      }
    }
    // The room changes with the place: its reverb crossfades over a couple of seconds.
    for (const [space, wet] of this.placeWet) {
      wet.gain.setTargetAtTime(space === this.space ? SPACE_REVERB[space].wet : 0, this.ctx.currentTime, 0.8);
    }
    if (mood !== this.mood) {
      this.mood = mood;
      this.chordIndex = 0;
      this.playChord(4);
      // The hum darkens or lightens with the story, slowly.
      const now = this.ctx.currentTime;
      this.air?.frequency.setTargetAtTime(MOOD_TONE[mood].cutoff, now, MOOD_GLIDE);
      this.humBus?.gain.setTargetAtTime(HUM_LEVEL * MOOD_TONE[mood].level, now, MOOD_GLIDE);
    }
    // A cue plays on arrival, but not again if the reader comes back within half a minute.
    const now = this.ctx.currentTime;
    if (sounds?.cue && this.on && now - (this.cuePlayed.get(scene) ?? -Infinity) > 30) {
      this.cuePlayed.set(scene, now);
      this.playCue(sounds.cue);
    }
  }

  private setMaster(seconds: number): void {
    if (!this.ctx || !this.master) return;
    const target = this.on ? (this.ducked ? DUCKED_VOLUME : MASTER_VOLUME) : 0;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, seconds / 3);
  }

  private start(): void {
    this.on = true;
    if (!this.ctx) this.build();
    void this.ctx!.resume();
    this.setMaster(3);
    this.playChord(3);
    this.scheduleChords();
    this.startEvents();
  }

  private stop(): void {
    this.on = false;
    this.setMaster(1.5);
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    window.setTimeout(() => {
      if (!this.on) void this.ctx?.suspend();
    }, 1800);
  }

  // ---------- set-up ----------

  private build(): void {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    // A long, soft reverb (a decaying noise impulse) gives the hum and the effects one shared space.
    this.reverb = ctx.createConvolver();
    this.reverb.buffer = this.impulse(4.5);
    const wet = ctx.createGain();
    wet.gain.value = 0.55;
    this.reverb.connect(wet).connect(this.master);
    // The hum: through a low-pass that slowly opens and closes.
    this.humBus = ctx.createGain();
    this.humBus.gain.value = HUM_LEVEL * MOOD_TONE[this.mood].level;
    const air = ctx.createBiquadFilter();
    air.type = "lowpass";
    air.frequency.value = MOOD_TONE[this.mood].cutoff;
    this.air = air;
    const sweep = ctx.createOscillator();
    const sweepDepth = ctx.createGain();
    sweep.frequency.value = 0.03;
    sweepDepth.gain.value = 700;
    sweep.connect(sweepDepth).connect(air.frequency);
    sweep.start();
    this.humBus.connect(air);
    air.connect(this.master);
    air.connect(this.reverb);
    // The place's acoustics, for the effects: one reverb per kind of space, crossfaded (see setScene).
    this.placeIn = ctx.createGain();
    for (const space of SPACES) {
      const { seconds, wet, damping } = SPACE_REVERB[space];
      const room = ctx.createConvolver();
      room.buffer = this.impulse(seconds, damping);
      const level = ctx.createGain();
      level.gain.value = space === this.space ? wet : 0;
      this.placeIn.connect(room).connect(level).connect(this.master);
      this.placeWet.set(space, level);
    }
    for (const layer of LAYERS) {
      const gain = ctx.createGain();
      gain.gain.value = this.targets[layer] * LAYER_LEVEL[layer];
      gain.connect(this.master);
      gain.connect(this.placeIn);
      this.gains.set(layer, gain);
      const bed = ctx.createStereoPanner();
      bed.connect(gain);
      this.bedPans.set(layer, bed);
    }
    this.seaSwell();
    void this.loadSamples();
  }

  /** A reverb's impulse: decaying noise, `seconds` long; a higher `damping` dies away faster. */
  private impulse(seconds: number, damping = 3): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** damping;
    }
    return buffer;
  }

  private async loadSamples(): Promise<void> {
    const ctx = this.ctx!;
    await Promise.all(
      SAMPLES.map(async (name) => {
        try {
          const response = await fetch(`audio/sfx/${name}.mp3`);
          this.buffers.set(name, await ctx.decodeAudioData(await response.arrayBuffer()));
        } catch {
          // A missing file only silences that sound.
        }
      }),
    );
    // Recorded beds: loops that run all the time, heard only through their layer's gain.
    this.loop("wind", "wind", 1, "highpass", 200);
    this.loop("birds", "birds", 1, "highpass", 900);
    this.loop("fire", "fire", 1, "lowpass", 5000);
    this.loop("feast", "feast", 1, "lowpass", 5000);
    this.loop("melee", "battle", 1, "lowpass", 4500);
    this.loop("handbells", "bells", 1, "lowpass", 8000);
    this.loop("chant", "chant", 1, "lowpass", 6000);
  }

  private loop(sample: Sample, layer: SoundLayer, rate: number, type: BiquadFilterType, freq: number): void {
    const ctx = this.ctx!;
    const buffer = this.buffers.get(sample);
    if (!buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    src.playbackRate.value = rate;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    src.connect(filter).connect(this.bedPans.get(layer)!);
    src.start(0, Math.random() * buffer.duration);
  }

  /** The sea's slow swell: brown noise under a low-pass, its level rising and falling like waves. */
  private seaSwell(): void {
    const ctx = this.ctx!;
    const length = ctx.sampleRate * 4;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
      data[i] = last * 3.5;
    }
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 480;
    const amp = ctx.createGain();
    amp.gain.value = 0.6;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = 0.09;
    depth.gain.value = 0.4;
    lfo.connect(depth).connect(amp.gain);
    src.connect(filter).connect(amp).connect(this.gains.get("sea")!);
    src.start();
    lfo.start();
  }

  // ---------- the hum ----------

  /** Fades the current chord out and the next chord of the mood in, over `seconds`. */
  private playChord(seconds: number): void {
    const ctx = this.ctx;
    if (!ctx || !this.humBus) return;
    const now = ctx.currentTime;
    for (const voice of this.chordVoices) {
      voice.gain.cancelScheduledValues(now);
      voice.gain.setTargetAtTime(0, now, seconds / 2.5);
      window.setTimeout(() => voice.disconnect(), (seconds * 3 + 1) * 1000);
    }
    const chords = MOOD_CHORDS[this.mood];
    const chord = chords[this.chordIndex % chords.length];
    this.chordIndex += 1;
    this.chordVoices = chord.map((midi, i) => {
      const voice = ctx.createGain();
      voice.gain.value = 0;
      voice.gain.setTargetAtTime(1 / chord.length, now, seconds / 2);
      // Each note: a pure tone, a slightly detuned soft triangle beside it, and its own slow shimmer.
      for (const [type, detune, level] of [["sine", 0, 1], ["triangle", 7, 0.25]] as const) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = note(midi);
        osc.detune.value = detune + rand(-3, 3);
        const g = ctx.createGain();
        g.gain.value = level;
        osc.connect(g).connect(voice);
        osc.start(now);
        osc.stop(now + 60);
      }
      const shimmer = ctx.createOscillator();
      const depth = ctx.createGain();
      shimmer.frequency.value = rand(0.05, 0.13) + i * 0.01;
      depth.gain.value = 0.35 / chord.length;
      shimmer.connect(depth).connect(voice.gain);
      shimmer.start(now);
      shimmer.stop(now + 60);
      voice.connect(this.humBus!);
      return voice;
    });
  }

  private scheduleChords(): void {
    const next = () => {
      if (!this.on) return;
      this.playChord(6);
      this.timers.push(window.setTimeout(next, CHORD_SECONDS[this.mood] * 1000));
    };
    this.timers.push(window.setTimeout(next, CHORD_SECONDS[this.mood] * 1000));
  }

  // ---------- recorded effects ----------

  /** A one-off cue on arriving at a scene: a war horn, or a sacred shimmer at a divine moment. */
  private playCue(cue: SoundCue): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.reverb) return;
    const sample = cue === "horn" ? "cowhorn" : pick(["shimmer1", "shimmer2"] as const);
    const buffer = this.buffers.get(sample);
    if (!buffer) return;
    const { level, cutoff, wet, attack } = CUE_SOUND[cue];
    const at = ctx.currentTime + 0.3;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = rand(0.97, 1.03);
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(level, at + attack);
    const send = ctx.createGain();
    send.gain.value = wet;
    src.connect(filter).connect(amp);
    amp.connect(this.master);
    amp.connect(send).connect(this.reverb);
    src.start(at);
  }

  /** Plays part of a sample (a slice of a sprite) into a layer. */
  private play(
    sample: Sample,
    layer: SoundLayer,
    at: number,
    opts: { offset?: number; duration?: number; level?: number; rate?: number; cutoff?: number; pan?: number } = {},
  ): void {
    const ctx = this.ctx!;
    const buffer = this.buffers.get(sample);
    if (!buffer) return;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = opts.rate ?? 1;
    const amp = ctx.createGain();
    amp.gain.value = opts.level ?? 1;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = opts.cutoff ?? 6000;
    const pan = ctx.createStereoPanner();
    pan.pan.value = opts.pan ?? this.panFor(layer);
    src.connect(filter).connect(amp).connect(pan).connect(this.gains.get(layer)!);
    src.start(at, opts.offset ?? 0, opts.duration);
  }

  /** Calls `play` every min-max seconds while `layer` is audible. */
  private every(layer: SoundLayer, min: number, max: number, play: (at: number) => void): void {
    const tick = () => {
      if (!this.on) return;
      if (this.targets[layer] > 0.05) play(this.ctx!.currentTime + 0.05);
      this.timers.push(window.setTimeout(tick, rand(min, max) * 1000));
    };
    this.timers.push(window.setTimeout(tick, rand(0.5, max) * 1000));
  }

  private startEvents(): void {
    // Hooves: one stride at a time, in the gait of the scene, with single hoofbeats picked at random.
    const stride = () => {
      if (!this.on) return;
      const rhythm = GAITS_RHYTHM[this.gait];
      if (this.targets.horses > 0.05) {
        const at = this.ctx!.currentTime + 0.05;
        // One horse per stride, from one of the scenes in view that has horses.
        const pan = this.panFor("horses");
        for (const [offset, level] of rhythm.beats) {
          const hit = Math.floor(rand(0, 6));
          this.play("hooves", "horses", at + offset + rand(0, 0.012), {
            offset: hit * 0.25, duration: 0.13, level, rate: rand(0.94, 1.04), cutoff: 3800, pan,
          });
        }
      }
      this.timers.push(window.setTimeout(stride, rhythm.stride * 1000));
    };
    stride();
    // Now and then a horse snorts or neighs: never the same recording twice in a row, and each time at a slightly
    // different pitch, so the few recordings do not sound repeated.
    let lastCall = "";
    this.every("horses", 10, 24, (at) => {
      const call = pick(HORSE_CALLS.filter((c) => c !== lastCall));
      lastCall = call;
      const neigh = call.startsWith("neigh");
      this.play(call, "horses", at, { rate: rand(0.9, 1.1), level: neigh ? 0.45 : 0.7, cutoff: neigh ? 4000 : 5000 });
    });
    // Hounds: a few barks every so often, from four recordings at varied pitch.
    this.every("hounds", 8, 18, (at) =>
      this.play(pick(["barks", "bark1", "bark2", "bark3"] as const), "hounds", at, { rate: rand(0.93, 1.07), cutoff: 3500 }),
    );
    // The hawk on Harold's wrist cries now and then, rarely.
    this.every("hawk", 25, 50, (at) => this.play(pick(["hawk1", "hawk2"] as const), "hawk", at, { rate: rand(0.95, 1.05) }));
    // At sea, the timbers creak as the ships roll.
    this.every("ships", 3.5, 8, (at) =>
      this.play(pick(["creak1", "creak2", "creak3"] as const), "ships", at, { rate: rand(0.9, 1.08), cutoff: 3000 }),
    );
    this.every("gulls", 12, 26, (at) => this.play("gulls", "gulls", at, { rate: rand(0.95, 1.05), level: 0.8 }));
    this.every("sea", 6, 11, (at) => this.play("waves", "sea", at, { rate: rand(0.9, 1.05), level: 0.6, cutoff: 2500 }));
    this.every("workshop", 1.6, 4, (at) => {
      const sample = pick(["chop", "chop", "hammer", "anvil"] as const);
      this.play(sample, "workshop", at, { rate: rand(0.95, 1.05), cutoff: 4000, level: sample === "anvil" ? 0.6 : 1 });
    });
    this.every("battle", 0.9, 2.8, (at) => {
      this.play("swords", "battle", at, { offset: Math.floor(rand(0, 6)) * 1.2, duration: 1.1, rate: rand(0.92, 1.05), cutoff: 4500, level: 0.7 });
    });
  }
}
