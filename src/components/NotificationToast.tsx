import { useLanguage } from "../i18n/LanguageContext";
import type { Notification } from "../state/gameEngine";
import { C, R } from "../ui/design";
import { Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
/** `Notification Panel`/`GameManager.NotifyPlayer`/`Notify`
 * (`GameManager.cs:638-677`, spec end of §1) — a queued toast, frame
 * `GUI Rounded Edge Button.png` at ppum 10 (radius 10.8), red for both info
 * and error per the scene's own literal tint (there is only one Notification
 * Panel GameObject in the source, no separate green info variant).
 *
 * Drawn as a flat tinted plate with the 9-slice corner radius, NOT as the
 * `GUI Rounded Edge Button.png` bitmap: that art is a 256x256 WHITE rounded
 * square whose corner radius is 42% of its side, so stretching it to this
 * 960x108 panel turned it into a white oval that covered the red fill — and
 * the label, being white too, vanished into it. The scene draws this
 * `Sliced` at ppum 10, i.e. a flat fill with 10.8px corners. */
export function NotificationToast({ notification }: { notification: Notification | null }) {
  const { TOAST } = useDesign();
  const { t } = useLanguage();
  if (!notification) return null;
  return (
    <div className="modal-fade">
      <div
        style={{
          position: "absolute",
          left: TOAST.panel.x,
          top: TOAST.panel.y,
          width: TOAST.panel.w,
          height: TOAST.panel.h,
          background: C.notifyRed,
          borderRadius: R.notification,
        }}
      />
      <Tmp rect={TOAST.text} fontSize={TOAST.text.fs} color={C.white}>
        {t(notification.message)}
      </Tmp>
    </div>
  );
}
