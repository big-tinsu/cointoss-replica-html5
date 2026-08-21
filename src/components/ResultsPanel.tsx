import { useLanguage } from "../i18n/LanguageContext";
import { useAlternatingColor } from "./Customizable";
import { ConfettiBurst } from "./ConfettiBurst";
import { playClick } from "../state/sfx";
import type { RoundResult } from "../state/gameEngine";
import { C, RESULTS, img } from "../ui/design";
import { Spr, Tmp } from "../ui/Sprite";

/**
 * `ResultsPanel`/`UIManager.OnWin`/`OnLoss` (`UIManager.cs:71-90`, spec §1
 * step 13) — the trophy badge (`win-art.png`) plus `Rebet`/`Newround`. The
 * scene's static `Image` node is always-active, but `OnWin`/`OnLoss` gate it
 * at runtime — it's a *win* badge, so it only shows on a win here, not on
 * every result. No separate max-win/jackpot sequence — single flip, single
 * payout tier.
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
  const { colorA, colorB } = useAlternatingColor(C.gold, "#e02424");
  if (!visible || !result) return null;

  return (
    <div className="modal-fade">
      {result.won && <Spr src={img("win-art")} rect={RESULTS.trophy} />}
      <Tmp rect={RESULTS.resultText} fontSize={RESULTS.resultText.fs} color={result.won ? colorA : colorB} bold>
        {t(result.desiredOutcome).toUpperCase()}
      </Tmp>
      <Tmp rect={RESULTS.detailText} fontSize={RESULTS.detailText.fs} color={C.white}>
        {result.won
          ? `${t("You just won")} ${currency} ${result.cashoutAmount.toFixed(2)}`
          : `${t("You lost. You chose")} ${t(result.playerChoice)}`}
      </Tmp>

      {result.won && (
        <div
          className="confetti-burst"
          style={{ left: RESULTS.resultText.x, top: RESULTS.resultText.y - 60, width: RESULTS.resultText.w }}
        >
          <ConfettiBurst />
        </div>
      )}

      <button
        type="button"
        className="btn press"
        style={{ left: RESULTS.rebet.x, top: RESULTS.rebet.y, width: RESULTS.rebet.w, height: RESULTS.rebet.h, background: C.rebetTeal, borderRadius: 24 }}
        onClick={() => {
          playClick();
          onRebet();
        }}
      >
        <Tmp rect={{ x: 0, y: 0, w: RESULTS.rebet.w, h: RESULTS.rebet.h }} fontSize={RESULTS.rebet.fs} color={C.white}>
          {t("Rebet")}
        </Tmp>
      </button>
      <button
        type="button"
        className="btn press"
        style={{ left: RESULTS.newRound.x, top: RESULTS.newRound.y, width: RESULTS.newRound.w, height: RESULTS.newRound.h, background: C.newRoundGreen, borderRadius: 24 }}
        onClick={() => {
          playClick();
          onNewRound();
        }}
      >
        <Tmp rect={{ x: 0, y: 0, w: RESULTS.newRound.w, h: RESULTS.newRound.h }} fontSize={RESULTS.newRound.fs} color={C.white}>
          {t("New Round")}
        </Tmp>
      </button>
    </div>
  );
}
