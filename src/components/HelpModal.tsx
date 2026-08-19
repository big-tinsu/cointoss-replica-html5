import { useLanguage } from "../i18n/LanguageContext";

/**
 * The onboarding/help copy set (spec §6) is the only place in the codebase
 * that plainly documents the head/tail/side win rule — treated here as the
 * source of truth for both the "How to Play" help content and the game's
 * `About` panel (the source has separate `aboutPage`/help-onboarding
 * GameObjects wired to the same static copy block; this port consolidates
 * them into one modal since there's no distinct content to justify two).
 */
export function HelpModal({
  visible,
  oddsOne,
  onClose,
}: {
  visible: boolean;
  oddsOne: number;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel help-modal">
        <header className="bet-history-header">
          <h2>{t("Welcome to Cointoss")}</h2>
          <button type="button" onClick={onClose} aria-label={t("Close")}>
            ×
          </button>
        </header>
        <p className="help-intro">{t("Quick game guide to onboard you through!")}</p>

        <h3>{t("Basic Rule")}</h3>
        <p>{t("Make Your Prediction: Choose whether you think the coin will land on Heads or Tails.")}</p>
        <p>
          {t("Place Your Bet: Select your desired bet amount by tapping on the number, using the \"+\" and \"-\" buttons or simply inputting the desired amount")}
        </p>
        <p>{t("The Flip: Once you place your bet, the coin will flip and spin a few times then land.")}</p>
        <p>{t("Winning: If you correctly predict the landing side of the coin, you win!")}</p>
        <p>{t("Losing: If you fail to correctly predict the landing side of the coin, you lose.")}</p>
        <p className="help-warning">
          {t("If the coin lands on its side (neither heads nor tails), the bet is lost.")}
        </p>
        <p>
          {t("Winning Payout: Each winning turn pays")} <strong>{oddsOne.toFixed(2)}x</strong>
        </p>

        <button type="button" className="primary-button" onClick={onClose}>
          {t("Start")}
        </button>
      </div>
    </div>
  );
}
