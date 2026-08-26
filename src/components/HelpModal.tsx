import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import { C, img } from "../ui/design";
import { Spr } from "../ui/Sprite";
import { useAutoFit } from "../ui/useAutoFit";

import { useDesign } from "../ui/DesignContext";
/**
 * `About` (spec §6) — the only place in the codebase that plainly
 * documents the head/tail/side win rule, treated as the source of truth
 * for both the "How to Play" help content and the game's `About` panel
 * (the source has separate `aboutPage`/help-onboarding GameObjects wired to
 * the same static copy block; this port consolidates them into one modal
 * since there's no distinct content to justify two — an earlier documented
 * decision, unchanged here).
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
  const { HELP } = useDesign();
  const { t } = useLanguage();
  const title = t("Welcome to Cointoss");
  // TMP's own shrink-to-fit: the header box is inset to clear the back arrow,
  // so a longer translation scales down inside it rather than wrapping onto a
  // second line or colliding with the arrow.
  const titleRef = useAutoFit<HTMLSpanElement>(HELP.header.fs, 32, [visible, title, HELP.header.fs, HELP.header.w]);
  if (!visible) return null;

  const lines = [
    t("Make Your Prediction: Choose whether you think the coin will land on Heads or Tails."),
    t("Winning: If you correctly predict the landing side of the coin, you win!"),
    t("Losing: If you fail to correctly predict the landing side of the coin, you lose."),
    t("If the coin lands on its side (neither heads nor tails), the bet is lost."),
    `${t("Winning Payout: Each winning turn pays")} ${oddsOne.toFixed(2)}x ${t("your bet.")}`.trim(),
    t(
      'Place Your Bet: Select your desired bet amount by tapping on the number, using the "+" and "-" buttons or simply inputting the desired amount',
    ),
    t("The Flip: Once you place your bet, the coin will flip and spin a few times then land."),
    t("RTP is 95%"),
  ];

  return (
    <div className="modal-fade">
      <div className="scrim" style={{ background: C.historyPurple }} />
      <span
        ref={titleRef}
        className="tmp nowrap"
        style={{
          left: HELP.header.x,
          top: HELP.header.y,
          width: HELP.header.w,
          height: HELP.header.h,
          fontSize: HELP.header.fs,
          fontWeight: 700,
          color: C.white,
          justifyContent: "center",
          alignItems: "center",
          textAlign: "center",
        }}
      >
        {title}
      </span>
      <button
        type="button"
        className="btn press"
        style={{ left: HELP.back.x, top: HELP.back.y, width: HELP.back.w, height: HELP.back.h }}
        onClick={() => {
          playClick();
          onClose();
        }}
        aria-label={t("Close")}
      >
        <Spr src={img("arrow-1-w")} rect={{ x: 0, y: 0, w: HELP.back.w, h: HELP.back.h }} />
      </button>

      {/* `--canvas-w` is the VISIBLE width in design units and is frequently
        * WIDER than the 1080 reference box (1442 at a 530x860 viewport, for
        * instance). This used to sit at `left: 0` with that width, so the column
        * ran from design x=0 to x=1442 while the visible area ran from x=-181 to
        * x=1261 — the text was pushed right by half the overflow, leaving a dead
        * gutter on the left and clipping every line off the right edge.
        *
        * Centred on the reference box the same way `.scrim` is, then the text
        * column itself is capped at `bodyW` and auto-margined, so the copy stays
        * centred and fully on-screen at any aspect ratio. */}
      <div
        className="node scroll-y"
        style={{
          left: "50%",
          top: HELP.contentTop,
          width: "var(--canvas-w, 1080px)",
          height: `calc(var(--canvas-h, 2340px) - ${HELP.contentTop}px)`,
          transform: "translateX(-50%)",
        }}
      >
        <div
          style={{
            maxWidth: HELP.bodyW + HELP.padX * 2,
            margin: "0 auto",
            padding: `0 ${HELP.padX}px`,
            boxSizing: "border-box",
          }}
        >
          {lines.map((line, i) => (
            <p
              key={i}
              style={{
                margin: "0 0 32px",
                fontSize: HELP.bodyFs,
                lineHeight: 1.3,
                color: i === 3 ? "#ff8a8a" : C.white,
                fontWeight: i === 3 ? 700 : 400,
              }}
            >
              {i + 1}. {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
