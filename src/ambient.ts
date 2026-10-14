// Ambient sound: public-domain chant recordings over a low drone and a distant drum, both generated with
// the Web Audio API (no file, no licence). Off by default; starts only on a click (browser autoplay rules).
import { media } from "./content";

/** Seconds of silence between two chants. */
const GAP_SECONDS = 9;
const MASTER_VOLUME = 0.7;
const DUCKED_VOLUME = 0.2;

export class Ambient {
  on = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private chant: HTMLAudioElement | null = null;
  private chantIndex = 0;
  private drumTimer = 0;
  private chantTimer = 0;
  private ducked = false;
  private readonly chants = Object.values(media)
    .filter((m) => m.kind === "audio")
    .map((m) => m.file);

  toggle(): boolean {
    if (this.on) this.stop();
    else this.start();
    return this.on;
  }

  /** Lowers the ambience while the narration speaks. */
  duck(ducked: boolean): void {
    this.ducked = ducked;
    this.setLevel(0.8);
  }

  private setLevel(seconds: number): void {
    if (!this.ctx || !this.master) return;
    const target = this.on ? (this.ducked ? DUCKED_VOLUME : MASTER_VOLUME) : 0;
    this.master.gain.cancelScheduledValues(this.ctx.currentTime);
    this.master.gain.setTargetAtTime(target, this.ctx.currentTime, seconds / 3);
  }

  private start(): void {
    this.on = true;
    if (!this.ctx) this.build();
    void this.ctx!.resume();
    this.setLevel(2.5);
    this.scheduleDrum();
    if (this.chant?.paused) this.playChant();
  }

  private stop(): void {
    this.on = false;
    this.setLevel(1.2);
    window.clearTimeout(this.drumTimer);
    window.clearTimeout(this.chantTimer);
    window.setTimeout(() => {
      if (!this.on) {
        this.chant?.pause();
        void this.ctx?.suspend();
      }
    }, 1500);
  }

  private build(): void {
    const ctx = new AudioContext();
    this.ctx = ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // Drone: an open fifth (D2, A2) on soft sawtooths through a slowly breathing low-pass filter.
    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 0.7;
    const lfo = ctx.createOscillator();
    const lfoDepth = ctx.createGain();
    lfo.frequency.value = 0.05;
    lfoDepth.gain.value = 120;
    lfo.connect(lfoDepth).connect(filter.frequency);
    lfo.start();
    const droneGain = ctx.createGain();
    droneGain.gain.value = 0.045;
    filter.connect(droneGain).connect(this.master);
    for (const [freq, detune] of [
      [73.42, -4],
      [73.42, 5],
      [110, 0],
    ]) {
      const osc = ctx.createOscillator();
      osc.type = "sawtooth";
      osc.frequency.value = freq;
      osc.detune.value = detune;
      osc.connect(filter);
      osc.start();
    }

    // Chant: an audio element routed through the same master gain.
    if (this.chants.length > 0) {
      this.chant = new Audio();
      this.chant.preload = "none";
      const chantGain = ctx.createGain();
      chantGain.gain.value = 0.55;
      ctx.createMediaElementSource(this.chant).connect(chantGain).connect(this.master);
      this.chant.addEventListener("ended", () => this.nextChant());
      // A missing file (not fetched yet) is skipped rather than stopping the ambience.
      this.chant.addEventListener("error", () => this.nextChant());
    }
  }

  private playChant(): void {
    if (!this.chant || !this.on) return;
    this.chant.src = this.chants[this.chantIndex % this.chants.length];
    void this.chant.play().catch(() => undefined);
  }

  private nextChant(): void {
    this.chantIndex += 1;
    window.clearTimeout(this.chantTimer);
    this.chantTimer = window.setTimeout(() => this.playChant(), GAP_SECONDS * 1000);
  }

  /** A soft, distant drum beat every 7 to 13 seconds: filtered noise with a slow decay. */
  private scheduleDrum(): void {
    window.clearTimeout(this.drumTimer);
    if (!this.on) return;
    this.drumTimer = window.setTimeout(() => {
      this.drum();
      this.scheduleDrum();
    }, 7000 + Math.random() * 6000);
  }

  private drum(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master) return;
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.18));
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const low = ctx.createBiquadFilter();
    low.type = "lowpass";
    low.frequency.value = 110;
    const gain = ctx.createGain();
    gain.gain.value = 0.5;
    source.connect(low).connect(gain).connect(this.master);
    source.start();
  }
}
