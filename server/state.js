// In-memory mock of the "aggregator" backend's game state (spec §2/§3/§4).
//
// Single-player demo store: every minted token resolves to the same
// underlying `player` record, so the game is fully playable with zero setup.
//
// Coin Toss's own real-money contract details reproduced here (spec §2/§4):
//  - Min/max bet ARE enforced (unlike the Penaldo/Keno mocks, where the
//    equivalent field exists but is never populated) — `aggregatorCurrency.
//    minimum`/`.maximum` are real and checked on every placeBet() call.
//  - `agg-place-bet` and `agg-actions` are two separate sequential calls
//    (spec §1 steps 8-9): placeBet() only validates + escrows the pending
//    selection; resolveRound() is the one place the RNG actually runs and
//    the wallet is debited/credited.
//  - The three-outcome RNG (`head`/`tail`/`side`) is server-authoritative and
//    NOT visible to the client before resolveRound() runs (spec §2).
//
// PROBABILITY SPLIT (documented decision, spec §2/§11 — not specified by the
// client source, which has no visibility into server RNG weighting):
//   head 48%, tail 48%, side 4%.
// Since the player can only ever choose head or tail, and either choice wins
// only when the coin lands on that exact face, the true player win
// probability is 48% — strictly below the 50% a fair two-outcome coin would
// give, which is exactly the "house edge via a third silent outcome" the
// spec's §2/§11 flags as a real, confirmed mechanic worth reproducing
// faithfully (not guessing a mathematically-fair split instead).
import crypto from "node:crypto";

const HEAD_PROBABILITY = 0.48;
const TAIL_PROBABILITY = 0.48; // side gets the remaining 0.04
const ODDS_ONE = 1.92; // LoginData.odds["1"] — single flat payout multiplier (spec §2)
const GAME_TYPE = "cointoss";

const validTokens = new Set();

function round2(n) {
  return Math.round(n * 100) / 100;
}

function nowIso() {
  return new Date().toISOString();
}

const player = {
  userId: "dev-player-1",
  sessionId: "dev-session-1",
  username: "TesterShacks",
  currency: "USD",
  balance: 1000,
  minimum: 1,
  maximum: 500,
  oddsOne: ODDS_ONE,
  // `AggregatorData.name` — the mock deliberately implements the generic/
  // no-aggregator-name path only (spec's task brief): Pariplay/Jelly/
  // Uplatform are real third-party SDK integrations out of scope for a
  // standalone rebuild (see README). Empty string reads as "falsy/generic"
  // to every `aggregator.name === "pariplay"`-style check in the client.
  aggregatorName: "",
  pendingBet: null, // { selection, amountPlaced } between place-bet and actions
  openRound: null, // see maybeSeedOpenRound() below
  hasSeededOpenRound: false,
  history: [],
};

export function mintToken() {
  const token = crypto.randomBytes(16).toString("hex");
  validTokens.add(token);
  return token;
}

/**
 * Local dev keeps every minted token in `validTokens`, which is correct for a
 * single long-lived `node server/index.js` process.
 *
 * The Vercel preview deployment (`api/mock/[...path].js`) runs this same app as
 * a serverless function, where there is no shared memory: the token exchange
 * and the `agg-authenticate` call that follows it are two separate HTTP
 * requests and can land on different (or cold) instances, so a
 * `validTokens`-only check would 401 the boot with "Session Exipired" roughly
 * whenever the second request missed the first one's instance. With
 * `MOCK_STATELESS_TOKENS=1` any token matching `mintToken()`'s own shape is
 * accepted instead. Safe precisely because this backend is a fake wallet —
 * there is nothing to protect — and it is read lazily (not at module init) so
 * the serverless wrapper can set it before handling a request.
 */
export function isValidToken(token) {
  if (validTokens.has(token)) return true;
  return process.env.MOCK_STATELESS_TOKENS === "1" && /^[0-9a-f]{32}$/.test(token);
}

export function getPlayer() {
  return player;
}

export function aggregatorDataPayload() {
  return {
    name: player.aggregatorName,
    id: player.userId,
    server: "mock",
    type: "generic",
    aggregator: "generic",
    mode: "live", // not "demo" — this mock is the single authoritative wallet
    data: {},
  };
}

/**
 * `LoginData` (`Data Structures/LoginData.cs`) — spec §4. Only the very
 * first boot authenticate call in this mock can carry a seeded `openRound`
 * (see `maybeSeedOpenRound`); every later call returns `openRound: null`
 * because this mock always fully resolves a round synchronously inside
 * `resolveRound()` (spec's §1 step 15 note: a real backend can leave a round
 * "open" if the process crashes mid-round; a single synchronous Node mock
 * has no equivalent failure window, so `openRound` naturally stays null
 * outside of this one seeded demonstration path — documented in README).
 */
export function loginDataFor() {
  const openRound = player.openRound;
  player.openRound = null; // once reported, the next call goes back to null
  return {
    username: player.username,
    sessionId: player.sessionId,
    balance: player.balance.toFixed(2),
    currency: player.currency,
    odds: { 1: player.oddsOne },
    openRound,
    aggregatorCurrency: { minimum: player.minimum, maximum: player.maximum },
  };
}

/** Set `MOCK_OPEN_ROUND=1` to have the very first `agg-authenticate` call
 * report an abandoned open round, exercising the client's auto-settle-on-
 * load reconciliation path (spec §1 step 6/15) end-to-end. */
export function maybeSeedOpenRound() {
  if (player.hasSeededOpenRound) return;
  player.hasSeededOpenRound = true;
  if (process.env.MOCK_OPEN_ROUND === "1") {
    player.openRound = {
      _id: "seeded-open-round",
      userId: player.userId,
      gameType: GAME_TYPE,
      username: player.username,
      selection: "head",
      selectedEventType: [],
      amountPlaced: 5,
      cashoutAmount: 9.6,
      potentialWinning: 9.6,
    };
  }
}

/** `agg-place-bet` (spec §1 step 8, §4) — validates and escrows the pending
 * bet; the RNG has not run yet. Throws with the exact `LanguageManager`
 * string key the UI expects to translate/display. */
export function placeBet({ selection, amountPlaced }) {
  if (selection !== "head" && selection !== "tail") {
    throw new Error("Invalid value input");
  }
  const amount = round2(Number(amountPlaced));
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Error debitting your wallet");
  }
  if (amount < player.minimum || amount > player.maximum) {
    throw new Error("Value out of bounds");
  }
  if (amount > player.balance) {
    throw new Error("Error debitting your wallet");
  }
  player.pendingBet = { selection, amountPlaced: amount };
}

/** `agg-actions` (spec §1 step 9, §2, §4) — the one place the server-side
 * RNG runs. Returns the `OutcomeResult` the client decrypts as
 * `BetData.data.event[0]`. */
export function resolveRound(forceOutcome) {
  const pending = player.pendingBet;
  if (!pending) {
    throw new Error("You've no ongoing round. Kindly reload!");
  }
  player.pendingBet = null;

  const generatedOutcome = rollOutcome(forceOutcome);
  const won = pending.selection === generatedOutcome;
  const cashoutAmount = won ? round2(pending.amountPlaced * player.oddsOne) : 0;

  player.balance = round2(player.balance - pending.amountPlaced + cashoutAmount);

  const nowTime = nowIso();
  const event = {
    level: 1,
    betTime: nowTime,
    processedTime: nowTime,
    selection: pending.selection,
    generatedOutcome,
    won: won ? "true" : "false",
    odds: player.oddsOne,
    amount: pending.amountPlaced,
    cashoutAmount,
  };

  player.history.unshift({
    gameType: GAME_TYPE,
    username: player.username,
    result: won ? "won" : "lost",
    amountPlaced: pending.amountPlaced,
    cashoutAmount,
    selectedEventType: [event],
  });

  return event;
}

function rollOutcome(forceOutcome) {
  if (forceOutcome === "head" || forceOutcome === "tail" || forceOutcome === "side") {
    return forceOutcome;
  }
  const r = Math.random();
  if (r < HEAD_PROBABILITY) return "head";
  if (r < HEAD_PROBABILITY + TAIL_PROBABILITY) return "tail";
  return "side";
}

/** `agg-manual-actions` (spec §1 step 15, §4) — settles an abandoned open
 * round found on load. Not a live cashout button; see README. No-ops (but
 * still succeeds) when there's nothing to settle, matching the real
 * endpoint's only actual caller (`GameManager.Init()`'s reconciliation path). */
export function manualSettle() {
  const round = player.openRound;
  if (!round) return { settled: false };
  player.balance = round2(player.balance + round.cashoutAmount);
  player.history.unshift({
    gameType: GAME_TYPE,
    username: player.username,
    result: round.cashoutAmount > 0 ? "won" : "lost",
    amountPlaced: round.amountPlaced,
    cashoutAmount: round.cashoutAmount,
    selectedEventType: [],
  });
  player.openRound = null;
  return { settled: true };
}

export function paginateHistory(page = 1, limit = 10) {
  const total = player.history.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const from = (currentPage - 1) * limit;
  const to = Math.min(from + limit, total);
  return {
    data: player.history.slice(from, to),
    pagination: { to, from, totalPages, total, limit, currentPage },
  };
}

export { GAME_TYPE };
