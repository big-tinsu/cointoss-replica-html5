import { useEffect, useState } from "react";

/**
 * Viewport metrics for the unified overlays, in REAL CSS pixels.
 *
 * The three shared surfaces deliberately do NOT live in any game's design
 * space. Each game's `Stage` renders a fixed `refW x refH` box, scaled and
 * centred, and that box is frequently WIDER or NARROWER than what is actually
 * on screen (`Stage` publishes `--canvas-w`/`--canvas-h` for exactly this
 * reason). An overlay positioned with `inset: 0` therefore covers the
 * reference box, not the screen: on a 19.5:9 phone the reference box hangs
 * off both sides, so a left-anchored drawer loses its left edge and a
 * full-bleed dark panel covers the viewport with its content pushed out of
 * view — which reads as the game having gone blank.
 *
 * So the kit escapes the stage transform (see `UOverlay`'s portal) and sizes
 * itself from the viewport. In real pixels no per-game scaling is needed at
 * all, which is also what makes the surfaces genuinely identical across all
 * eleven games rather than merely proportional within each one.
 */
export type UMetrics = {
  vw: number;
  vh: number;
  portrait: boolean;
  fs: { display: number; title: number; body: number; label: number; caption: number; micro: number };
  sp: { xs: number; sm: number; md: number; lg: number; xl: number };
  radius: { sm: number; md: number; pill: number };
  /** Left drawer width. */
  drawerW: number;
  /** Page surface: full-bleed when portrait, a centred card when wide. */
  panelW: number;
  panelH: number;
  /** Square hit target (44px, the platform minimum). */
  tap: number;
};

/** Type scale, in CSS px. Identical in every game. */
const FS = { display: 22, title: 18, body: 15, label: 13, caption: 11.5, micro: 10 } as const;

/** Spacing scale, in CSS px. */
const SP = { xs: 4, sm: 8, md: 14, lg: 20, xl: 30 } as const;

const RADIUS = { sm: 6, md: 10, pill: 999 } as const;

function read(): { w: number; h: number } {
  if (typeof window === "undefined") return { w: 390, h: 844 };
  return { w: window.innerWidth, h: window.innerHeight };
}

export function metrics(vw: number, vh: number): UMetrics {
  const portrait = vh >= vw;
  return {
    vw,
    vh,
    portrait,
    fs: { ...FS },
    sp: { ...SP },
    radius: { ...RADIUS },
    // Capped so a wide desktop gets a drawer, not half the screen.
    drawerW: Math.min(vw * 0.86, 380),
    panelW: portrait ? vw : Math.min(vw * 0.92, 680),
    panelH: portrait ? vh : Math.min(vh * 0.9, 860),
    tap: 44,
  };
}

/** Live viewport metrics; re-renders the overlay on resize/rotate. */
export function useUnified(): UMetrics {
  const [size, setSize] = useState(read);

  useEffect(() => {
    let frame = 0;
    const onResize = () => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        setSize(read());
      });
    };
    window.addEventListener("resize", onResize, { passive: true });
    window.addEventListener("orientationchange", onResize, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, []);

  return metrics(size.w, size.h);
}
