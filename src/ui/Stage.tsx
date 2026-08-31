import { useEffect, useRef } from "react";
import type { ReactNode } from "react";

/**
 * Unity `CanvasScaler` in `ScaleWithScreenSize` mode, implemented exactly.
 *
 * Each Unity scene declares its own reference resolution, screen-match mode
 * and match factor, and each game ships TWO scenes (Mobile and Desktop — see
 * `design.ts` and `design.desktop.ts`), so the scaler has to be data-driven
 * rather than a hardcoded formula. The previous implementation hardcoded
 * `scale = h / refH`, which is only the correct collapse of the general
 * formula when `matchWidthOrHeight === 1`; the Diced desktop scene is
 * 0.75/Expand and the Streetsoccer desktop scene is 0.5, so that hardcoding
 * mis-scaled every element outside the mobile scene.
 *
 * Unity's own definitions (`CanvasScaler.HandleScaleWithScreenSize`):
 *
 *   MatchWidthOrHeight: scale = 2 ^ ((1-m)*log2(w/refW) + m*log2(h/refH))
 *   Expand:             scale = min(w/refW, h/refH)
 *   Shrink:             scale = max(w/refW, h/refH)
 *
 * The stage is a fixed refW x refH box scaled by that factor and centred;
 * every descendant positions itself with `position: absolute` and raw
 * design-space px. Wherever the scaled box does not reach, the page
 * background shows through — which is why the scenes' own full-bleed
 * backdrops are authored slightly wider than the reference width.
 *
 * One resize listener, coalesced onto an animation frame, writes CSS custom
 * properties — no React state, so a resize never re-renders the tree.
 */
export type ScreenMatchMode = "MatchWidthOrHeight" | "Expand" | "Shrink";

export type CanvasSpec = {
  refW: number;
  refH: number;
  match: number;
  mode: ScreenMatchMode;
};

export function canvasScale(spec: CanvasSpec, w: number, h: number): number {
  const rw = w / spec.refW;
  const rh = h / spec.refH;
  switch (spec.mode) {
    case "Expand":
      return Math.min(rw, rh);
    case "Shrink":
      return Math.max(rw, rh);
    default:
      return Math.pow(2, (1 - spec.match) * Math.log2(rw) + spec.match * Math.log2(rh));
  }
}

export function Stage({ spec, children }: { spec: CanvasSpec; children: ReactNode }) {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let frame = 0;

    const apply = () => {
      frame = 0;
      const w = window.innerWidth;
      const h = window.innerHeight;
      const scale = canvasScale(spec, w, h);
      host.style.setProperty("--s", String(scale));
      host.style.setProperty("--ref-w", `${spec.refW}px`);
      host.style.setProperty("--ref-h", `${spec.refH}px`);
      // Visible canvas in design-space units: wider than the reference on a
      // viewport whose aspect is wider than the design's.
      host.style.setProperty("--canvas-w", `${w / scale}px`);
      host.style.setProperty("--canvas-h", `${h / scale}px`);
    };

    // The on-screen keyboard shrinks `window.innerHeight` on mobile and fires
    // `resize`. Rescaling to that reduced height shrinks the entire game while
    // the player is typing a stake, which is not what the resize means: the
    // window did not change, the keyboard just covered part of it. So while a
    // field has focus the scale is held, and re-applied once focus leaves and
    // the viewport is whole again.
    const isTyping = () => {
      const el = document.activeElement as HTMLElement | null;
      if (!el) return false;
      return el.tagName === "INPUT" || el.tagName === "TEXTAREA" || el.isContentEditable;
    };

    const schedule = () => {
      if (isTyping()) return;
      if (frame) return;
      frame = requestAnimationFrame(apply);
    };

    apply();
    window.addEventListener("resize", schedule, { passive: true });
    window.addEventListener("focusout", schedule, { passive: true });
    window.addEventListener("orientationchange", schedule, { passive: true });
    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("resize", schedule);
    window.removeEventListener("focusout", schedule);
      window.removeEventListener("orientationchange", schedule);
    };
  }, [spec]);

  return (
    <div className="stage-host" ref={hostRef}>
      <div className="stage">{children}</div>
    </div>
  );
}
