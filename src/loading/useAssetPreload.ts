import { useEffect, useState } from "react";
import { ASSET_MANIFEST } from "./assetManifest";

const BASE = import.meta.env.BASE_URL;

/** Parallel requests. Enough to saturate a phone connection without
 * starving the game's own token/authenticate calls, which race this. */
const CONCURRENCY = 12;
/**
 * The boot screen is a courtesy, not a gate. It yields to the game after this
 * long no matter how much art is left; the queue keeps running behind the
 * first frame, so a slow connection costs a few late-decoded sprites rather
 * than ten seconds of staring at a logo.
 */
const MAX_WAIT_MS = 2_500;
/** On a warm cache the whole queue resolves in one frame; hold the logo
 * long enough that it reads as a screen rather than a flash. */
const MIN_SHOW_MS = 400;

const IMAGE_RE = /\.(png|jpe?g|gif|webp|avif|svg)$/i;

const total = ASSET_MANIFEST.length;
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
      const url = ASSET_MANIFEST[next++];
      await preloadOne(BASE + url);
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

  const assetsDone = total === 0 || count >= total || expired;
  const fraction = assetsDone ? 1 : count / total;
  const progress = Math.round((fraction * 0.85 + (appReady ? 0.15 : 0)) * 100);

  return { progress, done: assetsDone && appReady && minElapsed };
}
