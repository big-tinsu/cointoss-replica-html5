import { useLanguage } from "../i18n/LanguageContext";
import { useOrientationGuard } from "../hooks/useOrientationGuard";

/** `orientationScreen`/`GameManager.DisplayOrientationMessage` (spec §1 step
 * 17, §7 Prefabs) — the one game of the three siblings where this "please
 * rotate your device" overlay is real, not dead/commented-out code. */
export function OrientationOverlay() {
  const { mismatch, messageKey } = useOrientationGuard();
  const { t } = useLanguage();
  if (!mismatch) return null;
  return (
    <div className="orientation-overlay">
      <div className="orientation-icon" aria-hidden="true">
        ⟳
      </div>
      <p>{t(messageKey)}</p>
    </div>
  );
}
