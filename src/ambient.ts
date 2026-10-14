// Ambient sound: a low drone and a distant drum, both generated with the Web Audio API (no file, no licence).
// Off by default; starts only on a click (browser autoplay rules).

const MASTER_VOLUME = 0.7;
const DUCKED_VOLUME = 0.2;

export class Ambient {
  on = false;
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private drumTimer = 0;
  private ducked = false;

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
  }

  private stop(): void {
    this.on = false;
    this.setLevel(1.2);
    window.clearTimeout(this.drumTimer);
    window.setTimeout(() => {
      if (!this.on) void this.ctx?.suspend();
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
