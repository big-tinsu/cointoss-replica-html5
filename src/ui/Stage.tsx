import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { DESIGN_H, DESIGN_W } from "./design";

/**
 * The 1080x2340 design-space stage — same architecture as the Penaldo
 * sibling port's `ui/Stage.tsx`.
 *
 * This scene's own `CanvasScaler` is actually `ScaleWithScreenSize` with
 * `m_MatchWidthOrHeight: 1` (full match-height — `scale = h/2340`, canvas
 * width elastically follows the device aspect), not the 0.5 geometric-mean
 * split used by the sibling games. That is *why* several containers here
 * (`NavPanel`, `Interactive Pane`, `MenuPanel`, ...) are authored far wider
 * than 1080 (bleeding to roughly [-216, 1296]): on a wide/landscape device
 * Unity's own canvas literally does become that wide, revealing the bleed.
 *
 * This port deliberately keeps the shared 1080x2340-fixed-box +
 * `sqrt((w/1080)*(h/2340))` convention used across this game family instead
 * of reproducing the per-scene match-height math, so the presentation layer
 * stays architecturally identical to the sibling ports (same Stage, same
 * `rect_css` contract). At the primary 1080-wide portrait target this is
 * pixel-identical either way; the one place it diverges from a literal
 * Unity relaunch is that the wide bleed content is clipped by the stage's
 * own 1080px edge rather than revealed on very wide/landscape viewports —
 * documented in the README's "Visual fidelity" section.
 */
export function Stage({ children }: { children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = Math.sqrt((w / DESIGN_W) * (h / DESIGN_H));
      host.style.setProperty("--s", String(scale));
    };

    const schedule = () => {
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, []);

  return (
    <div className="stage-host" ref={hostRef}>
      <div className="stage">{children}</div>
    </div>
  );
}
