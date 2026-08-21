import { useEffect, useRef } from "react";

/**
 * TMP's `m_enableAutoSizing` shrink-to-fit behaviour, reproduced by
 * measuring once per content change and stepping the font size down until
 * the text fits its rect. Runs in a layout effect off the render, never per
 * animation frame — costs nothing during play. (Same helper as the Penaldo
 * sibling port's `ui/useAutoFit.ts`; used here for the balance value and
 * stake display, whose digit count varies.)
 */
export function useAutoFit<T extends HTMLElement>(max: number, min: number, deps: unknown[]) {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let size = max;
    el.style.fontSize = `${size}px`;
    const floor = Math.max(min, 1);
    let guard = 24;
    while (
      guard-- > 0 &&
      size > floor &&
      (el.scrollWidth > el.clientWidth + 0.5 || el.scrollHeight > el.clientHeight + 0.5)
    ) {
      size = Math.max(floor, size - Math.max(0.5, size * 0.06));
      el.style.fontSize = `${size}px`;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [max, min, ...deps]);

  return ref;
}
