// One voice at a time: the tour's narration, a Latin caption, a scene read in the text view, the listen-only
// player or an afterlife slide. Starting one pauses whichever was speaking.

let speaking: HTMLMediaElement | null = null;

/** Marks `el` as the voice now speaking, pausing the previous one. */
export function claimVoice(el: HTMLMediaElement): void {
  if (speaking && speaking !== el && !speaking.paused) speaking.pause();
  speaking = el;
}

/** Makes `el` claim the voice whenever it starts playing (for elements with their own controls). */
export function exclusiveVoice<T extends HTMLMediaElement>(el: T): T {
  el.addEventListener("play", () => claimVoice(el));
  return el;
}
