import { useEffect, useState } from "react";

export type ExpectedDevice = "mobile" | "desktop";

export interface OrientationGuardState {
  mismatch: boolean;
  messageKey: string;
}

/**
 * `GameManager.DisplayOrientationMessage`/`DynamicUiManager.CheckDeviceType`
 * (`GameManager.cs:589-607`, spec §1 step 17, §5, §7 Prefabs section) — the
 * ONE game of the three siblings where this overlay is real, not dead code.
 *
 * The source computes `UserDevice` ONCE at scene `Start()` from an
 * aspect-ratio check (`Screen.width < Screen.height` => mobile), then every
 * `Update()` frame compares that fixed expectation against the LIVE
 * `Screen.width`/`Screen.height` and shows/hides a "please rotate" overlay on
 * mismatch — it is a warning overlay, not a scene swap (§1 step 17 clarifies
 * both exist as separate systems, and only the former is live).
 *
 * Reproduced here as: compute `expectedDevice` once at mount (same aspect
 * check), then react to live orientation via `matchMedia('(orientation:
 * portrait)')` change events — NOT a per-frame polling loop, since the spec
 * itself flags `Update()`-polling as a game-loop pattern not to replicate
 * literally in a non-game-loop web app.
 */
export function useOrientationGuard(): OrientationGuardState {
  const [expectedDevice] = useState<ExpectedDevice>(() =>
    window.innerWidth < window.innerHeight ? "mobile" : "desktop",
  );
  const [isPortraitNow, setIsPortraitNow] = useState(
    () => window.matchMedia("(orientation: portrait)").matches,
  );

  useEffect(() => {
    const mql = window.matchMedia("(orientation: portrait)");
    const update = () => setIsPortraitNow(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);

  const mismatch =
    (expectedDevice === "mobile" && !isPortraitNow) || (expectedDevice === "desktop" && isPortraitNow);

  const messageKey =
    expectedDevice === "mobile"
      ? "For the best experience, rotate your device to portrait. To play in landscape, reload while holding your device sideways or wait until this round ends."
      : "For the best experience, rotate your device to landscape. To play in portrait, reload while holding your device upright or wait until this round ends.";

  return { mismatch, messageKey };
}
