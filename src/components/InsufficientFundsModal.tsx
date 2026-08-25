import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import { C, R } from "../ui/design";
import { Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
/** `Insufficient Funds Panel` (`VirtualCashManager.CheckBalance`, spec §3)
 * — gates `UIManager.ConfirmBet()` on `balance - amountPlaced < 0`. */
export function InsufficientFundsModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { INSUFFICIENT } = useDesign();
  const { t } = useLanguage();
  if (!visible) return null;
  return (
    <div className="modal-fade">
      <div className="scrim" style={{ background: "rgba(0, 0, 0, 0.29)" }} />
      <div
        style={{
          position: "absolute",
          left: INSUFFICIENT.card.x,
          top: INSUFFICIENT.card.y,
          width: INSUFFICIENT.card.w,
          height: INSUFFICIENT.card.h,
          background: C.white,
          borderRadius: R.insufficientCard,
        }}
      />
      <Tmp rect={INSUFFICIENT.header} fontSize={INSUFFICIENT.header.fs} color={C.insufficientRed} bold>
        {t("Insufficient Funds")}
      </Tmp>
      <Tmp rect={INSUFFICIENT.body} fontSize={INSUFFICIENT.body.fs} color={C.black}>
        {t("Please top up your wallet or reduce your stakes.")}
      </Tmp>
      <button
        type="button"
        className="btn press"
        style={{
          left: INSUFFICIENT.close.x,
          top: INSUFFICIENT.close.y,
          width: INSUFFICIENT.close.w,
          height: INSUFFICIENT.close.h,
          background: C.insufficientCloseBlue,
          borderRadius: R.insufficientClose,
        }}
        onClick={() => {
          playClick();
          onClose();
        }}
      >
        <Tmp rect={{ x: 0, y: 0, w: INSUFFICIENT.close.w, h: INSUFFICIENT.close.h }} fontSize={INSUFFICIENT.close.fs} color={C.white}>
          {t("Close")}
        </Tmp>
      </button>
    </div>
  );
}
