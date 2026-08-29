// `VirtualCashManager.playButtonClick()` (README "Sound") — the one confirmed
// live sound in the source. Cached as a fresh `Audio` per play so overlapping
// taps don't cut each other off (matching Unity's `PlayOneShot` semantics).
// This is presentation-layer polish, not game logic: it plays on UI taps only
// and never gates any bet/round outcome.
import { assetUrl } from "../assetUrl";

const CLICK_SRC = assetUrl("assets/sound/button-click.wav");

let muted = false;
export function setMuted(value: boolean): void {
  muted = value;
}
export function isMuted(): boolean {
  return muted;
}

export function playClick(): void {
  if (muted) return;
  try {
    const audio = new Audio(CLICK_SRC);
    audio.volume = 0.6;
    void audio.play().catch(() => {
      /* Autoplay can be blocked before the first user gesture — ignore. */
    });
  } catch {
    /* no-op in non-browser/test environments */
  }
}
