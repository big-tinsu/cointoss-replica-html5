import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { NumericKeypad } from "./NumericKeypad";
import type { PlayerSelection } from "../api/types";

/**
 * `BetPanel`/`StakeInput`/`VirtualCashManager` (spec §2/§3/§5) — stake
 * display + manual input (desktop `TMP_InputField` / mobile `KeypadManager`),
 * the procedurally-generated quick-bet chip row, and the Heads/Tails choice
 * buttons. Tapping Heads or Tails IS the bet-confirmation action (spec §1
 * step 7) — there is no separate "Confirm" button.
 *
 * Only "+value" quick-bet chips exist, matching the source's own apparent
 * gap (spec §2 Appendix#9): `VirtualCashManager.AddToStake` clamps at
 * `maximum` with no corresponding minimum clamp for a decrease action,
 * because there is no decrease stepper/chip in this game at all — Coin
 * Toss's chip row is add-only.
 */
export function BetPanel({
  currency,
  minimum,
  maximum,
  stake,
  stakeText,
  quickBetValues,
  busy,
  isMobileLayout,
  onStakeText,
  onCommitStake,
  onAddChip,
  onChoose,
}: {
  currency: string;
  minimum: number;
  maximum: number;
  stake: number;
  stakeText: string;
  quickBetValues: number[];
  busy: boolean;
  isMobileLayout: boolean;
  onStakeText: (raw: string) => void;
  onCommitStake: () => void;
  onAddChip: (amount: number) => void;
  onChoose: (choice: PlayerSelection) => void;
}) {
  const { t } = useLanguage();
  const [keypadOpen, setKeypadOpen] = useState(false);

  return (
    <div className="bet-panel">
      <div className="stake-limits">
        <span>
          {t("min")}: {currency} {minimum.toFixed(2)}
        </span>
        <span>
          {t("max")}: {currency} {maximum.toFixed(2)}
        </span>
      </div>

      <div className="stake-editor">
        <span className="stake-label">{t("Stake")}</span>
        {isMobileLayout ? (
          <button type="button" className="stake-display" onClick={() => setKeypadOpen(true)} disabled={busy}>
            {currency} {stakeText || stake}
          </button>
        ) : (
          <input
            className="stake-input"
            inputMode="decimal"
            value={stakeText}
            disabled={busy}
            onChange={(e) => onStakeText(e.target.value)}
            onBlur={onCommitStake}
            aria-label={t("Stake")}
          />
        )}
      </div>

      <div className="chip-row">
        {quickBetValues.map((chip) => (
          <button key={chip} type="button" disabled={busy} onClick={() => onAddChip(chip)}>
            +{chip}
          </button>
        ))}
      </div>

      <div className="choice-row">
        <button
          type="button"
          className="choice-button choice-head"
          disabled={busy}
          onClick={() => onChoose("head")}
        >
          {t("Heads")}
        </button>
        <button
          type="button"
          className="choice-button choice-tail"
          disabled={busy}
          onClick={() => onChoose("tail")}
        >
          {t("Tails")}
        </button>
      </div>

      {isMobileLayout && keypadOpen && (
        <div className="keypad-overlay">
          <div className="keypad-display">
            {currency} {stakeText || "0"}
          </div>
          <NumericKeypad
            value={stakeText}
            onChange={onStakeText}
            onDone={() => {
              onCommitStake();
              setKeypadOpen(false);
            }}
          />
        </div>
      )}
    </div>
  );
}
