import { useLanguage } from "../i18n/LanguageContext";

/** `cashoutRetryPanel`/`GameManager.RetryCashout` (`GameManager.cs:528-572`)
 * — shown when a post-round re-authenticate call fails to reach the server;
 * the panel's message text is whatever the failed call's error was. */
export function CashoutRetryModal({
  visible,
  message,
  onRetry,
}: {
  visible: boolean;
  message: string;
  onRetry: () => void;
}) {
  const { t } = useLanguage();
  if (!visible) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <p>{t(message)}</p>
        <button type="button" className="primary-button" onClick={onRetry}>
          {t("Retry")}
        </button>
      </div>
    </div>
  );
}
