import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import { NumericKeypad } from "./NumericKeypad";
import type { PlayerSelection } from "../api/types";
import { C, ui } from "../ui/design";
import { Spr, Tmp } from "../ui/Sprite";
import { useAutoFit } from "../ui/useAutoFit";

import { useDesign } from "../ui/DesignContext";
/**
 * `Interactive Pane/BetPanel` (spec §2/§3/§5) — stake display + manual
 * input (desktop `TMP_InputField` / mobile `KeypadManager`), the
 * procedurally-generated quick-bet chip row, and the Heads/Tails choice
 * buttons. Tapping Heads or Tails IS the bet-confirmation action (spec §1
 * step 7) — there is no separate "Confirm" button, matching the source's
 * fully-commented-out `betConfirmationPanel` codepath.
 *
 * Only "+value" quick-bet chips exist (spec §2 Appendix#9): the source's
 * `VirtualCashManager.AddToStake` clamps at `maximum` with no corresponding
 * decrease action — Coin Toss's chip row is add-only, matching the
 * `Addition Button`/`Subtraction Button` stepper pair being the only way to
 * decrease stake.
 */
/** `Pays {n}x` on both choice buttons — an even-money coin toss. */
const PAYOUT_MULTIPLIER = 2;

export function BetPanel({
  currency,
  minimum,
  maximum,
  stake,
  stakeText,
  quickBetValues,
  busy,
  onStakeText,
  onCommitStake,
  onAddChip,
  onStepStake,
  onChoose,
}: {
  currency: string;
  minimum: number;
  maximum: number;
  stake: number;
  stakeText: string;
  quickBetValues: number[];
  busy: boolean;
  onStakeText: (raw: string) => void;
  onCommitStake: () => void;
  onAddChip: (amount: number) => void;
  onStepStake: (delta: number) => void;
  onChoose: (choice: PlayerSelection) => void;
}) {
  const { CHIPS, CHOICE, STAKE_FIELD } = useDesign();
  const { t } = useLanguage();
  const [keypadOpen, setKeypadOpen] = useState(false);
  const shown = stakeText || String(stake);
  const stakeRef = useAutoFit<HTMLSpanElement>(42, 18, [shown]);

  return (
    <>
      {/* `ManualStakeInputField` — frame mobile-10. The extraction is a
       * single mobile-shaped canvas (no separate Desktop scene captured),
       * so this port always uses `KeypadManager`'s on-screen keypad rather
       * than branching on a live viewport breakpoint. */}
      <button
        type="button"
        className="btn press"
        style={{ left: STAKE_FIELD.field.x, top: STAKE_FIELD.field.y, width: STAKE_FIELD.field.w, height: STAKE_FIELD.field.h }}
        disabled={busy}
        onClick={() => {
          playClick();
          setKeypadOpen(true);
        }}
      >
        <Spr src={ui("stake-field")} rect={{ x: 0, y: 0, w: STAKE_FIELD.field.w, h: STAKE_FIELD.field.h }} />
        <span
          ref={stakeRef}
          className="tmp nowrap"
          style={{ position: "absolute", inset: 0, fontSize: 42, color: "#022A40", justifyContent: "center", alignItems: "center" }}
        >
          {currency} {shown}
        </span>
      </button>

      {/* `Addition Button` / `Subtraction Button` — frame mobile-11 plate +
       * mobile-13/mobile-12 glyphs at their own inset rects. These used to be
       * inert `aria-hidden` divs: the art was placed but no handler was ever
       * attached, because `addChip` is add-only and no stepper action existed
       * on the engine. They now drive `stepStake`, which walks the stake by
       * one unit and clamps to [minimum, maximum] — the only way to decrease
       * it, since the quick-bet chips are add-only. */}
      <button
        type="button"
        className="btn press"
        aria-label="Increase stake"
        disabled={busy}
        onClick={() => {
          playClick();
          onStepStake(1);
        }}
        style={{ left: STAKE_FIELD.increase.x, top: STAKE_FIELD.increase.y, width: STAKE_FIELD.increase.w, height: STAKE_FIELD.increase.h, border: "none", padding: 0, background: "transparent" }}
      >
        <Spr src={ui("stepper-plate")} rect={{ x: 0, y: 0, w: STAKE_FIELD.increase.w, h: STAKE_FIELD.increase.h }} />
        <Spr
          src={ui("plus-icon")}
          rect={{
            x: STAKE_FIELD.increaseGlyph.x - STAKE_FIELD.increase.x,
            y: STAKE_FIELD.increaseGlyph.y - STAKE_FIELD.increase.y,
            w: STAKE_FIELD.increaseGlyph.w,
            h: STAKE_FIELD.increaseGlyph.h,
          }}
        />
      </button>
      <button
        type="button"
        className="btn press"
        aria-label="Decrease stake"
        disabled={busy}
        onClick={() => {
          playClick();
          onStepStake(-1);
        }}
        style={{ left: STAKE_FIELD.decrease.x, top: STAKE_FIELD.decrease.y, width: STAKE_FIELD.decrease.w, height: STAKE_FIELD.decrease.h, border: "none", padding: 0, background: "transparent" }}
      >
        <Spr src={ui("stepper-plate")} rect={{ x: 0, y: 0, w: STAKE_FIELD.decrease.w, h: STAKE_FIELD.decrease.h }} />
        <Spr
          src={ui("minus-icon")}
          rect={{
            x: STAKE_FIELD.decreaseGlyph.x - STAKE_FIELD.decrease.x,
            y: STAKE_FIELD.decreaseGlyph.y - STAKE_FIELD.decrease.y,
            w: STAKE_FIELD.decreaseGlyph.w,
            h: STAKE_FIELD.decreaseGlyph.h,
          }}
        />
      </button>

      <Tmp rect={{ x: STAKE_FIELD.minimum.x, y: STAKE_FIELD.minimum.y, w: STAKE_FIELD.minimum.w, h: STAKE_FIELD.minimum.h }} fontSize={STAKE_FIELD.minimum.fs} align="left">
        {t("min")}: {currency} {minimum.toFixed(2)}
      </Tmp>
      <Tmp rect={{ x: STAKE_FIELD.maximum.x, y: STAKE_FIELD.maximum.y, w: STAKE_FIELD.maximum.w, h: STAKE_FIELD.maximum.h }} fontSize={STAKE_FIELD.maximum.fs} align="right">
        {t("max")}: {currency} {maximum.toFixed(2)}
      </Tmp>

      {/* `QuickBet` — two 4-chip rows, frame mobile-14. */}
      {quickBetValues.map((chip, i) => {
        const row = i < 4 ? 0 : 1;
        const col = i % 4;
        const x = CHIPS.rowX + col * (CHIPS.w + CHIPS.spacing);
        const y = row === 0 ? CHIPS.firstRowY : CHIPS.secondRowY;
        return (
          <button
            key={chip}
            type="button"
            className="btn press"
            style={{ left: x, top: y, width: CHIPS.w, height: CHIPS.rowH }}
            disabled={busy}
            onClick={() => {
              playClick();
              onAddChip(chip);
            }}
          >
            <Spr src={ui("chip")} rect={{ x: 0, y: 0, w: CHIPS.w, h: CHIPS.rowH }} />
            <Tmp rect={{ x: 0, y: 0, w: CHIPS.w, h: CHIPS.rowH }} fontSize={CHIPS.fs} color={C.white}>
              +{chip}
            </Tmp>
          </button>
        );
      })}

      {/* `ChoicePanel/Heads` + `ChoicePanel/Tails` — frame mobile-15/16. The
          face labels are the scene's own literals (`HEAD`/`TAIL`, bold fs40),
          and the payout line is formatted from the multiplier rather than the
          scene's design-time `Pays 2x` string, matching the live build. */}
      <button
        type="button"
        className="btn press"
        style={{ left: CHOICE.headsX, top: CHOICE.y, width: CHOICE.w, height: CHOICE.h }}
        disabled={busy}
        onClick={() => {
          playClick();
          onChoose("head");
        }}
      >
        <Spr src={ui("heads-button")} rect={{ x: 0, y: 0, w: CHOICE.w, h: CHOICE.h }} />
        <ChoiceLabel label={t("HEAD")} pays={`${t("Pays")} ${PAYOUT_MULTIPLIER.toFixed(2)}x`} CHOICE={CHOICE} />
      </button>
      <button
        type="button"
        className="btn press"
        style={{ left: CHOICE.tailsX, top: CHOICE.y, width: CHOICE.w, height: CHOICE.h }}
        disabled={busy}
        onClick={() => {
          playClick();
          onChoose("tail");
        }}
      >
        <Spr src={ui("tails-button")} rect={{ x: 0, y: 0, w: CHOICE.w, h: CHOICE.h }} />
        <ChoiceLabel label={t("TAIL")} pays={`${t("Pays")} ${PAYOUT_MULTIPLIER.toFixed(2)}x`} CHOICE={CHOICE} />
      </button>

      {keypadOpen && (
        <NumericKeypad
          value={stakeText}
          currency={currency}
          onChange={onStakeText}
          onDone={() => {
            onCommitStake();
            setKeypadOpen(false);
          }}
          onCancel={() => setKeypadOpen(false)}
        />
      )}
    </>
  );
}

/**
 * The face + payout lines on a choice button, as one centred stack.
 *
 * The scene stacks these as two overlapping boxes: the label is centred in an
 * 84px box and the payout sits in a 42px box nested at its BOTTOM, so their
 * text centres end up only ~21px apart while the label itself is 40px tall.
 * Reproduced literally, "HEAD" and "Pays 2.00x" collide and the pair reads as
 * off-centre. A flex column centres the group as a whole and guarantees the
 * two lines never overlap at any font size.
 *
 * The two scenes disagree on ORDER — Mobile puts the payout ABOVE the face
 * (`payDy` 0.24 against `labelDy` 0.56), Desktop below (0.72) — so the order
 * is derived from the tokens rather than hardcoded.
 */
function ChoiceLabel({
  label,
  pays,
  CHOICE,
}: {
  label: string;
  pays: string;
  CHOICE: { labelFs: number; payFs: number; labelDy: number; payDy: number };
}) {
  const face = (
    <span key="label" style={{ fontSize: CHOICE.labelFs, fontWeight: 700, lineHeight: 1.05 }}>
      {label}
    </span>
  );
  const payout = (
    <span key="pays" style={{ fontSize: CHOICE.payFs, lineHeight: 1.05 }}>
      {pays}
    </span>
  );
  return (
    <span
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: Math.round(CHOICE.payFs * 0.35),
        color: "#FFFFFF",
        textAlign: "center",
        whiteSpace: "nowrap",
        pointerEvents: "none",
      }}
    >
      {CHOICE.payDy < CHOICE.labelDy ? [payout, face] : [face, payout]}
    </span>
  );
}
