import { useEffect, useState } from "react";

/**
 * `DynamicUiManager.CheckDeviceType` (spec §5): `Screen.width < Screen.height
 * => mobile, else desktop`. The Unity original loads a whole separate scene
 * (`Mobile.unity`/`Desktop.unity`) once at boot and again at the start of
 * every round (`CheckAndLoadScene()`, spec §1 step 15/§5); this port keeps
 * one component tree and reacts to the same live signal purely through CSS
 * (spec §5's explicit recommendation for the HTML5 port), so no remount is
 * needed — the layout just re-measures itself continuously.
 */
export function useResponsiveLayout(): { isPortrait: boolean } {
  const [isPortrait, setIsPortrait] = useState(() => window.innerWidth < window.innerHeight);

  useEffect(() => {
    const update = () => setIsPortrait(window.innerWidth < window.innerHeight);
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
