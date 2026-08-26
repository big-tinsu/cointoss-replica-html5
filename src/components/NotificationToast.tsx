import { useLanguage } from "../i18n/LanguageContext";
import type { Notification } from "../state/gameEngine";
import { C } from "../ui/design";
import { Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
/** `Notification Panel`/`GameManager.NotifyPlayer`/`Notify`
 * (`GameManager.cs:638-677`, spec end of §1) — a queued toast, frame
 * `GUI Rounded Edge Button.png` at ppum 10 (radius 10.8), red for both info
 * and error per the scene's own literal tint (there is only one Notification
 * Panel GameObject in the source, no separate green info variant).
 *
 * Drawn as a flat tinted plate with a corner radius, NOT as the
 * `GUI Rounded Edge Button.png` bitmap: that art is a 256x256 WHITE rounded
 * square whose corner radius is 42% of its side, so stretching it to this
 * panel turned it into a white oval that covered the red fill — and
 * the label, being white too, vanished into it.
 *
 * The scene's own mobile rect is a 1200-wide panel at x=-60 on a 1080 canvas —
 * i.e. wider than the screen, bleeding off both edges with square-looking
 * corners. It now insets to an almost-full-width card with a visible radius
 * (`TOAST.radius`), so it reads as a floating toast rather than a full-bleed
 * banner. */
export function NotificationToast({ notification }: { notification: Notification | null }) {
  const { TOAST } = useDesign();
  const { t } = useLanguage();
  if (!notification) return null;
  // `message` is a translation key; `suffix` (amounts/currency) is appended
  // verbatim so it never goes through the translation table.
  const text = notification.suffix
    ? `${t(notification.message)} ${notification.suffix}`
    : t(notification.message);
  return (
    <div className="modal-fade">
      <div
        style={{
          position: "absolute",
          left: TOAST.panel.x,
          top: TOAST.panel.y,
          width: TOAST.panel.w,
          height: TOAST.panel.h,
          // The scene ships one red Notification Panel for every message, but a
          // win reading in alarm-red was actively misleading. `isError` already
          // separates them: every engine `notify()` passes `true` except the win,
          // so this is a clean win-vs-everything-else split rather than a guess.
          background: notification.isError ? C.notifyRed : C.notifyGreen,
          borderRadius: TOAST.radius,
        }}
      />
      <Tmp rect={TOAST.text} fontSize={TOAST.text.fs} color={C.white}>
        {text}
      </Tmp>
    </div>
  );
}
