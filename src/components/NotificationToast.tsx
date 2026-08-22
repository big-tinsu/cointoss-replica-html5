import { useLanguage } from "../i18n/LanguageContext";
import type { Notification } from "../state/gameEngine";
import { C, R, img } from "../ui/design";
import { Spr, Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
/** `Notification Panel`/`GameManager.NotifyPlayer`/`Notify`
 * (`GameManager.cs:638-677`, spec end of §1) — a queued toast, frame
 * `GUI Rounded Edge Button.png` at ppum 10 (radius 10.8), red for both info
 * and error per the scene's own literal tint (there is only one Notification
 * Panel GameObject in the source, no separate green info variant). */
export function NotificationToast({ notification }: { notification: Notification | null }) {
  const { TOAST } = useDesign();
  const { t } = useLanguage();
  if (!notification) return null;
  return (
    <div className="modal-fade">
      <Spr src={img("gui-rounded-edge-button")} rect={TOAST.panel} style={{ borderRadius: R.notification, background: C.notifyRed }} />
      <Tmp rect={TOAST.text} fontSize={TOAST.text.fs} color={C.white}>
        {t(notification.message)}
      </Tmp>
    </div>
  );
}
