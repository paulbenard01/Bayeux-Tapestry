// Guided tour: drives the strip from the recorded narration, or at reading speed without audio.
import { prefersReducedMotion } from "./dom";
import { autoCues, cueIndexAt, cueX, positionAt, timeForScene } from "./narration";
import type { Cue, Lang, Layer, Scene } from "./types";

export type PlayerMode = "audio" | "text";

export interface PlayerHooks {
  /** Called on every frame while playing, with the strip position and the scene being narrated. */
  onFrame: (x: number, scene: number) => void;
  onStateChange: () => void;
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
    scenes: Scene[],
    lang: Lang,
    recorded: Cue[],
    private readonly hooks: PlayerHooks,
  ) {
    const auto = autoCues(layer, scenes, lang);
    if (recorded.length > 0) {
      this.mode = "audio";
      this.cues = recorded;
      this.duration = recorded[recorded.length - 1].t;
      this.audio = new Audio(`audio/narration.${lang}.mp3`);
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

  /** Starts from the beginning of the given scene. */
  play(fromScene: number): void {
    const t = timeForScene(this.cues, fromScene);
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
    this.hooks.onFrame(x, this.cues[i].scene);
    this.raf = requestAnimationFrame(this.frame);
  };
}
