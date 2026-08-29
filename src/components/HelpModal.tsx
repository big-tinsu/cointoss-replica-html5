import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import { UnifiedHowToPlay } from "../ui/unified";
import type { UHelpBlock } from "../ui/unified";

/**
 * Adapter onto the shared `UnifiedHowToPlay` (see `src/ui/unified/`).
 *
 * Full operator rules copy, transcribed verbatim from the official Coin Toss
 * "Game Rules & How to Play" document — see the equivalent comment on Street
 * Soccer's `HelpPanel.tsx` for the section/typography mapping this follows
 * (heading/rule/warn/term/table).
 *
 * The document writes the payout as a static "2.00x". This game threads a
 * LIVE `oddsOne` prop (the previous version of this file already used it for
 * its "Winning Payout" line), so the Heads/Tails button payouts, the Standard
 * Win formula and its worked example are computed from `oddsOne` instead —
 * the same treatment DiceD's help panel uses, and the one deliberate
 * departure from verbatim transcription here.
 *
 * The document's own leading title ("Coin Toss Game Rules & How to Play") is
 * not repeated as a block — the panel's header already reads "How to play" in
 * every game.
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
  const odds = oddsOne.toFixed(2);

  const blocks: UHelpBlock[] = [
    { kind: "heading", text: t("Game Overview") },
    { kind: "note", text: t("Coin Toss is a fast-paced prediction game where players predict which side of a spinning coin will land face up.") },
    { kind: "note", text: t("Before each round, players choose either Heads or Tails. After the wager is placed, the coin spins and lands randomly on one side. If the player's prediction matches the final result, the player wins.") },
    { kind: "note", text: t("Each round is independent and determined using certified Random Number Generator (RNG) technology to ensure fair and unpredictable outcomes.") },
    { kind: "heading", text: t("How To Play") },
    { kind: "rule", label: t("Select Your Prediction"), text: t("Choose one of the two available outcomes:\n• Heads\n• Tails\n\nOnly one prediction may be selected per game round.") },
    { kind: "rule", label: t("Select Your Stake"), text: t("Choose the amount you wish to wager. You can:\n• Use the + and − buttons to increase or decrease your stake.\n• Use the Quick Stake Buttons (+10, +20, +50, +100, +200, +500, +1000 and +2000) to instantly increase your wager.\n• View your selected stake amount in the stake display above the quick stake buttons.\n\nThe selected stake will be deducted from your wallet once the bet is accepted.") },
    { kind: "rule", label: t("Place Your Bet"), text: t("After selecting your prediction and stake amount, press either the Heads or Tails button to submit your wager. Once accepted:\n• Your stake is deducted from your wallet.\n• The game server securely registers your bet.\n• The coin immediately begins spinning.\n\nAccepted bets cannot be cancelled or modified.") },
    { kind: "rule", label: t("Coin Spin"), text: t("The coin spins automatically after the wager has been accepted. The spinning animation represents the random result generated securely by the game server.") },
    { kind: "rule", label: t("Result Settlement"), text: t("When the coin stops spinning:\n• If it lands on Heads, all Head bets win.\n• If it lands on Tails, all Tail bets win.\n\nWinning bets are settled instantly and credited automatically to the player's wallet.") },
    { kind: "heading", text: t("Game Buttons") },
    {
      kind: "term",
      label: t("Heads Button"),
      text: `${t("Places a wager predicting that the coin will land on Heads.")}\n${t(
        "Displayed Payout: Pays",
      )} ${odds}x`,
    },
    {
      kind: "term",
      label: t("Tails Button"),
      text: `${t("Places a wager predicting that the coin will land on Tails.")}\n${t(
        "Displayed Payout: Pays",
      )} ${odds}x`,
    },
    { kind: "term", label: t("Stake Increase (+)"), text: t("Increases the current stake amount.") },
    { kind: "term", label: t("Stake Decrease (−)"), text: t("Decreases the current stake amount.") },
    { kind: "term", label: t("Quick Stake Buttons"), text: t("Quickly increase your wager using preset stake values: +10, +20, +50, +100, +200, +500, +1000, +2000. Multiple selections may be combined to reach your preferred wager.") },
    { kind: "term", label: t("Stake Display"), text: t("Displays the total stake selected for the upcoming round.") },
    { kind: "term", label: t("Balance Display"), text: t("Shows the player's available wallet balance.") },
    { kind: "term", label: t("How To Play"), text: t("Opens the complete game rules, gameplay instructions, payout information and betting rules.") },
    { kind: "term", label: t("Bet History"), text: t("Displays previously completed rounds, including:\n• Selected prediction\n• Stake amount\n• Winning outcome\n• Win/Loss status\n• Amount won\n• Date and time of play") },
    { kind: "term", label: t("Select Language"), text: t("Allows players to change the game language. Changing the language affects only the game interface and does not influence gameplay or results.") },
    { kind: "term", label: t("Leaderboard"), text: t("Displays recent winners, highest payouts and top-performing players. The leaderboard is for informational purposes only and does not affect future game outcomes.") },
    { kind: "term", label: t("Sound"), text: t("Allows players to enable or disable game sound effects and music.") },
    { kind: "term", label: t("Menu"), text: t("Provides access to additional game settings, including:\n• Rules / Help\n• Language selection\n• Sound settings\n• Responsible Gaming information\n• Exit Game (where available)") },
    { kind: "heading", text: t("For Fun Mode") },
    { kind: "note", text: t("Players can enjoy Coin Toss without wagering real money by using For Fun Mode.") },
    { kind: "term", label: t("To access For Fun Mode"), text: t("• Return to the game lobby.\n• Select For Fun (or Demo Mode) before launching the game.\n• The game loads with virtual credits for practice.\n• All gameplay features, animations and rules remain identical to Real Play mode.\n• No real money is wagered or won while playing in For Fun Mode.\n• Players can switch back to Real Play Mode from the game lobby at any time.") },
    { kind: "heading", text: t("Game Rules") },
    { kind: "term", label: t("Winning Outcome"), text: t("Players win when the final side of the coin matches the selected prediction.\n• Prediction: Heads → Coin lands on Heads.\n• Prediction: Tails → Coin lands on Tails.") },
    { kind: "warn", label: t("Losing Outcome"), text: t("The player loses if the coin lands on the opposite side from the selected prediction.") },
    { kind: "term", label: t("Randomness"), text: t("Every coin toss is generated using certified Random Number Generator (RNG) technology. Every round is completely independent. Previous coin tosses do not influence future outcomes. Each result has an equal opportunity of occurring according to the game's mathematical model.") },
    {
      kind: "term",
      label: t("Standard Win"),
      text: `${t("Correct predictions are paid at:")}\n${t("Win Amount = Stake ×")} ${odds}`,
    },
    {
      kind: "table",
      rows: [
        [t("Stake"), "100"],
        [t("Winning Return"), (100 * oddsOne).toFixed(2)],
      ],
    },
    {
      kind: "term",
      label: t("Minimum Win"),
      text: `${t("The minimum possible win depends on:")}\n${t(
        "• The operator's configured minimum stake",
      )}\n${t("• The fixed payout multiplier of")} ${odds}x\n\n${t(
        "For example, if the minimum stake is 10, a winning bet returns",
      )} ${(10 * oddsOne).toFixed(2)} ${t("(subject to the operator's payout configuration).")}`,
    },
    {
      kind: "term",
      label: t("Maximum Win"),
      text: `${t("The maximum possible win depends on:")}\n${t(
        "• The operator's configured maximum stake",
      )}\n${t("• The fixed payout multiplier of")} ${odds}x\n\n${t(
        "Operators may also configure a maximum payout limit per game round. If the calculated payout exceeds this limit, the player's winnings will be capped at the configured maximum payout.",
      )}`,
    },
    { kind: "term", label: t("RTP (Return to Player)"), text: t("Default RTP: 95%\n\nThe RTP represents the theoretical percentage of all wagered funds returned to players over a very large number of game rounds.") },
    { kind: "term", label: t("Volatility"), text: t("Medium\n\nCoin Toss offers balanced gameplay with frequent win opportunities and consistent fixed payouts, making it a medium-volatility game suitable for both casual and regular players.") },
    { kind: "term", label: t("Game Type"), text: t("Coin Flip / Binary Prediction") },
    { kind: "heading", text: t("Betting Configuration") },
    { kind: "term", label: t("Minimum Bet"), text: t("The minimum playable stake amount is configured by the operator. Players cannot place bets below the configured minimum value.") },
    { kind: "term", label: t("Maximum Bet"), text: t("The maximum playable stake amount is configured by the operator. Players cannot place bets above the configured maximum value.") },
    { kind: "heading", text: t("Result Settlement") },
    { kind: "note", text: t("Once a bet has been accepted:\n• The game round is processed securely on the game server.\n• Results cannot be altered or cancelled.\n• Winning bets are settled automatically.\n• Winnings are credited directly to the player's wallet.\n• Losing bets are recorded in Bet History.") },
    { kind: "heading", text: t("Internet Connection Policy") },
    { kind: "term", label: t("Before Betting"), text: t("If the player loses internet connection before the wager is successfully accepted:\n• The bet is not placed.\n• No funds are deducted.\n• The player may reconnect and place another bet.") },
    { kind: "term", label: t("After Bet Acceptance"), text: t("If a player disconnects after the wager has been accepted:\n• The coin toss continues on the game server.\n• The result is generated normally.\n• The wager is settled automatically.\n• Any winnings are credited to the player's wallet.") },
    { kind: "term", label: t("Reconnection"), text: t("After reconnecting, players can view:\n• Previous game result\n• Bet status\n• Win/Loss outcome\n• Wallet balance\n• Transaction history\n• Bet History") },
    { kind: "heading", text: t("Fair Play") },
    { kind: "note", text: t("• Every coin toss is determined using certified Random Number Generator (RNG) technology.\n• Every game round is completely independent.\n• Previous outcomes do not affect future results.\n• Neither players nor the operator can predict or manipulate the outcome of any coin toss.\n• All winning bets are settled automatically according to the official game rules and configured payout structure.") },
  ];

  return (
    <UnifiedHowToPlay
      visible={visible}
      blocks={blocks}
      onClose={() => {
        playClick();
        onClose();
      }}
      t={t}
    />
  );
}
