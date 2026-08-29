/**
 * The Coin-Toss-specific string table, extracted directly from
 * `Assets/Scripts/Lang/LanguageManager.cs` `gameTexts` (~95 keys, spec §6).
 *
 * Two confirmed-dead card-game-template leftovers are deliberately EXCLUDED
 * per the task brief (spec §6/§0's finding that Coin Toss shares a common
 * string-table ancestor with Penaldo/Keno, and these two keys have no call
 * site anywhere in Coin Toss's own code paths):
 *   - "No dealer card. Please shuffle the card"
 *   - "Card shuffle successfully"
 *
 * One cosmetic fix: the source's "Basic Rule" onboarding string contains a
 * mojibake artifact (`�head� or �tail�` — a lost-encoding stand-in for curly
 * quotes) copied verbatim from the C# literal; rendered here with plain
 * straight quotes instead of reproducing the encoding bug.
 */
export const DEFAULT_STRINGS: Record<string, string> = {
  // ========== Server Error Messages ==========
  "Error processing your request": "Error processing your request",
  "You no longer have access to the game": "You no longer have access to the game",
  "Invalid Aggregator": "Invalid Aggregator",
  "Invalid Partner": "Invalid Partner",
  "You cannot place bet above 2 decimal place": "You cannot place bet above 2 decimal place",
  "Error debitting your wallet": "Error debitting your wallet",
  "Nice. You won": "Nice. You won",
  "Sorry. You lost": "Sorry. You lost",
  "You've no ongoing round. Kindly reload!": "You've no ongoing round. Kindly reload!",
  "Bet already closed. Kindly reload the game": "Bet already closed. Kindly reload the game",
  "Invalid Operation. Kindly reload the game.": "Invalid Operation. Kindly reload the game.",
  "Bet placed successfully": "Bet placed successfully",
  "Please play a level to cashout!": "Please play a level to cashout!",
  "No sidebet selected": "No sidebet selected",
  "You cannot select sidebet": "You cannot select sidebet",
  "Session Exipired": "Session Exipired",

  // ========== Game Notification Texts ==========
  "Error: No clientId provided. Please relaunch the game":
    "Error: No clientId provided. Please relaunch the game",
  initializing: "initializing",
  authenticating: "authenticating",
  "loading game": "loading game",
  "Network error: Unable to contact the server. Please check your internet connection and refresh the page":
    "Network error: Unable to contact the server. Please check your internet connection and refresh the page",
  "Please relaunch the game": "Please relaunch the game",
  "Unexpected server response caused an exception. Please relaunch the game":
    "Unexpected server response caused an exception. Please relaunch the game",
  "Unable to parse value": "Unable to parse value",
  "You cannot place multiple bets": "You cannot place multiple bets",
  "Please wait for current process to complete": "Please wait for current process to complete",
  "No bets placed!": "No bets placed!",
  "Please wait for results": "Please wait for results",
  "Invalid value input": "Invalid value input",
  "Cannot decrease minimum limit": "Cannot decrease minimum limit",
  "Value out of bounds": "Value out of bounds",
  "Cannot exceed max limit": "Cannot exceed max limit",
  "Unable to contact the server. Please check your internet connection":
    "Unable to contact the server. Please check your internet connection",
  "Unexpected server response caused an exception.":
    "Unexpected server response caused an exception.",
  "Unexpected server response caused an exception":
    "Unexpected server response caused an exception",
  "You have just won a free bet!": "You have just won a free bet!",

  for: "for",
  "Place a Bet of": "Place a Bet of",
  "You just won": "You just won",
  "You lost. You chose": "You lost. You chose",
  "for multiple round": "for multiple round",
  won: "won",
  lost: "lost",
  pending: "pending",
  draw: "draw",

  // ========== Static Game Texts ==========
  "Powered by": "Powered by",
  "loading replay scene": "loading replay scene",
  English: "English",
  Head: "Head",
  head: "head",
  Heads: "Heads",
  /** `ChoicePanel/Heads/Text (TMP)` literal — the button face is uppercase. */
  HEAD: "HEAD",
  heads: "heads",
  Tail: "Tail",
  tail: "tail",
  Tails: "Tails",
  /** `ChoicePanel/Tails/Text (TMP)` literal. */
  TAIL: "TAIL",
  tails: "tails",
  Side: "Side",
  side: "side",
  Sides: "Sides",
  sides: "sides",
  Pays: "Pays",
  Pay: "Pay",
  pay: "pay",
  pays: "pays",
  Rebet: "Rebet",
  "New Round": "New Round",
  Retry: "Retry",
  Status: "Status",
  Balance: "Balance",
  Stake: "Stake",
  Date: "Date",
  About: "About",
  "Bet History": "Bet History",
  "Bet history": "Bet history",
  "Game Outcome": "Game Outcome",
  "Select Language": "Select Language",
  "No bet history to display": "No bet history to display",
  "Start a game to display bet history": "Start a game to display bet history",
  Confirm: "Confirm",
  Cancel: "Cancel",
  Sound: "Sound",
  "Insufficient Funds": "Insufficient Funds",
  "Please top up your wallet or reduce your stakes.":
    "Please top up your wallet or reduce your stakes.",
  Close: "Close",
  "Make Your Prediction: Choose whether you think the coin will land on Heads or Tails.":
    "Make Your Prediction: Choose whether you think the coin will land on Heads or Tails.",
  "Winning: If you correctly predict the landing side of the coin, you win!":
    "Winning: If you correctly predict the landing side of the coin, you win!",
  "Losing: If you fail to correctly predict the landing side of the coin, you lose.":
    "Losing: If you fail to correctly predict the landing side of the coin, you lose.",
  "If the coin lands on its side (neither heads nor tails), the bet is lost.":
    "If the coin lands on its side (neither heads nor tails), the bet is lost.",
  "Winning Payout: Each winning turn pays": "Winning Payout: Each winning turn pays",
  'Place Your Bet: Select your desired bet amount by tapping on the number, using the "+" and "-" buttons or simply inputting the desired amount':
    'Place Your Bet: Select your desired bet amount by tapping on the number, using the "+" and "-" buttons or simply inputting the desired amount',
  "The Flip: Once you place your bet, the coin will flip and spin a few times then land.":
    "The Flip: Once you place your bet, the coin will flip and spin a few times then land.",
  "Welcome to Cointoss": "Welcome to Cointoss",
  "Quick game guide to onboard you through!": "Quick game guide to onboard you through!",
  Next: "Next",
  "Skip >": "Skip >",
  "Basic Rule": "Basic Rule",
  'Input your stake amount then select "head" or "tail" depending on what you think the outcome of the coin toss will be.':
    'Input your stake amount then select "head" or "tail" depending on what you think the outcome of the coin toss will be.',
  Start: "Start",
  min: "min",
  max: "max",

  // ========== "How to play" operator rules copy ==========
  // NOT from Unity's `gameTexts`: the ported help screen carried a short
  // bullet list (those keys are still listed above, and are still what the
  // Unity build shipped), which the official Coin Toss rules document
  // replaces wholesale — see `components/HelpModal.tsx`. Registered here
  // because this table is also the key list sent to the translation
  // service, so copy that is only ever passed to `t()` at the call site
  // would render English in every language. Interpolated figures (live
  // payout multipliers, worked stake/win amounts) are deliberately NOT
  // part of any key — they are concatenated around these strings, so the
  // keys stay stable whatever payout an operator configures.
  "Game Overview": "Game Overview",
  "Coin Toss is a fast-paced prediction game where players predict which side of a spinning coin will land face up.":
    "Coin Toss is a fast-paced prediction game where players predict which side of a spinning coin will land face up.",
  "Before each round, players choose either Heads or Tails. After the wager is placed, the coin spins and lands randomly on one side. If the player's prediction matches the final result, the player wins.":
    "Before each round, players choose either Heads or Tails. After the wager is placed, the coin spins and lands randomly on one side. If the player's prediction matches the final result, the player wins.",
  "Each round is independent and determined using certified Random Number Generator (RNG) technology to ensure fair and unpredictable outcomes.":
    "Each round is independent and determined using certified Random Number Generator (RNG) technology to ensure fair and unpredictable outcomes.",
  "How To Play": "How To Play",
  "Select Your Prediction": "Select Your Prediction",
  "Choose one of the two available outcomes:\n• Heads\n• Tails\n\nOnly one prediction may be selected per game round.":
    "Choose one of the two available outcomes:\n• Heads\n• Tails\n\nOnly one prediction may be selected per game round.",
  "Select Your Stake": "Select Your Stake",
  "Choose the amount you wish to wager. You can:\n• Use the + and − buttons to increase or decrease your stake.\n• Use the Quick Stake Buttons (+10, +20, +50, +100, +200, +500, +1000 and +2000) to instantly increase your wager.\n• View your selected stake amount in the stake display above the quick stake buttons.\n\nThe selected stake will be deducted from your wallet once the bet is accepted.":
    "Choose the amount you wish to wager. You can:\n• Use the + and − buttons to increase or decrease your stake.\n• Use the Quick Stake Buttons (+10, +20, +50, +100, +200, +500, +1000 and +2000) to instantly increase your wager.\n• View your selected stake amount in the stake display above the quick stake buttons.\n\nThe selected stake will be deducted from your wallet once the bet is accepted.",
  "Place Your Bet": "Place Your Bet",
  "After selecting your prediction and stake amount, press either the Heads or Tails button to submit your wager. Once accepted:\n• Your stake is deducted from your wallet.\n• The game server securely registers your bet.\n• The coin immediately begins spinning.\n\nAccepted bets cannot be cancelled or modified.":
    "After selecting your prediction and stake amount, press either the Heads or Tails button to submit your wager. Once accepted:\n• Your stake is deducted from your wallet.\n• The game server securely registers your bet.\n• The coin immediately begins spinning.\n\nAccepted bets cannot be cancelled or modified.",
  "Coin Spin": "Coin Spin",
  "The coin spins automatically after the wager has been accepted. The spinning animation represents the random result generated securely by the game server.":
    "The coin spins automatically after the wager has been accepted. The spinning animation represents the random result generated securely by the game server.",
  "Result Settlement": "Result Settlement",
  "When the coin stops spinning:\n• If it lands on Heads, all Head bets win.\n• If it lands on Tails, all Tail bets win.\n\nWinning bets are settled instantly and credited automatically to the player's wallet.":
    "When the coin stops spinning:\n• If it lands on Heads, all Head bets win.\n• If it lands on Tails, all Tail bets win.\n\nWinning bets are settled instantly and credited automatically to the player's wallet.",
  "Game Buttons": "Game Buttons",
  "Heads Button": "Heads Button",
  "Places a wager predicting that the coin will land on Heads.":
    "Places a wager predicting that the coin will land on Heads.",
  "Tails Button": "Tails Button",
  "Places a wager predicting that the coin will land on Tails.":
    "Places a wager predicting that the coin will land on Tails.",
  "Stake Increase (+)": "Stake Increase (+)",
  "Increases the current stake amount.": "Increases the current stake amount.",
  "Stake Decrease (−)": "Stake Decrease (−)",
  "Decreases the current stake amount.": "Decreases the current stake amount.",
  "Quick Stake Buttons": "Quick Stake Buttons",
  "Quickly increase your wager using preset stake values: +10, +20, +50, +100, +200, +500, +1000, +2000. Multiple selections may be combined to reach your preferred wager.":
    "Quickly increase your wager using preset stake values: +10, +20, +50, +100, +200, +500, +1000, +2000. Multiple selections may be combined to reach your preferred wager.",
  "Stake Display": "Stake Display",
  "Displays the total stake selected for the upcoming round.":
    "Displays the total stake selected for the upcoming round.",
  "Balance Display": "Balance Display",
  "Shows the player's available wallet balance.": "Shows the player's available wallet balance.",
  "Opens the complete game rules, gameplay instructions, payout information and betting rules.":
    "Opens the complete game rules, gameplay instructions, payout information and betting rules.",
  "Displays previously completed rounds, including:\n• Selected prediction\n• Stake amount\n• Winning outcome\n• Win/Loss status\n• Amount won\n• Date and time of play":
    "Displays previously completed rounds, including:\n• Selected prediction\n• Stake amount\n• Winning outcome\n• Win/Loss status\n• Amount won\n• Date and time of play",
  "Allows players to change the game language. Changing the language affects only the game interface and does not influence gameplay or results.":
    "Allows players to change the game language. Changing the language affects only the game interface and does not influence gameplay or results.",
  "Leaderboard": "Leaderboard",
  "Displays recent winners, highest payouts and top-performing players. The leaderboard is for informational purposes only and does not affect future game outcomes.":
    "Displays recent winners, highest payouts and top-performing players. The leaderboard is for informational purposes only and does not affect future game outcomes.",
  "Allows players to enable or disable game sound effects and music.":
    "Allows players to enable or disable game sound effects and music.",
  "Menu": "Menu",
  "Provides access to additional game settings, including:\n• Rules / Help\n• Language selection\n• Sound settings\n• Responsible Gaming information\n• Exit Game (where available)":
    "Provides access to additional game settings, including:\n• Rules / Help\n• Language selection\n• Sound settings\n• Responsible Gaming information\n• Exit Game (where available)",
  "For Fun Mode": "For Fun Mode",
  "Players can enjoy Coin Toss without wagering real money by using For Fun Mode.":
    "Players can enjoy Coin Toss without wagering real money by using For Fun Mode.",
  "To access For Fun Mode": "To access For Fun Mode",
  "• Return to the game lobby.\n• Select For Fun (or Demo Mode) before launching the game.\n• The game loads with virtual credits for practice.\n• All gameplay features, animations and rules remain identical to Real Play mode.\n• No real money is wagered or won while playing in For Fun Mode.\n• Players can switch back to Real Play Mode from the game lobby at any time.":
    "• Return to the game lobby.\n• Select For Fun (or Demo Mode) before launching the game.\n• The game loads with virtual credits for practice.\n• All gameplay features, animations and rules remain identical to Real Play mode.\n• No real money is wagered or won while playing in For Fun Mode.\n• Players can switch back to Real Play Mode from the game lobby at any time.",
  "Game Rules": "Game Rules",
  "Winning Outcome": "Winning Outcome",
  "Players win when the final side of the coin matches the selected prediction.\n• Prediction: Heads → Coin lands on Heads.\n• Prediction: Tails → Coin lands on Tails.":
    "Players win when the final side of the coin matches the selected prediction.\n• Prediction: Heads → Coin lands on Heads.\n• Prediction: Tails → Coin lands on Tails.",
  "Losing Outcome": "Losing Outcome",
  "The player loses if the coin lands on the opposite side from the selected prediction.":
    "The player loses if the coin lands on the opposite side from the selected prediction.",
  "Randomness": "Randomness",
  "Every coin toss is generated using certified Random Number Generator (RNG) technology. Every round is completely independent. Previous coin tosses do not influence future outcomes. Each result has an equal opportunity of occurring according to the game's mathematical model.":
    "Every coin toss is generated using certified Random Number Generator (RNG) technology. Every round is completely independent. Previous coin tosses do not influence future outcomes. Each result has an equal opportunity of occurring according to the game's mathematical model.",
  "Standard Win": "Standard Win",
  "Correct predictions are paid at:": "Correct predictions are paid at:",
  "Win Amount = Stake ×": "Win Amount = Stake ×",
  "Winning Return": "Winning Return",
  "Minimum Win": "Minimum Win",
  "The minimum possible win depends on:": "The minimum possible win depends on:",
  "• The fixed payout multiplier of": "• The fixed payout multiplier of",
  "(subject to the operator's payout configuration).":
    "(subject to the operator's payout configuration).",
  "Maximum Win": "Maximum Win",
  "The maximum possible win depends on:": "The maximum possible win depends on:",
  "RTP (Return to Player)": "RTP (Return to Player)",
  "Default RTP: 95%\n\nThe RTP represents the theoretical percentage of all wagered funds returned to players over a very large number of game rounds.":
    "Default RTP: 95%\n\nThe RTP represents the theoretical percentage of all wagered funds returned to players over a very large number of game rounds.",
  "Volatility": "Volatility",
  "Medium\n\nCoin Toss offers balanced gameplay with frequent win opportunities and consistent fixed payouts, making it a medium-volatility game suitable for both casual and regular players.":
    "Medium\n\nCoin Toss offers balanced gameplay with frequent win opportunities and consistent fixed payouts, making it a medium-volatility game suitable for both casual and regular players.",
  "Game Type": "Game Type",
  "Coin Flip / Binary Prediction": "Coin Flip / Binary Prediction",
  "Betting Configuration": "Betting Configuration",
  "Minimum Bet": "Minimum Bet",
  "The minimum playable stake amount is configured by the operator. Players cannot place bets below the configured minimum value.":
    "The minimum playable stake amount is configured by the operator. Players cannot place bets below the configured minimum value.",
  "Maximum Bet": "Maximum Bet",
  "The maximum playable stake amount is configured by the operator. Players cannot place bets above the configured maximum value.":
    "The maximum playable stake amount is configured by the operator. Players cannot place bets above the configured maximum value.",
  "Once a bet has been accepted:\n• The game round is processed securely on the game server.\n• Results cannot be altered or cancelled.\n• Winning bets are settled automatically.\n• Winnings are credited directly to the player's wallet.\n• Losing bets are recorded in Bet History.":
    "Once a bet has been accepted:\n• The game round is processed securely on the game server.\n• Results cannot be altered or cancelled.\n• Winning bets are settled automatically.\n• Winnings are credited directly to the player's wallet.\n• Losing bets are recorded in Bet History.",
  "Internet Connection Policy": "Internet Connection Policy",
  "Before Betting": "Before Betting",
  "If the player loses internet connection before the wager is successfully accepted:\n• The bet is not placed.\n• No funds are deducted.\n• The player may reconnect and place another bet.":
    "If the player loses internet connection before the wager is successfully accepted:\n• The bet is not placed.\n• No funds are deducted.\n• The player may reconnect and place another bet.",
  "After Bet Acceptance": "After Bet Acceptance",
  "If a player disconnects after the wager has been accepted:\n• The coin toss continues on the game server.\n• The result is generated normally.\n• The wager is settled automatically.\n• Any winnings are credited to the player's wallet.":
    "If a player disconnects after the wager has been accepted:\n• The coin toss continues on the game server.\n• The result is generated normally.\n• The wager is settled automatically.\n• Any winnings are credited to the player's wallet.",
  "Reconnection": "Reconnection",
  "After reconnecting, players can view:\n• Previous game result\n• Bet status\n• Win/Loss outcome\n• Wallet balance\n• Transaction history\n• Bet History":
    "After reconnecting, players can view:\n• Previous game result\n• Bet status\n• Win/Loss outcome\n• Wallet balance\n• Transaction history\n• Bet History",
  "Fair Play": "Fair Play",
  "• Every coin toss is determined using certified Random Number Generator (RNG) technology.\n• Every game round is completely independent.\n• Previous outcomes do not affect future results.\n• Neither players nor the operator can predict or manipulate the outcome of any coin toss.\n• All winning bets are settled automatically according to the official game rules and configured payout structure.":
    "• Every coin toss is determined using certified Random Number Generator (RNG) technology.\n• Every game round is completely independent.\n• Previous outcomes do not affect future results.\n• Neither players nor the operator can predict or manipulate the outcome of any coin toss.\n• All winning bets are settled automatically according to the official game rules and configured payout structure.",
};
