import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import { C, R } from "../ui/design";
import { Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
/** `Cashout Retry`/`GameManager.RetryCashout` (`GameManager.cs:528-572`) —
 * shown when a post-round re-authenticate call fails to reach the server;
 * the button is literally named `Rebet` in the scene but its TMP text reads
 * "Retry". */
export function CashoutRetryModal({
  visible,
  message,
  onRetry,
}: {
  visible: boolean;
  message: string;
  onRetry: () => void;
}) {
  const { CASHOUT_RETRY } = useDesign();
  const { t } = useLanguage();
  if (!visible) return null;
  return (
    <div className="modal-fade">
      <div className="node" style={{ left: 0, top: 0, width: 1080, height: 2340, background: "rgba(2, 8, 14, 0.7)" }} />
      <Tmp rect={CASHOUT_RETRY.message} fontSize={CASHOUT_RETRY.message.fs} color={C.white}>
        {t(message)}
      </Tmp>
      <button
        type="button"
        className="btn press"
        style={{
          left: CASHOUT_RETRY.button.x,
          top: CASHOUT_RETRY.button.y,
          width: CASHOUT_RETRY.button.w,
          height: CASHOUT_RETRY.button.h,
          background: C.retryTeal,
          borderRadius: R.retryButton,
        }}
        onClick={() => {
          playClick();
          onRetry();
        }}
      >
        <Tmp rect={{ x: 0, y: 0, w: CASHOUT_RETRY.button.w, h: CASHOUT_RETRY.button.h }} fontSize={CASHOUT_RETRY.button.fs} color={C.white}>
          {t("Retry")}
        </Tmp>
      </button>
    </div>
  );
}
