import { useLanguage } from "../i18n/LanguageContext";
import { useOrientationGuard } from "../hooks/useOrientationGuard";
import { C, img } from "../ui/design";
import { Spr, Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
/** `PortraitOrientationWarning`/`GameManager.DisplayOrientationMessage`
 * (spec §1 step 17, §7 Prefabs) — the one game of the three siblings where
 * this "please rotate your device" overlay is real, not dead/commented-out
 * code. */
export function OrientationOverlay() {
  const { ORIENTATION } = useDesign();
  const { mismatch, messageKey } = useOrientationGuard();
  const { t } = useLanguage();
  if (!mismatch) return null;
  return (
    <>
      <div className="node" style={{ left: 0, top: 0, width: 1080, height: 2340, background: "rgba(0, 0, 0, 0.5843)" }} />
      <div className="node orientation-icon" style={{ left: ORIENTATION.icon.x, top: ORIENTATION.icon.y, width: ORIENTATION.icon.w, height: ORIENTATION.icon.h }}>
        <Spr src={img("icons8-rotate-phone-64")} rect={{ x: 0, y: 0, w: ORIENTATION.icon.w, h: ORIENTATION.icon.h }} />
      </div>
      <Tmp rect={ORIENTATION.text} fontSize={ORIENTATION.text.fs} color={C.white}>
        {t(messageKey)}
      </Tmp>
    </>
  );
}
