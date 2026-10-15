// Guided tour: drives the strip from the recorded narration, or at reading speed without audio.
//
// The recording is played clip by clip (one per scene, or per highlights stop), never by seeking in one long file:
// seeking is unreliable on phones and on hosts without range requests, and then the voice starts from the
// beginning while the strip shows another scene. Pressing play on a scene plays that scene's clip from its start;
// when it ends, the strip travels on during the pause, then the next clip plays. The tour's clock is "virtual
// time", the time in the joined track that the cues are written in: a clip's speech starts at its cue's t.
import { prefersReducedMotion } from "./dom";
import { exclusiveVoice } from "./voice";
import { cueIndexAt, cueX, positionAt } from "./narration";
import type { Cue, Layer } from "./types";

export type PlayerMode = "audio" | "text";

/** How long the strip takes to ease from where the reader left it into the tour's path. */
const BLEND_MS = 1200;

export interface PlayerHooks {
  /** Called on every frame while playing, with the strip position and the cue being narrated. */
  onFrame: (x: number, cue: Cue) => void;
  onStateChange: () => void;
}

/** One recorded clip: its file, and the virtual time at which its speech starts (after `lead` seconds of silence). */
export interface Segment {
  t: number;
  src: string;
}

/** What the player follows: timed cues, and optionally recorded clips (the reading-speed tour without them). */
export interface TourPlan {
  text: { cues: Cue[]; duration: number };
  /**
   * `segments`: the clips in order; `lead`: the silence before the speech in each clip; `path`: where the strip is at
   * virtual time t (default: gliding from cue to cue).
   */
  audio?: { cues: Cue[]; segments: Segment[]; lead: number; path?: (t: number, duration: number) => number };
}

export class Player {
  mode: PlayerMode;
  playing = false;
  speed = 1;
  private cues: Cue[];
  private duration: number;
  /** Reading-speed tour: its clock. */
  private t = 0;
  private raf = 0;
  private last = 0;
  /** Where the strip was when play started, eased into the tour's path over BLEND_MS. */
  private blend: { offset: number; since: number | null } | null = null;
  /** The strip position of the last frame, to tell whether the reader moved it while paused. */
  lastX: number | null = null;
  /** Until this virtual time, frames show the moment the reader asked for (the clip's silent lead-in). */
  private holdUntil = -1;

  // ---------- recorded clips ----------
  private readonly audio: HTMLAudioElement | null = null;
  private readonly segments: Segment[] = [];
  private lead = 0;
  private audioPath: ((t: number, duration: number) => number) | null = null;
  /** The clip being played (or about to be), and whether the tour is in the pause after it. */
  private seg = -1;
  private gap: { t: number } | null = null;

  constructor(
    private readonly layer: Layer,
    plan: TourPlan,
    private readonly hooks: PlayerHooks,
  ) {
    if (plan.audio && plan.audio.segments.length > 0 && plan.audio.cues.length > 0) {
      this.mode = "audio";
      this.cues = plan.audio.cues;
      this.segments = plan.audio.segments;
      this.lead = plan.audio.lead;
      this.audioPath = plan.audio.path ?? null;
      this.duration = this.segments[this.segments.length - 1].t + 20;
      // The total: the last clip's start plus its length (only its header is fetched).
      const lastClip = new Audio();
      lastClip.preload = "metadata";
      lastClip.addEventListener("loadedmetadata", () => {
        this.duration = this.segments[this.segments.length - 1].t - this.lead + lastClip.duration;
        this.hooks.onStateChange();
      });
      lastClip.src = this.segments[this.segments.length - 1].src;
      const audio = exclusiveVoice(new Audio());
      audio.preload = "auto";
      this.audio = audio;
      audio.addEventListener("ended", () => this.clipEnded());
      audio.addEventListener("error", () => this.pause());
      // The clip is the clock: follow it when the browser or the system's media keys pause or resume it (the pause
      // at a clip's natural end is the tour moving on, not the reader).
      audio.addEventListener("pause", () => {
        if (!audio.ended && !this.gap) this.pause();
      });
      audio.addEventListener("play", () => {
        if (!this.playing) this.start();
      });
    } else {
      this.mode = "text";
      this.cues = plan.text.cues;
      this.duration = plan.text.duration;
    }
  }

  /** Virtual time: in a clip, its start plus how far it has played; in a pause, the pause's own clock. */
  get time(): number {
    if (!this.audio) return this.t;
    if (this.gap) return this.gap.t;
    if (this.seg < 0) return 0;
    return this.segments[this.seg].t - this.lead + this.audio.currentTime;
  }

  get total(): number {
    return this.duration;
  }

  get cueList(): Cue[] {
    return this.cues;
  }

  /**
   * Starts at virtual time t (see timeForScene and timeForStop). With a recording, the clip whose speech starts at
   * or just before t is played from its beginning. With `fromX`, the strip eases from there into the tour's path.
   */
  play(t: number, fromX?: number): void {
    if (this.audio) {
      let i = 0;
      for (let k = 0; k < this.segments.length; k++) if (this.segments[k].t <= t + 0.05) i = k;
      this.gap = null;
      this.holdUntil = this.segments[i].t;
      this.loadClip(i);
      void this.audio.play().catch(() => this.pause());
    } else {
      this.t = t;
      this.holdUntil = -1;
    }
    this.blend = fromX === undefined ? null : { offset: fromX - this.pathX(this.holdUntil >= 0 ? this.holdUntil : t), since: null };
    this.start();
  }

  /** Goes on from where it was paused: the same clip from the same word, or the same pause. */
  resume(): void {
    if (this.audio && this.seg >= 0) {
      this.blend = null;
      if (!this.gap) void this.audio.play().catch(() => this.pause());
      this.start();
      return;
    }
    this.play(this.time);
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
    if (this.audio) {
      this.audio.defaultPlaybackRate = speed;
      this.audio.playbackRate = speed;
    }
  }

  private start(): void {
    if (this.playing) return;
    this.playing = true;
    this.last = performance.now();
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.frame);
    this.hooks.onStateChange();
  }

  private loadClip(i: number): void {
    const audio = this.audio!;
    this.seg = i;
    audio.src = this.segments[i].src;
    audio.defaultPlaybackRate = this.speed;
    audio.playbackRate = this.speed;
    // Fetch the next clip ahead, so it starts without a wait.
    const next = this.segments[i + 1];
    if (next) {
      const ahead = new Audio();
      ahead.preload = "auto";
      ahead.src = next.src;
    }
  }

  /** A clip has ended: the pause before the next one (the strip travels on), or the end of the tour. */
  private clipEnded(): void {
    const next = this.segments[this.seg + 1];
    if (!next) {
      this.gap = null;
      this.pause();
      return;
    }
    this.gap = { t: this.segments[this.seg].t - this.lead + (this.audio?.duration || 0) };
  }

  private pathX(t: number): number {
    if (this.audio && this.audioPath) return this.audioPath(t, this.duration);
    return positionAt(this.layer, this.cues, t);
  }

  private frame = (now: number): void => {
    if (!this.playing) return;
    const dt = ((now - this.last) / 1000) * this.speed;
    this.last = now;
    if (!this.audio) {
      this.t += dt;
      if (this.t >= this.duration) {
        this.t = this.duration;
        this.pause();
      }
    } else if (this.gap) {
      // The pause between clips runs on its own clock; the next clip starts when its silent lead-in is due.
      this.gap.t += dt;
      const next = this.segments[this.seg + 1];
      if (next && this.gap.t >= next.t - this.lead) {
        this.gap = null;
        this.loadClip(this.seg + 1);
        void this.audio.play().catch(() => this.pause());
      }
    } else if (this.audio.readyState < 2) {
      // The clip is still loading: keep the strip where it is.
      this.raf = requestAnimationFrame(this.frame);
      return;
    }
    const t = Math.max(this.time, this.holdUntil);
    const i = Math.max(0, cueIndexAt(this.cues, t));
    // With reduced motion, step from scene to scene instead of gliding.
    let x = prefersReducedMotion() ? cueX(this.layer, this.cues[i]) : this.pathX(t);
    if (this.blend) {
      // The easing starts with the first frame actually shown (the clip may still be loading at play).
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
