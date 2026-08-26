/**
 * The Coin Toss state machine (spec §1/§2/§3) as a plain, framework-agnostic
 * store — same architecture as the sibling Penaldo/Keno ports: mutable
 * fields mirroring `GameManager`/`VirtualCashManager`/`StakeInput`, React
 * only ever reads an immutable snapshot via `useSyncExternalStore` (see
 * `useGameSession.ts`).
 *
 * Key behavioral differences from Penaldo/Keno, all per spec:
 *  - Tapping Heads/Tails IS the bet-confirmation action — there is no
 *    separate confirm step (spec §1 step 7): `chooseAndBet()` below is the
 *    single entry point, mirroring `UIManager.SelectChoice -> ConfirmBet`.
 *  - Bet placement is TWO sequential HTTP calls (`agg-place-bet` then
 *    `agg-actions`) fired back-to-back with zero player action in between
 *    (spec §1 steps 8-9) — architecturally closer to Penaldo's separate
 *    place/resolve calls than Keno's single atomic call, but experienced by
 *    the player as one atomic action.
 *  - A flat 5-second coin-flip wait with no per-frame callback (spec §1 step
 *    10) — `runFlip()` below is a plain `await sleep(5000)`.
 *  - Real min/max bet enforcement (spec §2/§3) and procedurally-generated
 *    quick-bet chips (`generateQuickBetValues`, spec §3) — both genuinely new
 *    vs. Penaldo/Keno.
 *  - The source's `ReBet()`/`newRound()` pair (spec §1 step 14) is REMOVED by
 *    request: a resolved round announces itself in a toast and resets straight
 *    back to the bet controls, with the coin left resting on the face it landed
 *    on (`settledOutcome`).
 *  - `minimum`/`maximum`/`currency`/`username`/`odds` are populated ONLY from
 *    the boot authenticate call; every later re-authenticate (post-round)
 *    only refreshes `balance`+session per the original `GameManager.
 *    ReAuthenticate` (`GameManager.cs:427-568`) vs. `RunAuthenticate`
 *    (`GameLoader.cs:369-443`) field-list difference.
 */
import * as api from "../api/client";
import { isWon } from "../api/types";
import type { ComponentData, OutcomeResult, PlayerSelection } from "../api/types";
import { getLaunchParams, hrefWithoutReplayKeys } from "../api/urlParams";
import { loadStake, saveStake } from "./persistence";
import { sanitizeStakeInput } from "./format";
import { generateQuickBetValues } from "./quickBet";

const DEFAULT_MIN_FALLBACK = 1;
/**
 * Round pacing. The Unity builds hold every beat for two seconds or more;
 * on a phone that reads as lag rather than suspense, so the port keeps the
 * same beats and shortens them — roughly a second of animation, then the
 * outcome, with its toast on screen for a second.
 */
const FLIP_DURATION_MS = 1000; // GameManager.WaitForOutcome — WaitForSeconds(5), flat, no callback (spec §1 step 10); 5s of coin was the single slowest beat in the family
const NOTIFICATION_MS = 1000; // GameManager.Notify (~2s per toast, spec end of §1), halved — see note
const QUICK_BET_BUTTON_COUNT = 5;

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

  // Session / player (GameData, LoginData — spec §4)
  username: string;
  currency: string;
  balance: number;
  minimum: number;
  maximum: number;
  oddsOne: number;
  customization: ComponentData[];

  // Quick-bet chips (VirtualCashManager.GenerateValuesInRange, spec §3)
  quickBetValues: number[];

  // Stake (StakeInput/VirtualCashManager, spec §2/§3)
  stakeText: string;
  stake: number;

  // Round lifecycle (GameManager, spec §1)
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
  cashoutRetryVisible: boolean;
  cashoutRetryMessage: string;

  notification: Notification | null;

  // Bet history (CoinTossBetHistoryManager, spec §3 — single implementation)
  betHistory: import("../api/types").BetRecordData[];
  betHistoryPagination: import("../api/types").Pagination | null;
  betHistoryLoading: boolean;

  helpVisible: boolean;
}

type Listener = () => void;

interface Session {
  token: string;
  baseUrl: string;
  mainUrlBase: string;
  aggregatorDataCipher: string; // resent verbatim on every authenticate call
  sessionId: string;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

export class GameEngine {
  private listeners = new Set<Listener>();
  private session: Session | null = null;
  private snapshot: GameSnapshot;
  private notificationQueue: Notification[] = [];
  private isNotifying = false;
  private booted = false;

  constructor() {
    this.snapshot = {
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

  // ── store plumbing ────────────────────────────────────────────────────
  subscribe = (listener: Listener): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  getSnapshot = (): GameSnapshot => this.snapshot;

  private set(patch: Partial<GameSnapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const l of this.listeners) l();
  }

  private sleep(ms: number) {
    return new Promise<void>((resolve) => setTimeout(resolve, ms));
  }

  private messageOf(err: unknown): string {
    return err instanceof Error ? err.message : "Unexpected server response caused an exception.";
  }

  // ── boot (GameLoader.Start/LoadAll/RunTokenAndAuth, spec §1 steps 1-4) ──
  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;

    // `GameLoader.Start()` — `PlayerPrefs.DeleteAll()`, no tutorial-flag
    // exception unlike Penaldo/Keno (spec §1 step 1). This port has no
    // separate tutorial-seen flag to begin with, so wiping every one of this
    // origin's Coin-Toss-owned keys reproduces the same net effect.
    localStorage.removeItem("cointossStake");

    const { replayMode, roundId } = getLaunchParams();
    if (replayMode && !roundId) {
      this.set({ phase: "fatal-error", fatalError: "Missing roundId for replay." });
      return;
    }
    if (replayMode) {
      // Replay mode is confirmed non-functional even in the source (spec §0:
      // the scene component that would consume `RunReplay()`'s data doesn't
      // exist) — deliberately not built here (see README). Surface the same
      // class of fatal error the boot flow would show for any other
      // unsupported launch configuration, rather than silently ignoring the
      // param.
      this.set({
        phase: "fatal-error",
        fatalError: "Replay mode is not implemented in this build. Please relaunch the game",
      });
      return;
    }

    let boot: Awaited<ReturnType<typeof api.requestToken>>;
    try {
      boot = await api.requestToken(hrefWithoutReplayKeys());
    } catch (err) {
      this.set({ phase: "fatal-error", fatalError: this.messageOf(err) + ". Please relaunch the game" });
      return;
    }

    this.session = {
      token: boot.authorizationToken,
      baseUrl: boot.baseUrl,
      mainUrlBase: boot.mainUrlBase,
      aggregatorDataCipher: boot.aggregatorDataCipher,
      sessionId: "",
    };
    this.set({ customization: boot.customization });

    let loginData: Awaited<ReturnType<typeof api.authenticate>>;
    try {
      loginData = await api.authenticate(this.session.baseUrl, this.session.token, this.session.aggregatorDataCipher, true);
    } catch (err) {
      this.set({ phase: "fatal-error", fatalError: this.messageOf(err) + ". Please relaunch the game" });
      return;
    }

    this.applyLogin(loginData, /* full */ true);

    const quickBetValues = generateQuickBetValues(this.snapshot.minimum, this.snapshot.maximum, QUICK_BET_BUTTON_COUNT);
    const initialStake = clamp(loadStake(this.snapshot.minimum || DEFAULT_MIN_FALLBACK), this.snapshot.minimum, this.snapshot.maximum);
    this.set({ quickBetValues, stake: initialStake, stakeText: String(initialStake) });

    if (loginData.openRound) {
      // `GameManager.Init()` — an abandoned round left over server-side gets
      // auto-settled/reconciled with no player interaction (spec §1 step 6,
      // §1 step 15), NOT a replay-the-events resume UX.
      try {
        await api.manualActions(this.session.baseUrl, this.session.token, this.session.sessionId);
      } catch {
        // Best-effort reconciliation, same as the source (SendResults'
        // failure path just retries via ReAuthenticate below regardless).
      }
      await this.reAuthenticate(/* cashOut */ true);
    }

    this.set({ phase: "ready" });
    void this.refreshBetHistory(1);
  }

  /** `RunAuthenticate` (boot, full field set) vs. `GameManager.ReAuthenticate`
   * (post-round, balance+session only) — spec §1 steps 4 & 12/§4. */
  private applyLogin(loginData: Awaited<ReturnType<typeof api.authenticate>>, full: boolean): void {
    if (this.session) this.session.sessionId = loginData.sessionId;
    if (full) {
      this.set({
        username: loginData.username,
        currency: loginData.currency,
        balance: Number(loginData.balance),
        minimum: loginData.aggregatorCurrency.minimum,
        maximum: loginData.aggregatorCurrency.maximum,
        oddsOne: loginData.odds["1"] ?? 1,
      });
    } else {
      this.set({ balance: Number(loginData.balance) });
    }
  }

  // ── notifications (GameManager.NotifyPlayer/Notify, spec end of §1) ────
  notify(message: string, isError: boolean, suffix?: string): void {
    if (this.isNotifying) {
      this.notificationQueue.push({ message, isError, suffix });
      return;
    }
    this.isNotifying = true;
    this.set({ notification: { message, isError, suffix } });
    setTimeout(() => this.drainNotifications(), NOTIFICATION_MS);
  }

  private drainNotifications(): void {
    const next = this.notificationQueue.shift();
    if (!next) {
      this.isNotifying = false;
      this.set({ notification: null });
      return;
    }
    this.set({ notification: next });
    setTimeout(() => this.drainNotifications(), NOTIFICATION_MS);
  }

  toggleHelp(): void {
    this.set({ helpVisible: !this.snapshot.helpVisible });
  }

  dismissInsufficientFunds(): void {
    this.set({ insufficientFundsVisible: false });
  }

  // ── stake (StakeInput.InputBetManually / VirtualCashManager.AddToStake,
  // spec §2/§3 — min/max ARE genuinely enforced in this game) ────────────
  private canEditStake(): boolean {
    return !this.snapshot.hasMadeABet && !this.snapshot.busy;
  }

  /** Live keystroke formatting only (`LimitDecimalPlaces`) — range
   * validation happens on commit, mirroring `StakeInput.InputBetManually`
   * being invoked on blur/keypad-hide rather than every keystroke. */
  setStakeText(raw: string): void {
    if (!this.canEditStake()) return;
    this.set({ stakeText: sanitizeStakeInput(raw) });
  }

  /** `StakeInput.InputBetManually` (`StakeInput.cs:36-56`) — rejects a
   * manual entry outside `[minimum, maximum]` with a toast and reverts to
   * the last committed stake, exactly like the source. */
  commitStake(): void {
    if (!this.canEditStake()) return;
    const parsed = Number.parseFloat(this.snapshot.stakeText);
    if (this.snapshot.stakeText === "" || !Number.isFinite(parsed) || parsed <= 0) {
      this.set({ stakeText: String(this.snapshot.stake) });
      return;
    }
    if (parsed < this.snapshot.minimum || parsed > this.snapshot.maximum) {
      this.set({ stakeText: String(this.snapshot.stake) });
      this.notify("Value out of bounds", true);
      return;
    }
    saveStake(parsed);
    this.set({ stake: parsed, stakeText: String(parsed) });
  }

  /** `VirtualCashManager.AddToStake` (`VirtualCashManager.cs:98-118`) —
   * clamps at `maximum` only; there is no matching decrease-chip/minimum
   * clamp in the source for this game (only "+value" quick-bet chips exist,
   * no "-1" stepper — see README). */
  addChip(amount: number): void {
    if (!this.canEditStake()) return;
    if (this.snapshot.stake + amount > this.snapshot.maximum) {
      this.notify("Cannot exceed max limit", true);
      const value = this.snapshot.maximum;
      saveStake(value);
      this.set({ stake: value, stakeText: String(value) });
      return;
    }
    const value = round2(this.snapshot.stake + amount);
    saveStake(value);
    this.set({ stake: value, stakeText: String(value) });
  }

  /**
   * `Addition Button` / `Subtraction Button` — the +/- stepper pair beside
   * the stake field. Steps by one currency unit and clamps to
   * [`minimum`, `maximum`], notifying on a clamp the same way `addChip`
   * does. `addChip` is add-only (its quick-bet chips have no decrease
   * counterpart), so the steppers are the only way to walk the stake DOWN.
   */
  stepStake(delta: number): void {
    if (!this.canEditStake()) return;
    const { stake, minimum, maximum } = this.snapshot;
    const next = round2(stake + delta);
    if (next > maximum) {
      this.notify("Cannot exceed max limit", true);
      saveStake(maximum);
      this.set({ stake: maximum, stakeText: String(maximum) });
      return;
    }
    if (next < minimum) {
      this.notify("Cannot go below min limit", true);
      saveStake(minimum);
      this.set({ stake: minimum, stakeText: String(minimum) });
      return;
    }
    saveStake(next);
    this.set({ stake: next, stakeText: String(next) });
  }

  // ── bet placement (UIManager.SelectChoice -> ConfirmBet -> GameManager.
  // OnPlayerBet -> RelayBetToBE -> GetResults, spec §1 steps 7-9) ────────
  async chooseAndBet(choice: PlayerSelection): Promise<void> {
    if (!this.session) return;
    if (this.snapshot.hasMadeABet) {
      this.notify("You cannot place multiple bets", true);
      return;
    }
    if (this.snapshot.busy) {
      this.notify("Please wait for current process to complete", true);
      return;
    }
    // VirtualCashManager.CheckBalance() — pure `balance - amountPlaced < 0`.
    if (this.snapshot.balance - this.snapshot.stake < 0) {
      this.set({ insufficientFundsVisible: true });
      return;
    }

    // Drop the previous round's resting face now that a new round is starting,
    // so the coin spins from `load` rather than sitting on a stale outcome.
    this.set({ busy: true, settledOutcome: null });
    const stake = this.snapshot.stake;

    try {
      await api.placeBet(this.session.baseUrl, this.session.token, this.session.sessionId, stake, choice);
    } catch (err) {
      this.set({ busy: false });
      this.notify(this.messageOf(err), true);
      return;
    }

    // GetResults fires automatically the instant place-bet succeeds — zero
    // intervening player action (spec §1 step 9, §2).
    let event: OutcomeResult;
    try {
      const betData = await api.getResults(this.session.baseUrl, this.session.token, this.session.sessionId, choice);
      event = betData.data.event[0];
    } catch (err) {
      this.set({ busy: false });
      this.notify(this.messageOf(err), true);
      return;
    }

    this.set({
      balance: round2(this.snapshot.balance - stake), // optimistic local debit, spec §1 step 9
      hasMadeABet: true,
      busy: false,
      lastChoice: choice,
    });
    void this.runFlip(choice, event);
  }

  // ── coin flip (GameManager.StartRound/WaitForOutcome, spec §1 step 10) ─
  private async runFlip(choice: PlayerSelection, event: OutcomeResult): Promise<void> {
    this.set({ isFlipping: true, flipOutcome: event.generatedOutcome });
    await this.sleep(FLIP_DURATION_MS); // flat WaitForSeconds(5), no per-frame callback, no fallback timeout
    // `settledOutcome` outlives the flip so the coin holds this face through the
    // post-round resync and the auto-reset back to the bet controls.
    this.set({ isFlipping: false, settledOutcome: event.generatedOutcome });

    const won = isWon(event);
    this.pendingResult = { playerChoice: choice, desiredOutcome: event.generatedOutcome, won, cashoutAmount: event.cashoutAmount };
    await this.reAuthenticate(/* cashOut */ false);
  }

  private pendingResult: RoundResult | null = null;

  /** `GameManager.ReAuthenticate` (`GameManager.cs:427-568`, spec §1 step
   * 12) — re-authenticates (balance/session resync only, see `applyLogin`),
   * then reveals the win/loss panel unless this is the cashout-reconciliation
   * pass (`cashOut === true`), which suppresses the reveal. */
  private async reAuthenticate(cashOut: boolean): Promise<void> {
    if (!this.session) return;
    this.set({ busy: true });
    let loginData: Awaited<ReturnType<typeof api.authenticate>>;
    try {
      loginData = await api.authenticate(this.session.baseUrl, this.session.token, this.session.aggregatorDataCipher, false);
    } catch (err) {
      this.notify(this.messageOf(err), true);
      this.set({ busy: false, cashoutRetryVisible: true, cashoutRetryMessage: this.messageOf(err) });
      return;
    }
    this.applyLogin(loginData, /* full */ false);
    this.set({ busy: false, cashoutRetryVisible: false });

    if (!cashOut && this.pendingResult) {
      const result = this.pendingResult;
      this.pendingResult = null;
      // The win/loss reveal is a toast, not a panel: the `ResultsPanel` trophy
      // card and its Rebet/New Round pair are gone, so the round announces
      // itself and hands control straight back to the bet controls.
      //
      // The amount rides in `suffix` rather than being interpolated into
      // `message`, because `message` is a translation KEY (`t()` looks it up in
      // `DEFAULT_STRINGS`) — baking a number into it would miss the table and
      // ship an untranslated string. The suffix is appended verbatim after the
      // translated phrase.
      this.notify(
        result.won ? "You just won" : "Sorry. You lost",
        !result.won,
        result.won ? `${this.snapshot.currency} ${result.cashoutAmount.toFixed(2)}` : undefined,
      );
      // Auto-reset back to the bet controls (spec §1 step 14's Rebet/New Round
      // step is removed by request) while KEEPING the coin on the face it
      // landed on — `resetForNewRound` deliberately preserves `settledOutcome`.
      this.resetForNewRound();
      void this.refreshBetHistory(1);
    }
  }

  /** `GameManager.RetryCashout` (`GameManager.cs:569-572`) — the
   * `cashoutRetryPanel`'s Retry button, shown when a post-round
   * re-authenticate call fails to reach the server. */
  retryReAuthenticate(): void {
    void this.reAuthenticate(false);
  }

  /**
   * Return to the bet controls for the next round.
   *
   * The source's `Rebet`/`Newround` buttons (spec §1 step 14) are removed by
   * request — this now runs automatically the moment a round resolves, so the
   * player is never asked to dismiss a results panel.
   *
   * `settledOutcome` is deliberately NOT cleared: the coin must keep showing
   * the face it landed on while the player sets up their next bet. `chooseAndBet`
   * clears it when the next round actually starts.
   */
  private resetForNewRound(): void {
    this.set({
      hasMadeABet: false,
      busy: false,
      isFlipping: false,
      flipOutcome: null,
      stake: clamp(loadStake(this.snapshot.minimum), this.snapshot.minimum, this.snapshot.maximum),
      stakeText: String(clamp(loadStake(this.snapshot.minimum), this.snapshot.minimum, this.snapshot.maximum)),
    });
  }

  // ── bet history (CoinTossBetHistoryManager, spec §3 — single
  // implementation, limit 10, keyed off sessionId) ───────────────────────
  async refreshBetHistory(page: number): Promise<void> {
    if (!this.session) return;
    this.set({ betHistoryLoading: true });
    try {
      const res = await api.fetchBetHistory(this.session.mainUrlBase, this.session.token, this.session.sessionId, page);
      this.set({ betHistory: res.data.bet.data, betHistoryPagination: res.data.bet.pagination });
    } catch {
      // Bet history failures are non-fatal (spec §3) — leave prior data in place.
    } finally {
      this.set({ betHistoryLoading: false });
    }
  }
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(min) || !Number.isFinite(max) || max <= 0) return value;
  return Math.min(Math.max(value, min), max);
}
