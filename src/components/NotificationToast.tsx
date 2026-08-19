import { useLanguage } from "../i18n/LanguageContext";
import type { Notification } from "../state/gameEngine";

/** `GameManager.NotifyPlayer`/`Notify` (`GameManager.cs:638-677`, spec end of
 * §1) — a queued toast, green info / red error, ~2s each. */
export function NotificationToast({ notification }: { notification: Notification | null }) {
  const { t } = useLanguage();
  if (!notification) return null;
  return (
    <div className={`notification-toast ${notification.isError ? "is-error" : "is-info"}`}>
      {t(notification.message)}
    </div>
  );
}
