import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import { UnifiedHowToPlay } from "../ui/unified";
import type { UHelpBlock } from "../ui/unified";

/**
 * Adapter onto the shared `UnifiedHowToPlay` (see `src/ui/unified/`).
 *
 * The rule COPY stays Coin Toss's own — still the source of truth for the
 * head/tail/side win rule, and the "lands on its side" line keeps the
 * warning emphasis the scene gave it (now the kit's shared `warn` block).
 * The scene titled this "Welcome to Cointoss"; the unified header reads
 * "How to play" in every game, which is the point of the shared surface.
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

  const blocks: UHelpBlock[] = [
    { kind: "rule", text: t("Make Your Prediction: Choose whether you think the coin will land on Heads or Tails.") },
    { kind: "rule", text: t("Winning: If you correctly predict the landing side of the coin, you win!") },
    { kind: "rule", text: t("Losing: If you fail to correctly predict the landing side of the coin, you lose.") },
    { kind: "warn", text: t("If the coin lands on its side (neither heads nor tails), the bet is lost.") },
    {
      kind: "rule",
      text: `${t("Winning Payout: Each winning turn pays")} ${oddsOne.toFixed(2)}x ${t("your bet.")}`.trim(),
    },
    {
      kind: "rule",
      text: t(
        'Place Your Bet: Select your desired bet amount by tapping on the number, using the "+" and "-" buttons or simply inputting the desired amount',
      ),
    },
    { kind: "rule", text: t("The Flip: Once you place your bet, the coin will flip and spin a few times then land.") },
  ];

  return (
    <UnifiedHowToPlay
      visible={visible}
      blocks={blocks}
      footer={t("RTP is 95%")}
      onClose={() => {
        playClick();
        onClose();
      }}
      t={t}
    />
  );
}
