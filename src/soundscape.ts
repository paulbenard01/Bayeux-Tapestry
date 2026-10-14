// The soundscape: sounds that follow the scene in view (content/soundscape.yaml), all generated with the Web
// Audio API (no file, no licence). Off by default; starts only on a click (browser autoplay rules). Each layer
// has its own gain; moving along the embroidery crossfades the layers over a second or two.

export const LAYERS = ["court", "sea", "wind", "horses", "hounds", "workshop", "feast", "church", "funeral", "battle"] as const;
export type SoundLayer = (typeof LAYERS)[number];
export type SceneSounds = Partial<Record<SoundLayer, number>>;

const MASTER_VOLUME = 0.75;
const DUCKED_VOLUME = 0.2;
/** Seconds for a layer to fade to its new level (time constant). */
const FADE = 1.2;

/** Target gain of every layer for a scene; layers it does not list are silent. Pure. */
export function layerTargets(sounds: SceneSounds | undefined): Record<SoundLayer, number> {
  const out = {} as Record<SoundLayer, number>;
  for (const layer of LAYERS) out[layer] = Math.max(0, Math.min(1, sounds?.[layer] ?? 0));
  return out;
}

const rand = (a: number, b: number) => a + Math.random() * (b - a);

export class Soundscape {
  on = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private readonly gains = new Map<SoundLayer, GainNode>();
  private targets = layerTargets(undefined);
  private noise: AudioBuffer | null = null;
  private brown: AudioBuffer | null = null;
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

  /** Fades to the sounds of a scene. */
  setScene(scene: number): void {
    this.targets = layerTargets(this.byScene[scene]);
    if (!this.ctx) return;
    for (const [layer, gain] of this.gains) gain.gain.setTargetAtTime(this.targets[layer], this.ctx.currentTime, FADE);
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
    this.setMaster(2.5);
    this.startEvents();
  }

  private stop(): void {
    this.on = false;
    this.setMaster(1.2);
    for (const t of this.timers) window.clearTimeout(t);
    this.timers = [];
    window.setTimeout(() => {
      if (!this.on) void this.ctx?.suspend();
    }, 1500);
  }

  // ---------- building blocks ----------

  private build(): void {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);
    // Two seconds of white noise, and brown noise (integrated white) for the sea.
    const length = ctx.sampleRate * 2;
    this.noise = ctx.createBuffer(1, length, ctx.sampleRate);
    this.brown = ctx.createBuffer(1, length, ctx.sampleRate);
    const white = this.noise.getChannelData(0);
    const brown = this.brown.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      white[i] = Math.random() * 2 - 1;
      last = (last + 0.02 * white[i]) / 1.02;
      brown[i] = last * 3.5;
    }
    for (const layer of LAYERS) {
      const gain = ctx.createGain();
      gain.gain.value = this.targets[layer];
      gain.connect(this.master);
      this.gains.set(layer, gain);
    }
    this.buildBeds();
  }

  private out(layer: SoundLayer): GainNode {
    return this.gains.get(layer)!;
  }

  /** A looping noise source through a filter, its level slowly breathing (an LFO). */
  private bed(layer: SoundLayer, buffer: AudioBuffer, type: BiquadFilterType, freq: number, q: number, level: number, lfoHz: number, lfoDepth: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.value = level;
    const lfo = ctx.createOscillator();
    const depth = ctx.createGain();
    lfo.frequency.value = lfoHz;
    depth.gain.value = lfoDepth;
    lfo.connect(depth).connect(amp.gain);
    src.connect(filter).connect(amp).connect(this.out(layer));
    src.start(0, Math.random() * 2);
    lfo.start();
  }

  /** A sustained chord of soft tones through a low-pass filter. */
  private chord(layer: SoundLayer, freqs: number[], level: number, type: OscillatorType, cutoff: number): void {
    const ctx = this.ctx!;
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = cutoff;
    const amp = ctx.createGain();
    amp.gain.value = level;
    filter.connect(amp).connect(this.out(layer));
    freqs.forEach((f, i) => {
      for (const detune of [-4, 4]) {
        const osc = ctx.createOscillator();
        osc.type = type;
        osc.frequency.value = f;
        osc.detune.value = detune + i;
        osc.connect(filter);
        osc.start();
      }
    });
  }

  private buildBeds(): void {
    const noise = this.noise!;
    const brown = this.brown!;
    // Court: the low open fifth (D2, A2) of the old drone.
    this.chord("court", [73.42, 110], 0.05, "sawtooth", 380);
    // Sea: brown noise under a low-pass, swelling like waves.
    this.bed("sea", brown, "lowpass", 520, 0.6, 0.35, 0.11, 0.3);
    // Wind in the sails: a breathing band of noise.
    this.bed("wind", noise, "bandpass", 650, 0.9, 0.12, 0.07, 0.1);
    // Feast: a murmur of voices, several narrow bands of noise moving independently.
    for (const f of [320, 470, 650, 880]) this.bed("feast", noise, "bandpass", f, 6, 0.09, rand(0.3, 0.9), 0.08);
    // Battle: the roar of a crowd.
    this.bed("battle", noise, "bandpass", 420, 0.7, 0.22, 0.23, 0.15);
    // Church: a slow major chord (D3, F#3, A3, D4); funeral: a darker minor one (D3, F3, A3).
    this.chord("church", [146.83, 185, 220, 293.66], 0.035, "triangle", 900);
    this.chord("funeral", [146.83, 174.61, 220], 0.04, "triangle", 700);
  }

  // ---------- events (each fires only while its layer is audible) ----------

  private every(layer: SoundLayer, min: number, max: number, play: () => void): void {
    const tick = () => {
      if (!this.on) return;
      if (this.targets[layer] > 0.05) play();
      this.timers.push(window.setTimeout(tick, rand(min, max) * 1000));
    };
    this.timers.push(window.setTimeout(tick, rand(0, max) * 1000));
  }

  /** A short burst of filtered noise with a fast attack and an exponential decay. */
  private burst(layer: SoundLayer, at: number, type: BiquadFilterType, freq: number, q: number, level: number, decay: number): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise!;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(level, at + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    src.connect(filter).connect(amp).connect(this.out(layer));
    src.start(at, Math.random());
    src.stop(at + decay + 0.05);
  }

  /** A struck tone: a few inharmonic partials decaying together (metal, bells, cups). */
  private strike(layer: SoundLayer, at: number, base: number, ratios: number[], level: number, decay: number): void {
    const ctx = this.ctx!;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(level, at + 0.003);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    amp.connect(this.out(layer));
    ratios.forEach((r, i) => {
      const osc = ctx.createOscillator();
      osc.frequency.value = base * r;
      const partial = ctx.createGain();
      partial.gain.value = 1 / (i + 1);
      osc.connect(partial).connect(amp);
      osc.start(at);
      osc.stop(at + decay + 0.05);
    });
  }

  /** A bark: a falling, rough tone through a voice-like band, with a breath of noise. */
  private bark(at: number): void {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    const f = rand(380, 520);
    osc.frequency.setValueAtTime(f, at);
    osc.frequency.exponentialRampToValueAtTime(f * 0.55, at + 0.13);
    const band = ctx.createBiquadFilter();
    band.type = "bandpass";
    band.frequency.value = rand(900, 1300);
    band.Q.value = 2.5;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0, at);
    amp.gain.linearRampToValueAtTime(0.35, at + 0.01);
    amp.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    osc.connect(band).connect(amp).connect(this.out("hounds"));
    osc.start(at);
    osc.stop(at + 0.2);
    this.burst("hounds", at, "bandpass", 1500, 1, 0.12, 0.1);
  }

  private startEvents(): void {
    const now = () => this.ctx!.currentTime + 0.05;
    // Horses: a canter, three hoofbeats per stride.
    this.every("horses", 0.42, 0.5, () => {
      const t = now();
      for (const [dt, level] of [[0, 0.5], [0.08, 0.4], [0.17, 0.55]] as const) {
        this.burst("horses", t + dt + rand(0, 0.015), "lowpass", 260, 1, level, 0.09);
      }
    });
    // Hounds: one to three barks every few seconds.
    this.every("hounds", 3, 7, () => {
      const t = now();
      const barks = 1 + Math.floor(rand(0, 3));
      for (let i = 0; i < barks; i++) this.bark(t + i * rand(0.22, 0.32));
    });
    // Workshop: axes on wood and hammers on metal, unevenly.
    this.every("workshop", 0.5, 1.4, () => {
      if (Math.random() < 0.55) this.burst("workshop", now(), "lowpass", 420, 0.8, 0.6, 0.12);
      else this.strike("workshop", now(), rand(1500, 1900), [1, 2.76, 5.4], 0.12, 0.35);
    });
    // Feast: cups knocking together now and then.
    this.every("feast", 2.5, 6, () => this.strike("feast", now(), rand(2400, 3200), [1, 2.3], 0.05, 0.25));
    // Funeral: a slow bell.
    this.every("funeral", 6, 7, () => this.strike("funeral", now(), 196, [1, 2, 2.4, 3, 4.2], 0.12, 4.5));
    // Battle: clashing blades, distant drums, arrows.
    this.every("battle", 0.25, 1.1, () => {
      const t = now();
      this.burst("battle", t, "highpass", 3000, 0.7, 0.25, 0.05);
      this.strike("battle", t, rand(1800, 2600), [1, 2.7, 4.1], 0.06, 0.3);
    });
    this.every("battle", 1.6, 2.4, () => this.burst("battle", now(), "lowpass", 110, 1, 0.8, 0.5));
    this.every("battle", 2, 5, () => this.burst("battle", now(), "bandpass", 2400, 3, 0.12, 0.25));
  }
}
