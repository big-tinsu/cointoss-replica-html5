import { useEffect, useState } from "react";
import { assetUrl } from "../assetUrl";
import { ASSET_MANIFEST } from "./assetManifest";

/** Parallel requests. Enough to saturate a phone connection without
 * starving the game's own token/authenticate calls, which race this. */
const CONCURRENCY = 12;
/**
 * Ceiling on how long the boot screen will hold for art.
 *
 * This was 2.5s and the screen was documented as "a courtesy, not a gate": it
 * handed over regardless of what was still in flight, so on anything slower
 * than a warm cache the game appeared and its sprites popped in over the top
 * of it.
 *
 * It cannot simply be removed either. A full set is a few MB, which is ~19s on
 * a 1.6 Mbps connection — gating on all of it just trades pop-in for half a
 * minute of staring at a logo. So: images are fetched FIRST and are the only
 * thing the gate waits on (see `imageTotal`), audio and fonts stream in behind
 * the first frame where nothing visual depends on them, and this cap bounds
 * the worst case.
 */
const MAX_WAIT_MS = 12_000;
/** On a warm cache the whole queue resolves in one frame; hold the logo
 * long enough that it reads as a screen rather than a flash. */
const MIN_SHOW_MS = 400;

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

/* Images first: they are the only assets whose absence is *visible* as
 * pop-in, so they are what the boot gate waits on. Audio and fonts keep
 * downloading behind the first frame. */
const QUEUE = [...ASSET_MANIFEST].sort((a, b) => Number(IMAGE_RE.test(b)) - Number(IMAGE_RE.test(a)));
const imageTotal = QUEUE.filter((u) => IMAGE_RE.test(u)).length;
const total = QUEUE.length;
let loaded = 0;
let started = false;
const listeners = new Set<(n: number) => void>();

function preloadOne(url: string): Promise<void> {
  // `Image` (rather than `fetch`) for pictures: it warms the *decoded*
  // image cache, which is what makes the first painted frame cheap.
  if (IMAGE_RE.test(url)) {
    return new Promise<void>((resolve) => {
      const img = new Image();
      const finish = () => resolve();
      img.onload = finish;
      img.onerror = finish;
      img.decoding = "async";
      img.src = url;
    });
  }
  // Audio and fonts only need to reach the HTTP cache.
  return fetch(url, { credentials: "same-origin" })
    .then(() => undefined)
    .catch(() => undefined);
}

/** Runs once per page load, not once per mount — StrictMode's double-invoke
 * and any remount of the boot screen re-attach to the same queue. */
function startPreload() {
  if (started) return;
  started = true;

  let next = 0;
  const worker = async () => {
    while (next < total) {
      const url = QUEUE[next++];
      await preloadOne(assetUrl(url));
      loaded += 1;
      for (const listener of listeners) listener(loaded);
    }
  };

  void Promise.all(Array.from({ length: Math.min(CONCURRENCY, total) }, worker));
}

/**
 * Warms every file the game ships in `public/` while the boot screen is up.
 *
 * @param appReady the game's own boot gate (token + authenticate + language).
 *                 It owns the last 15% of the bar, so the screen only reads
 *                 100% when the session is genuinely playable.
 */
export function useAssetPreload(appReady: boolean): { progress: number; done: boolean } {
  const [count, setCount] = useState(loaded);
  const [expired, setExpired] = useState(false);
  const [minElapsed, setMinElapsed] = useState(false);

  useEffect(() => {
    startPreload();
    const listener = (n: number) => setCount(n);
    listeners.add(listener);
    setCount(loaded);

    const cap = window.setTimeout(() => setExpired(true), MAX_WAIT_MS);
    const min = window.setTimeout(() => setMinElapsed(true), MIN_SHOW_MS);
    return () => {
      listeners.delete(listener);
      window.clearTimeout(cap);
      window.clearTimeout(min);
    };
  }, []);

  const assetsDone = imageTotal === 0 || count >= imageTotal || expired;
  const fraction = assetsDone ? 1 : count / imageTotal;
  const progress = Math.round((fraction * 0.85 + (appReady ? 0.15 : 0)) * 100);

  return { progress, done: assetsDone && appReady && minElapsed };
}
