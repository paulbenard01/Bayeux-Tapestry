// Guided tour: drives the strip from the recorded narration, or at reading speed without audio.
import { prefersReducedMotion } from "./dom";
import { cueIndexAt, cueX, NARRATION_HOLD, positionAt } from "./narration";
import type { Cue, Layer } from "./types";

export type PlayerMode = "audio" | "text";

/** How long the strip takes to ease from where the reader left it into the tour's path. */
const BLEND_MS = 1200;

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
  /** Where the strip was when play started, eased into the tour's path over BLEND_MS. */
  private blend: { offset: number; since: number | null } | null = null;
  /** The strip position of the last frame, to tell whether the reader moved it while paused. */
  lastX: number | null = null;
  /** Until this time (the pre-roll), frames show the moment the reader asked for. */
  private holdUntil = -1;

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
      const audio = new Audio(plan.audio.src);
      this.audio = audio;
      audio.preload = "metadata";
      audio.addEventListener("loadedmetadata", () => {
        this.duration = audio.duration;
        this.hooks.onStateChange();
      });
      audio.addEventListener("error", () => {
        if (audio.readyState === 0 && !this.playing) {
          // No recording deployed: fall back to the reading-speed tour.
          this.audio = null;
          this.mode = "text";
          this.cues = auto.cues;
          this.duration = auto.duration;
          this.hooks.onStateChange();
        } else {
          // A network error mid-way: stop rather than let the strip and the voice drift apart.
          this.pause();
        }
      });
      // The track is the clock: follow it when the browser or the system media keys pause or resume it.
      audio.addEventListener("pause", () => this.pause());
      audio.addEventListener("play", () => {
        if (!this.playing) this.start();
      });
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

  /**
   * Starts at time t (see timeForScene and timeForStop). With `fromX`, the strip eases from there into the
   * tour's path instead of jumping. With `preroll`, the track starts that many seconds earlier, in the silence
   * before t, while the strip and the caption already show what begins at t.
   */
  play(t: number, fromX?: number, preroll = 0): void {
    this.holdUntil = preroll > 0 ? t : -1;
    if (this.audio) {
      const from = t - preroll;
      if (Math.abs(this.audio.currentTime - from) > 0.05) this.audio.currentTime = from;
      this.audio.playbackRate = this.speed;
      void this.audio.play().catch(() => this.pause());
    } else {
      this.t = t;
    }
    this.blend = fromX === undefined ? null : { offset: fromX - this.pathX(t), since: null };
    this.start();
  }

  /** Goes on from where it was paused. */
  resume(): void {
    this.play(this.time);
  }

  private start(): void {
    if (this.playing) return;
    this.playing = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
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

  private pathX(t: number): number {
    // Recorded scenes rest on their scene before gliding on; the reading-speed tours glide all along.
    return positionAt(this.layer, this.cues, t, this.audio ? NARRATION_HOLD : 0);
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
    // While the track seeks or buffers its position is not reliable: keep the strip where it is.
    if (this.audio && (this.audio.seeking || this.audio.readyState < 2)) {
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const t = Math.max(this.time, this.holdUntil);
    const i = Math.max(0, cueIndexAt(this.cues, t));
    // With reduced motion, step from scene to scene instead of gliding.
    let x = prefersReducedMotion() ? cueX(this.layer, this.cues[i]) : this.pathX(t);
    if (this.blend) {
      // The easing starts with the first frame actually shown (the track may still be loading at play).
      this.blend.since ??= now;
      const k = (now - this.blend.since) / BLEND_MS;
      if (k >= 1 || prefersReducedMotion()) this.blend = null;
      else x += this.blend.offset * (1 - k * k * (3 - 2 * k));
    }
    this.lastX = x;
    this.hooks.onFrame(x, this.cues[i]);
    this.raf = requestAnimationFrame(this.frame);
  };
}
