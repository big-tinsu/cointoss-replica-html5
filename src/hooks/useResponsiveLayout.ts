import { useEffect, useState } from "react";

/**
 * `DynamicUiManager` (spec §5): Desktop.unity/Mobile.unity are two full
 * static scenes in the source, but the actual scene-swap machinery
 * (`LoadGameSceneAsync`/`CheckAndLoadScene`) has zero call sites anywhere —
 * confirmed dead code. Per the spec's explicit recommendation, this port
 * builds ONE responsive component tree with CSS breakpoints reacting live to
 * viewport shape, rather than two divergent trees / a scene reload.
 */
export function useResponsiveLayout(): { isPortrait: boolean } {
  const [isPortrait, setIsPortrait] = useState(() => window.innerHeight > window.innerWidth);

  useEffect(() => {
    const update = () => setIsPortrait(window.innerHeight > window.innerWidth);
    update();
    window.addEventListener("resize", update);
    window.addEventListener("orientationchange", update);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("orientationchange", update);
    };
  }, []);

  return { isPortrait };
}
