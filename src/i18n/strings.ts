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
};
