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

/**
 * Clips are decoded once and played from memory.
 *
 * `new Audio(src)` per call asks the browser to resolve, fetch and decode the
 * clip before it makes a sound. That cost is variable and lands between the
 * tap and its click, so the sound trails the thing it is acknowledging.
 * Decoding up front and starting an `AudioBufferSourceNode` makes playback
 * begin on the frame it is asked for, and each play still gets its own node,
 * so overlapping taps layer rather than cutting each other off — the same
 * `PlayOneShot` semantics as before.
 *
 * An `AudioContext` cannot start before a user gesture, so the first gesture
 * primes it; until then, and where Web Audio is missing, playback falls back
 * to the element path.
 */
let ctx: AudioContext | null = null;
let decoded: AudioBuffer | null = null;
let warming = false;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
    } catch {
      return null;
    }
  }
  return ctx;
}

function warm(): void {
  if (decoded || warming) return;
  const c = context();
  if (!c) return;
  warming = true;
  void (async () => {
    try {
      const res = await fetch(CLICK_SRC);
      decoded = await c.decodeAudioData(await res.arrayBuffer());
    } catch {
      /* fall back to the element path */
    } finally {
      warming = false;
    }
  })();
}

/** Unlock audio and decode the clip. Safe to call more than once. */
export function primeSfx(): void {
  const c = context();
  if (c?.state === "suspended") void c.resume();
  warm();
}

if (typeof window !== "undefined") {
  const once = () => {
    primeSfx();
    window.removeEventListener("pointerdown", once);
    window.removeEventListener("keydown", once);
  };
  window.addEventListener("pointerdown", once, { once: true });
  window.addEventListener("keydown", once, { once: true });
}

export function playClick(): void {
  if (muted) return;
  const c = context();
  if (c && decoded) {
    try {
      const source = c.createBufferSource();
      source.buffer = decoded;
      const gain = c.createGain();
      gain.gain.value = 0.6;
      source.connect(gain).connect(c.destination);
      source.start();
      return;
    } catch {
      /* fall through to the element path */
    }
  }
  warm();
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
