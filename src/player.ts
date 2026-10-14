// Guided tour: drives the strip from the recorded narration, or at reading speed without audio.
import { prefersReducedMotion } from "./dom";
import { cueIndexAt, cueX, positionAt } from "./narration";
import type { Cue, Layer } from "./types";

export type PlayerMode = "audio" | "text";

export interface PlayerHooks {
  /** Called on every frame while playing, with the strip position and the cue being narrated. */
  onFrame: (x: number, cue: Cue) => void;
  onStateChange: () => void;
}

/** What the player follows: timed cues, and optionally a recorded track that falls back to `text` if missing. */
export interface TourPlan {
  text: { cues: Cue[]; duration: number };
  audio?: { src: string; cues: Cue[] };
}

export class Player {
  mode: PlayerMode;
  playing = false;
  speed = 1;
  private cues: Cue[];
  private duration: number;
  private t = 0;
  private audio: HTMLAudioElement | null = null;
  private raf = 0;
  private last = 0;

  constructor(
    private readonly layer: Layer,
    plan: TourPlan,
    private readonly hooks: PlayerHooks,
  ) {
    const auto = plan.text;
    const recorded = plan.audio?.cues ?? [];
    if (plan.audio && recorded.length > 0) {
      this.mode = "audio";
      this.cues = recorded;
      this.duration = recorded[recorded.length - 1].t;
      this.audio = new Audio(plan.audio.src);
      this.audio.preload = "none";
      this.audio.addEventListener("loadedmetadata", () => {
        if (this.audio) this.duration = this.audio.duration;
      });
      // No recording deployed yet: fall back to the reading-speed tour.
      this.audio.addEventListener("error", () => {
        this.audio = null;
        this.mode = "text";
        this.cues = auto.cues;
        this.duration = auto.duration;
        this.hooks.onStateChange();
      });
      this.audio.addEventListener("ended", () => this.pause());
    } else {
      this.mode = "text";
      this.cues = auto.cues;
      this.duration = auto.duration;
    }
  }

  get time(): number {
    return this.audio ? this.audio.currentTime : this.t;
  }

  get total(): number {
    return this.duration;
  }

  get cueList(): Cue[] {
    return this.cues;
  }

  /** Starts at time t (see timeForScene and timeForStop). */
  play(t: number): void {
    if (this.audio) {
      this.audio.currentTime = t;
      this.audio.playbackRate = this.speed;
      void this.audio.play().catch(() => this.pause());
    } else {
      this.t = t;
    }
    this.playing = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.hooks.onStateChange();
  }

  pause(): void {
    if (!this.playing) return;
    this.playing = false;
    this.audio?.pause();
    cancelAnimationFrame(this.raf);
    this.hooks.onStateChange();
  }

  setSpeed(speed: number): void {
    this.speed = speed;
    if (this.audio) this.audio.playbackRate = speed;
  }

  private frame = (now: number): void => {
    if (!this.playing) return;
    if (!this.audio) {
      this.t += ((now - this.last) / 1000) * this.speed;
      if (this.t >= this.duration) {
        this.t = this.duration;
        this.pause();
      }
    }
    this.last = now;
    const t = this.time;
    const i = Math.max(0, cueIndexAt(this.cues, t));
    // With reduced motion, step from scene to scene instead of gliding.
    const x = prefersReducedMotion() ? cueX(this.layer, this.cues[i]) : positionAt(this.layer, this.cues, t);
    this.hooks.onFrame(x, this.cues[i]);
    this.raf = requestAnimationFrame(this.frame);
  };
}
