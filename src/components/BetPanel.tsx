import { useLanguage } from "../i18n/LanguageContext";
import { formatMoney } from "../state/format";
import { playClick } from "../state/sfx";
import type { PlayerSelection } from "../api/types";
import { C, ui } from "../ui/design";
import { Spr, Tmp } from "../ui/Sprite";

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
/** `QuickBet`'s two `HorizontalLayoutGroup` rows hold 4 chips each. */
const QUICKBET_PER_ROW = 4;

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
  const shown = stakeText || String(stake);

  return (
    <>
      {/* `ManualStakeInputField` — frame mobile-10, now a real text input.
       *
       * The source drives this through `KeypadManager`, an on-screen numeric
       * keypad, because a Unity WebGL canvas has no native text entry to fall
       * back on. On the web that constraint doesn't exist: the field is an
       * `<input inputMode="decimal">`, so desktop users type and mobile users get
       * the OS numeric keyboard. `CustomKeypad`/`NumericKeypad` is removed.
       *
       * `setStakeText` runs the source's own `LimitDecimalPlaces` validator on
       * every keystroke, and `commitStake` clamps to [minimum, maximum] on blur
       * or Enter — the same two engine actions the keypad used to call, so the
       * validation rules are unchanged. */}
      <div
        className="node"
        style={{ left: STAKE_FIELD.field.x, top: STAKE_FIELD.field.y, width: STAKE_FIELD.field.w, height: STAKE_FIELD.field.h }}
      >
        <Spr src={ui("stake-field")} rect={{ x: 0, y: 0, w: STAKE_FIELD.field.w, h: STAKE_FIELD.field.h }} />
        <div className="stake-row">
          <span className="stake-currency">{currency}</span>
          <input
            className="stake-input"
            type="text"
            inputMode="decimal"
            autoComplete="off"
            aria-label="Stake amount"
            disabled={busy}
            value={shown}
            // Sized from the value's own length so the currency code and the
            // number stay centred as a pair for any stake, rather than being
            // nudged into place for one particular string width.
            style={{ width: `${Math.max(shown.length, 1)}ch` }}
            onChange={(e) => onStakeText(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            onBlur={onCommitStake}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                onCommitStake();
                e.currentTarget.blur();
              }
            }}
          />
        </div>
      </div>

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

      {/* `minimum`/`maximum` — `nowrap`, since these sit in a band between
       * the stepper plates and the quick-bet grid that has room for one line
       * only; a long currency code shrinks the glyphs rather than wrapping
       * into the row below. */}
      <Tmp className="nowrap" rect={{ x: STAKE_FIELD.minimum.x, y: STAKE_FIELD.minimum.y, w: STAKE_FIELD.minimum.w, h: STAKE_FIELD.minimum.h }} fontSize={STAKE_FIELD.minimum.fs} align="left">
        {t("min")}: {currency} {formatMoney(minimum)}
      </Tmp>
      <Tmp className="nowrap" rect={{ x: STAKE_FIELD.maximum.x, y: STAKE_FIELD.maximum.y, w: STAKE_FIELD.maximum.w, h: STAKE_FIELD.maximum.h }} fontSize={STAKE_FIELD.maximum.fs} align="right">
        {t("max")}: {currency} {formatMoney(maximum)}
      </Tmp>

      {/* `QuickBet` — two 4-chip rows, frame mobile-14.
       *
       * The scene authors both rows as `HorizontalLayoutGroup`s with
       * `childForceExpandWidth`, so a row holding fewer than 4 chips still
       * distributes them across the full row width rather than stacking them
       * against its left edge. `QUICK_BET_BUTTON_COUNT` is 5, so the second
       * row holds exactly one chip — pinned at `col * pitch` it sat hard
       * left, out of line with everything else. Each row is instead centred
       * on the container by its own chip count. */}
      {quickBetValues.map((chip, i) => {
        const row = i < QUICKBET_PER_ROW ? 0 : 1;
        const col = i % QUICKBET_PER_ROW;
        const rowCount = Math.min(quickBetValues.length - row * QUICKBET_PER_ROW, QUICKBET_PER_ROW);
        const rowContentW = rowCount * CHIPS.w + (rowCount - 1) * CHIPS.spacing;
        const rowStartX = CHIPS.rowX + (CHIPS.rowW - rowContentW) / 2;
        const x = rowStartX + col * (CHIPS.w + CHIPS.spacing);
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
