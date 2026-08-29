/**
 * The shape both backend integrations present to the UI.
 *
 * This game ships to two kinds of betting client — **partners** and
 * **aggregators** — whose APIs differ in almost every particular (see
 * `docs/PARTNER_API_INTEGRATION.md` and `docs/AGGREGATOR_API_INTEGRATION.md`).
 * `VITE_INTEGRATION` picks one at build time.
 *
 * Everything above `useGameSession` is written against this module and nothing
 * else, so the two engines are drop-in replacements for each other. That is the
 * whole point: `GameSnapshot` and `GameSession` are the contract, and neither
 * engine may add, drop, or retype a field. If one integration has no natural
 * value for something the other populates, it maps its own semantics onto the
 * existing field (see `PartnerGameEngine`'s notes on `minimum`/`maximum` and
 * `retryReAuthenticate`) rather than widening this file.
 */
import type { BetRecordData, ComponentData, Pagination, PlayerSelection } from "../api/types";

export type Phase = "booting" | "fatal-error" | "ready";

export interface Notification {
  /** A translation KEY — `NotificationToast` renders `t(message)`. */
  message: string;
  isError: boolean;
  /**
   * Appended verbatim after the translated `message`, for data that must NOT go
   * through the translation table (amounts, currency codes). Lets the win toast
   * read "You just won USD 19.20" with only the phrase localized.
   */
  suffix?: string;
}

export interface RoundResult {
  playerChoice: PlayerSelection;
  desiredOutcome: string;
  won: boolean;
  cashoutAmount: number;
}

export interface GameSnapshot {
  phase: Phase;
  fatalError: string | null;

  // Session / player
  username: string;
  currency: string;
  balance: number;
  minimum: number;
  maximum: number;
  oddsOne: number;
  customization: ComponentData[];

  // Quick-bet chips (VirtualCashManager.GenerateValuesInRange)
  quickBetValues: number[];

  // Stake (StakeInput/VirtualCashManager)
  stakeText: string;
  stake: number;

  // Round lifecycle (GameManager)
  lastChoice: PlayerSelection | null;
  hasMadeABet: boolean;
  busy: boolean; // isAttemptingServerCallBack
  isFlipping: boolean; // isSpinning
  flipOutcome: string | null; // desiredOutcome, drives the coin's CSS animation state
  /**
   * The face the coin came to rest on in the round that just finished.
   *
   * Separate from `flipOutcome` (which only lives for the duration of the flip
   * animation) because the coin must KEEP showing the previous result after the
   * round auto-resets back to the bet controls, instead of snapping back to
   * `idle`. Cleared when the next bet is placed, so a new round starts from the
   * spin rather than from the stale face.
   */
  settledOutcome: string | null;

  insufficientFundsVisible: boolean;
  /**
   * The retry panel. Aggregator: a post-round re-authenticate failed. Partner:
   * a bet request never reached the server (the spec §3.2 `stalled` branch).
   * Both mean "the round is still live, and one call needs to land".
   */
  cashoutRetryVisible: boolean;
  cashoutRetryMessage: string;

  notification: Notification | null;

  // Bet history
  betHistory: BetRecordData[];
  betHistoryPagination: Pagination | null;
  betHistoryLoading: boolean;

  helpVisible: boolean;
}

/** What `useGameSession` hands the component tree, identically for either
 * integration. */
export interface GameSession {
  state: GameSnapshot;
  actions: {
    chooseAndBet: (choice: PlayerSelection) => void;
    setStakeText: (raw: string) => void;
    commitStake: () => void;
    addChip: (amount: number) => void;
    stepStake: (delta: number) => void;
    dismissInsufficientFunds: () => void;
    /** Aggregator: retry the failed re-authenticate. Partner: resubmit the bet
     * that never reached the server. */
    retryReAuthenticate: () => void;
    toggleHelp: () => void;
    refreshBetHistory: (page: number) => void;
  };
}

/**
 * The structural contract an engine must satisfy to back `useGameSession`.
 * Both `GameEngine` and `PartnerGameEngine` are checked against it at their
 * definition, so a drift in either is a compile error rather than a runtime
 * surprise in one integration only.
 */
export interface GameEngineLike {
  subscribe: (listener: () => void) => () => void;
  getSnapshot: () => GameSnapshot;
  boot: () => Promise<void>;
  chooseAndBet: (choice: PlayerSelection) => Promise<void>;
  setStakeText: (raw: string) => void;
  commitStake: () => void;
  addChip: (amount: number) => void;
  stepStake: (delta: number) => void;
  dismissInsufficientFunds: () => void;
  retryReAuthenticate: () => void;
  toggleHelp: () => void;
  refreshBetHistory: (page: number) => Promise<void>;
}

/**
 * `GameManager.WaitForOutcome` — `WaitForSeconds(5)`, flat, no callback.
 * Shortened from the source's 5s: that was the single slowest beat in the
 * family.
 *
 * EXPORTED because the coin's CSS animations must run for exactly this long —
 * `CoinStage` feeds it to `--flip-ms`.
 */
export const FLIP_DURATION_MS = 1000;
/** `GameManager.Notify` (~2s per toast in the source), halved for pacing. */
export const NOTIFICATION_MS = 1000;
export const QUICK_BET_BUTTON_COUNT = 5;
/** Stake floor when the backend does not supply one — see `PartnerGameEngine`. */
export const DEFAULT_MIN_FALLBACK = 1;

export const round2 = (n: number): number => Math.round(n * 100) / 100;

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) return value;
  return Math.min(Math.max(value, min), max);
}

/** The pre-boot snapshot, shared so neither engine can drift from the other's
 * idea of "nothing has happened yet". */
export function initialSnapshot(): GameSnapshot {
  return {
    phase: "booting",
    fatalError: null,
    username: "",
    currency: "",
    balance: 0,
    minimum: 0,
    maximum: 0,
    oddsOne: 1,
    customization: [],
    quickBetValues: [],
    stakeText: "",
    stake: 0,
    lastChoice: null,
    hasMadeABet: false,
    busy: false,
    isFlipping: false,
    flipOutcome: null,
    settledOutcome: null,
    insufficientFundsVisible: false,
    cashoutRetryVisible: false,
    cashoutRetryMessage: "",
    notification: null,
    betHistory: [],
    betHistoryPagination: null,
    betHistoryLoading: false,
    helpVisible: false,
  };
}
