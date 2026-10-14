// The soundscape (content/soundscape.yaml): an ethereal hum whose chords follow the mood of the scene in view,
// with quiet recorded effects underneath (content/sounds.yaml, CC0). Off by default; starts only on a click
// (browser autoplay rules). Everything crossfades as the reader moves along the embroidery.

export const MOODS = ["calm", "journey", "sea", "omen", "solemn", "elegy", "tension", "battle"] as const;
export type Mood = (typeof MOODS)[number];
export const LAYERS = ["sea", "wind", "birds", "gulls", "horses", "hounds", "workshop", "feast", "fire", "battle"] as const;
export type SoundLayer = (typeof LAYERS)[number];
export const GAITS = ["walk", "trot", "gallop"] as const;
export type Gait = (typeof GAITS)[number];
export type SceneSounds = { mood: Mood; gait?: Gait } & Partial<Record<SoundLayer, number>>;

/** Recorded sounds, in public/audio/sfx/ (scripts/make_sounds.py). */
const SAMPLES = ["hooves", "barks", "waves", "gulls", "wind", "birds", "crowd", "fire", "anvil", "hammer", "chop", "swords"] as const;
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

/** Target weight of every effect layer for a scene; unlisted layers are silent. Pure. */
export function layerTargets(sounds: Partial<SceneSounds> | undefined): Record<SoundLayer, number> {
  const out = {} as Record<SoundLayer, number>;
  for (const layer of LAYERS) out[layer] = Math.max(0, Math.min(1, Number(sounds?.[layer] ?? 0)));
  return out;
}

/** How loud each layer is at weight 1: the effects sit well under the hum. */
const LAYER_LEVEL: Record<SoundLayer, number> = {
  sea: 0.16, wind: 0.07, birds: 0.06, gulls: 0.035, horses: 0.07, hounds: 0.035, workshop: 0.05, feast: 0.07, fire: 0.07, battle: 0.08,
};
const MASTER_VOLUME = 0.7;
const DUCKED_VOLUME = 0.2;
const HUM_LEVEL = 0.05;
/** Seconds (time constant) for layers to follow a scene change. */
const FADE = 1.5;

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

export class Soundscape {
  on = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humBus: GainNode | null = null;
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

  constructor(private readonly byScene: Record<number, SceneSounds>) {}

  toggle(): boolean {
    if (this.on) this.stop();
    else this.start();
    return this.on;
  }

  /** Lowers everything while the narration speaks. */
  duck(ducked: boolean): void {
    this.ducked = ducked;
    this.setMaster(0.8);
  }

  /** Moves to the sounds and mood of a scene. */
  setScene(scene: number): void {
    const sounds = this.byScene[scene];
    this.targets = layerTargets(sounds);
    this.gait = sounds?.gait ?? "walk";
    const mood = sounds?.mood ?? "calm";
    if (!this.ctx) {
      this.mood = mood;
      return;
    }
    for (const [layer, gain] of this.gains) {
      gain.gain.setTargetAtTime(this.targets[layer] * LAYER_LEVEL[layer], this.ctx.currentTime, FADE);
    }
    if (mood !== this.mood) {
      this.mood = mood;
      this.chordIndex = 0;
      this.playChord(4);
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
    this.humBus.gain.value = HUM_LEVEL;
    const air = ctx.createBiquadFilter();
    air.type = "lowpass";
    air.frequency.value = 2200;
    const sweep = ctx.createOscillator();
    const sweepDepth = ctx.createGain();
    sweep.frequency.value = 0.03;
    sweepDepth.gain.value = 700;
    sweep.connect(sweepDepth).connect(air.frequency);
    sweep.start();
    this.humBus.connect(air);
    air.connect(this.master);
    air.connect(this.reverb);
    for (const layer of LAYERS) {
      const gain = ctx.createGain();
      gain.gain.value = this.targets[layer] * LAYER_LEVEL[layer];
      gain.connect(this.master);
      const send = ctx.createGain();
      send.gain.value = 0.35;
      gain.connect(send).connect(this.reverb);
      this.gains.set(layer, gain);
    }
    this.seaSwell();
    void this.loadSamples();
  }

  private impulse(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const length = Math.floor(ctx.sampleRate * seconds);
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = buffer.getChannelData(ch);
      for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
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
    this.loop("crowd", "feast", 0.85, "lowpass", 650);
    this.loop("crowd", "battle", 1, "bandpass", 900);
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
    src.connect(filter).connect(this.gains.get(layer)!);
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

  /** Plays part of a sample (a slice of a sprite) into a layer. */
  private play(sample: Sample, layer: SoundLayer, at: number, opts: { offset?: number; duration?: number; level?: number; rate?: number; cutoff?: number } = {}): void {
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
    pan.pan.value = rand(-0.5, 0.5);
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
        for (const [offset, level] of rhythm.beats) {
          const hit = Math.floor(rand(0, 6));
          this.play("hooves", "horses", at + offset + rand(0, 0.012), {
            offset: hit * 0.25, duration: 0.13, level, rate: rand(0.94, 1.04), cutoff: 2800,
          });
        }
      }
      this.timers.push(window.setTimeout(stride, rhythm.stride * 1000));
    };
    stride();
    this.every("hounds", 9, 20, (at) => this.play("barks", "hounds", at, { rate: rand(0.95, 1.06), cutoff: 2400 }));
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
