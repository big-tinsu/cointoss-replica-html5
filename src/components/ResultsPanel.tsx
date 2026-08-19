import { useLanguage } from "../i18n/LanguageContext";
import { useAlternatingColor } from "./Customizable";
import { ConfettiBurst } from "./ConfettiBurst";
import type { RoundResult } from "../state/gameEngine";

/**
 * `UIManager.OnWin`/`OnLoss` (`UIManager.cs:71-90`, spec §1 step 13) — a
 * trophy/no-trophy image swap plus colored outcome text. Win: gold "You just
 * won {currency} {cashoutAmount}"; loss: red "You lost. You chose
 * {playerChoice}". No separate max-win/jackpot sequence — single flip,
 * single payout tier (spec §1 step 13).
 */
export function ResultsPanel({
  visible,
  result,
  currency,
  onRebet,
  onNewRound,
}: {
  visible: boolean;
  result: RoundResult | null;
  currency: string;
  onRebet: () => void;
  onNewRound: () => void;
}) {
  const { t } = useLanguage();
  const { colorA, colorB } = useAlternatingColor("#f6c214", "#e02424");
  if (!visible || !result) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel results-panel">
        <div className="trophy-row">
          <span className={result.won ? "trophy trophy-won" : "trophy trophy-lost"}>
            {result.won ? "🏆" : "🚫"}
          </span>
        </div>

        <h2 className="outcome-word" style={{ color: result.won ? colorA : colorB }}>
          {t(result.desiredOutcome).toUpperCase()}
        </h2>

        <p className="outcome-detail">
          {result.won
            ? `${t("You just won")} ${currency} ${result.cashoutAmount.toFixed(2)}`
            : `${t("You lost. You chose")} ${t(result.playerChoice)}`}
        </p>

        {result.won && <ConfettiBurst />}

        <div className="results-actions">
          <button type="button" className="primary-button" onClick={onRebet}>
            {t("Rebet")}
          </button>
          <button type="button" className="secondary-button" onClick={onNewRound}>
            {t("New Round")}
          </button>
        </div>
      </div>
    </div>
  );
}
