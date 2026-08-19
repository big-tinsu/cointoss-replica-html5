import { useLanguage } from "../i18n/LanguageContext";

/** `InsufficientFundsPanel` (`VirtualCashManager.CheckBalance`, spec §3) —
 * gates `UIManager.ConfirmBet()` on `balance - amountPlaced < 0`. */
export function InsufficientFundsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  if (!visible) return null;
  return (
    <div className="modal-backdrop">
      <div className="modal-panel">
        <h2>{t("Insufficient Funds")}</h2>
        <p>{t("Please top up your wallet or reduce your stakes.")}</p>
        <button type="button" className="primary-button" onClick={onClose}>
          {t("Close")}
        </button>
      </div>
    </div>
  );
}
