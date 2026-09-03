/**
 * The Coin Toss state machine for the **partner** contract
 * (`docs/PARTNER_API_INTEGRATION.md`).
 *
 * Structurally the twin of `gameEngine.ts`: same store plumbing, same
 * `GameSnapshot`, same action surface, so `useGameSession` can swap between
 * them on `VITE_INTEGRATION` with nothing above it changing. Both are checked
 * against `GameEngineLike`, so drift in either is a compile error.
 *
 * Where the partner round genuinely differs from the aggregator's:
 *
 *  - **Boot is token + authenticate, and the token base comes out of the
 *    launch URL.** `clientId` is `"<slug>-<AES(serverBase)>"` (§1.2); a missing
 *    or undecryptable one is fatal.
 *  - **One call per round.** `th-place-bet` debits, runs the RNG and returns
 *    the authoritative balance in a single response (§3). There is no
 *    `agg-actions` resolve step, no post-round re-authenticate, and no balance
 *    endpoint — so the local optimistic debit the aggregator engine performs
 *    has no place here: the server's figure is applied directly.
 *  - **`status: false` is a business rejection, not an error** (§3, §10). The
 *    coin must NOT spin; the player adjusts and retries.
 *  - **A transport failure is `stalled`, not failed** (§3.2). The request never
 *    reached the server, so no money moved and the identical payload is safe to
 *    resubmit. The round stays live, controls stay disabled, and a poller
 *    retries until it lands.
 *  - **No stake limits arrive from the backend** (§11), so they are derived —
 *    see `applyBalance`.
 */
import * as api from "../api/partnerClient";
import { ApiError } from "../api/http";
import { isWon } from "../api/types";
import type { LeaderboardEdge, OutcomeResult, Pagination, PlayerSelection } from "../api/types";
import { getLaunchParams } from "../api/urlParams";
import { loadStake, saveStake } from "./persistence";
import { formatMoney, sanitizeStakeInput } from "./format";
import { generateQuickBetValues } from "./quickBet";
import {
  DEFAULT_MIN_FALLBACK,
  FLIP_DURATION_MS,
  NOTIFICATION_MS,
  QUICK_BET_BUTTON_COUNT,
  clamp,
  initialSnapshot,
  round2,
  type GameEngineLike,
  type GameSnapshot,
  type Notification,
} from "./sessionContract";

/** §11 — the client-side default stake when the `default-stake-amount`
 * customization key is absent. */
const DEFAULT_STAKE = 10;
/** §3.2 — how often the stalled round re-attempts its unsent bet. */
const RECONNECT_POLL_MS = 1000;
/** Must match `partnerClient`'s own default so the pager's page-size
 * assumption matches what was actually requested. */
const HISTORY_LIMIT = 20;

type Listener = () => void;

interface Session {
  token: string;
  baseUrl: string;
  mainUrlBase: string;
  /** Decrypted `meta.playerId` — the bet-history key (partner has no
   * `sessionId`). */
  userId: string;
}

/** The bet that never reached the server, held verbatim for resubmission. */
interface PendingBet {
  choice: PlayerSelection;
  stake: number;
}

export class PartnerGameEngine implements GameEngineLike {
  private listeners = new Set<Listener>();
  private session: Session | null = null;
  private snapshot: GameSnapshot = initialSnapshot();
  private notificationQueue: Notification[] = [];
  private isNotifying = false;
  private booted = false;

  /** §3.2 — set only while a bet is stalled; cleared the moment one lands. */
  private stalledBet: PendingBet | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** §5 — the rank toast fires once per session, not once per round. */
  private leaderboardToastShown = false;
  /**
   * What the stake returns to between rounds when the player has not set one.
   *
   * `loadStake`'s fallback, not the bare `minimum`: falling back to the floor
   * discarded the operator's `default-stake-amount` after the very first round,
   * so a table configured to open at 10 quietly dropped to 1.
   */
  private openingStake = DEFAULT_STAKE;

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

  // ── boot (§2) ──────────────────────────────────────────────────────────
  async boot(): Promise<void> {
    if (this.booted) return;
    this.booted = true;

    // Unity wipes PlayerPrefs on launch, keeping only the tutorial flag (§11).
    // This port owns exactly one key, so clearing it reproduces the net effect.
    localStorage.removeItem("cointossStake");

    const { clientId } = getLaunchParams();

    let serverBase: string;
    try {
      serverBase = await this.resolveServerBase(clientId);
    } catch (err) {
      this.set({ phase: "fatal-error", fatalError: this.messageOf(err) + ". Please relaunch the game" });
      return;
    }

    let boot: Awaited<ReturnType<typeof api.requestToken>>;
    try {
      boot = await api.requestToken(serverBase, clientId ?? "");
    } catch (err) {
      this.set({ phase: "fatal-error", fatalError: this.messageOf(err) + ". Please relaunch the game" });
      return;
    }

    this.session = {
      token: boot.token,
      baseUrl: boot.baseUrl,
      mainUrlBase: boot.mainUrlBase,
      userId: boot.userId,
    };
    this.set({ customization: boot.customization });

    let login: Awaited<ReturnType<typeof api.authenticate>>;
    try {
      login = await api.authenticate(this.session.baseUrl, this.session.token);
    } catch (err) {
      this.set({ phase: "fatal-error", fatalError: this.messageOf(err) + ". Please relaunch the game" });
      return;
    }

    this.applyStakeLimits(boot.customization);

    const balance = Number(login.balance);
    this.set({
      username: login.username,
      currency: login.currency,
      oddsOne: login.odds["1"] ?? 1,
    });
    this.applyBalance(balance, /* regenerateChips */ true);

    // §6/§11 — the opening stake is the `default-stake-amount` customization
    // if the operator set one, else 10, and the remembered stake wins over
    // both once the player has bet before.
    const configured = Number(
      boot.customization.find((c) => c.name === "default-stake-amount")?.value,
    );
    const opening =
      Number.isFinite(configured) && configured > 0
        ? configured
        : Math.max(this.snapshot.minimum, Math.min(DEFAULT_STAKE, this.snapshot.maximum));
    this.openingStake = opening;
    const initialStake = clamp(loadStake(opening), this.snapshot.minimum, this.snapshot.maximum);
    this.set({ stake: initialStake, stakeText: String(initialStake) });

    this.set({ phase: "ready" });
    void this.refreshBetHistory(1);
  }

  /**
   * §1.2 — the partner API origin is `decrypt(clientId.split("-")[1])`.
   *
   * In dev there is no operator to supply a `clientId`, so a launch without one
   * falls back to this origin, which `vite.config.ts` proxies to the mock
   * (`server/index.js`). In a real build a missing `clientId` stays fatal, as
   * the spec requires.
   */
  private async resolveServerBase(clientId: string | null): Promise<string> {
    if (!clientId) {
      if (import.meta.env.DEV) return window.location.origin;
      throw new Error("Missing clientId");
    }
    return api.resolveServerBase(clientId);
  }

  /**
   * The partner backend sends NO stake limits (§11), so they are derived from
   * what it does send:
   *
   *   - `minimum` — a floor of 1. The spec's only rule is "> 0 and at most 2
   *     decimal places"; the quick-bet generator needs a positive lower bound.
   *   - `maximum` — the live balance, which is exactly the spec's client-side
   *     rule ("an over-balance stake opens the insufficient-funds dialog and
   *     never reaches the network"). It tracks every balance change, so a win
   *     immediately raises the ceiling.
   *
   * Quick-bet chips are generated ONCE, at boot: regenerating them per round
   * would reshuffle the buttons under the player's finger every time the
   * balance moved.
   */
  private applyBalance(balance: number, regenerateChips = false): void {
    // The player can never stake more than they hold, on top of whatever
    // ceiling the operator configured.
    const maximum = Math.min(this.limitMax, balance > 0 ? round2(balance) : 0);
    const patch: Partial<GameSnapshot> = {
      balance: round2(balance),
      minimum: this.limitMin,
      maximum,
    };
    if (regenerateChips) {
      patch.quickBetValues = generateQuickBetValues(
        this.limitMin,
        maximum,
        QUICK_BET_BUTTON_COUNT,
      );
    }
    this.set(patch);
  }

  /**
   * Stake limits, resolved from the customization payload at boot.
   *
   * `th-authenticate-player` sends none — but the operator's customization
   * does, under `minimum-stake-amount` / `maximum-stake-amount` (the live
   * partner returns 10 and 20001). Reading them is what stops the player
   * submitting a stake the backend will only reject at bet time with
   * "Minimum stake must be ZAR 10".
   */
  private limitMin = DEFAULT_MIN_FALLBACK;
  private limitMax = Number.POSITIVE_INFINITY;

  private applyStakeLimits(customization: { name: string; value: string }[]): void {
    const read = (name: string): number | null => {
      const raw = customization.find((c) => c.name === name)?.value;
      const n = Number(raw);
      return raw !== undefined && raw !== "" && Number.isFinite(n) && n > 0 ? n : null;
    };
    this.limitMin = read("minimum-stake-amount") ?? DEFAULT_MIN_FALLBACK;
    this.limitMax = read("maximum-stake-amount") ?? Number.POSITIVE_INFINITY;
  }

  /**
   * The live backend sends `from`/`limit` as strings and `total`/`totalPages`
   * as 0 even when a full page came back, which would make the shared pager
   * (keyed off `totalPages`) hide itself entirely.
   *
   * Spec §4 describes the source's pager as prev/next only, ignoring
   * `totalPages`, with an over-run page simply rendering the empty state. This
   * reproduces that inside a totalPages-driven component: coerce the numeric
   * strings, and when the backend gives no usable total, a full page implies at
   * least one more.
   */
  private normalizePagination(raw: Pagination | undefined, rows: number, limit: number): Pagination {
    const num = (v: unknown, fallback: number) => {
      const n = Number(v);
      return Number.isFinite(n) ? n : fallback;
    };
    const currentPage = num(raw?.currentPage, 1);
    let totalPages = num(raw?.totalPages, 0);
    if (totalPages < 1) totalPages = rows >= limit ? currentPage + 1 : currentPage;
    return {
      to: num(raw?.to, 0),
      from: num(raw?.from, 0),
      total: num(raw?.total, rows),
      limit: num(raw?.limit, limit),
      currentPage,
      totalPages,
    };
  }

  // ── notifications ──────────────────────────────────────────────────────
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

  // ── stake ──────────────────────────────────────────────────────────────
  private canEditStake(): boolean {
    return !this.snapshot.hasMadeABet && !this.snapshot.busy;
  }

  setStakeText(raw: string): void {
    if (!this.canEditStake()) return;
    this.set({ stakeText: sanitizeStakeInput(raw) });
  }

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

  // ── the round (§3) ─────────────────────────────────────────────────────
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
    // §11 — an over-balance stake never reaches the network.
    if (this.snapshot.balance - this.snapshot.stake < 0) {
      this.set({ insufficientFundsVisible: true });
      return;
    }

    this.set({ busy: true, settledOutcome: null });
    await this.submitBet({ choice, stake: this.snapshot.stake });
  }

  /**
   * The one network call of a partner round, and its four outcomes (§3.2):
   * resolved, business rejection, server error, and stalled.
   *
   * Shared by the first attempt and every reconnect retry, so a resubmitted bet
   * is byte-identical to the one that never landed.
   */
  private async submitBet(bet: PendingBet): Promise<void> {
    if (!this.session) return;

    let result: Awaited<ReturnType<typeof api.placeBet>>;
    try {
      result = await api.placeBet(this.session.baseUrl, this.session.token, {
        currency: this.snapshot.currency,
        username: this.snapshot.username,
        selection: bet.choice,
        amountPlaced: bet.stake,
      });
    } catch (err) {
      if (err instanceof ApiError && err.isConnectionError) {
        // STALLED (§3.2): the request never reached the server, so no bet was
        // placed and no money moved. Keep the round live and resubmit — that
        // is safe precisely because the original never landed.
        this.beginStalledRetry(bet, this.messageOf(err));
        return;
      }
      // Either a business rejection (`status: false`) or a non-2xx: the server
      // answered and declined. No animation; the player acts.
      this.clearStall();
      this.set({ busy: false });
      this.notify(this.messageOf(err), true);
      return;
    }

    this.clearStall();

    // §3.1 — the balance in this response is authoritative and applied
    // immediately. No optimistic local debit: unlike the aggregator's
    // place/resolve split, there is no window where the client has to guess.
    const balance = Number(result.balance);
    if (Number.isFinite(balance)) this.applyBalance(balance);

    if (result.currency) this.set({ currency: result.currency });

    const event = result.event;
    if (!event || !["head", "tail", "side"].includes(event.generatedOutcome)) {
      // §3.1 — anything outside the three outcomes is a malformed response.
      this.set({ busy: false });
      this.notify("Unexpected server response caused an exception.", true);
      return;
    }

    this.set({ hasMadeABet: true, busy: false, lastChoice: bet.choice });
    void this.runFlip(event, result.leaderboard ?? null);
  }

  /** §3.2 — hold the round open and retry the identical payload every second
   * until it lands. Exactly one poller is alive at a time. */
  private beginStalledRetry(bet: PendingBet, message: string): void {
    this.stalledBet = bet;
    this.set({ busy: true, cashoutRetryVisible: true, cashoutRetryMessage: message });
    if (this.reconnectTimer !== null) return;
    const tick = () => {
      this.reconnectTimer = setTimeout(() => {
        this.reconnectTimer = null;
        const pending = this.stalledBet;
        if (!pending) return;
        // `navigator.onLine` is a cheap negative check only — false is reliable,
        // true is not — so a "yes" still goes through the real request.
        if (typeof navigator !== "undefined" && navigator.onLine === false) {
          tick();
          return;
        }
        void this.submitBet(pending).then(() => {
          if (this.stalledBet) tick();
        });
      }, RECONNECT_POLL_MS);
    };
    tick();
  }

  private clearStall(): void {
    this.stalledBet = null;
    if (this.reconnectTimer !== null) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.snapshot.cashoutRetryVisible) {
      this.set({ cashoutRetryVisible: false, cashoutRetryMessage: "" });
    }
  }

  /**
   * `retryReAuthenticate` in the shared action surface. Partner has no
   * re-authenticate, so the retry button drives the only thing that can be
   * retried here: the bet that never reached the server.
   */
  retryReAuthenticate(): void {
    const pending = this.stalledBet;
    if (!pending) {
      this.set({ cashoutRetryVisible: false });
      return;
    }
    void this.submitBet(pending);
  }

  // ── reveal ─────────────────────────────────────────────────────────────
  private async runFlip(
    event: OutcomeResult,
    leaderboard: LeaderboardEdge | null,
  ): Promise<void> {
    this.set({ isFlipping: true, flipOutcome: event.generatedOutcome });
    await this.sleep(FLIP_DURATION_MS);
    this.set({ isFlipping: false, settledOutcome: event.generatedOutcome });

    // §3.1 — trust `event.won`, never a client-side comparison of selection
    // against outcome, and take `cashoutAmount` as given rather than
    // recomputing it from amount × odds. It arrives as a string on this
    // endpoint even though history sends a number.
    const won = isWon(event);
    const cashoutAmount = Number(event.cashoutAmount) || 0;

    // A `side` landing is the one outcome the coin art cannot explain on its
    // own: there is no third face, so the player sees the coin edge-on and has
    // no idea why the round was lost. Name it in the message. Head and tail
    // are self-evident from the face that is showing, so they read as before.
    this.notify(
      won ? "You just won" : event.generatedOutcome === "side" ? "Middle. You lost" : "Sorry. You lost",
      !won,
      won ? `${this.snapshot.currency} ${formatMoney(cashoutAmount)}` : undefined,
    );

    // §5 — a rank change rides along with the bet response. Surfaced through
    // the shared `notification` field rather than new snapshot state, so the
    // aggregator swap stays byte-identical. Once per session, as in the source.
    if (leaderboard && !this.leaderboardToastShown) {
      this.leaderboardToastShown = true;
      this.notify(
        "You are now ranked",
        false,
        `#${leaderboard.rank} — ${leaderboard.reward}`,
      );
    }

    this.resetForNewRound();
    void this.refreshBetHistory(1);
  }

  private resetForNewRound(): void {
    const restored = clamp(
      loadStake(this.openingStake),
      this.snapshot.minimum,
      this.snapshot.maximum,
    );
    this.set({
      hasMadeABet: false,
      busy: false,
      isFlipping: false,
      flipOutcome: null,
      stake: restored,
      stakeText: String(restored),
    });
  }

  // ── bet history (§4) ───────────────────────────────────────────────────
  async refreshBetHistory(page: number): Promise<void> {
    if (!this.session) return;
    if (this.snapshot.betHistoryLoading) return;
    this.set({ betHistoryLoading: true });
    try {
      const res = await api.fetchBetHistory(
        this.session.mainUrlBase,
        this.session.token,
        this.session.userId,
        page,
      );
      const rows = res.data.bet.data;
      this.set({
        betHistory: rows,
        betHistoryPagination: this.normalizePagination(res.data.bet.pagination, rows.length, HISTORY_LIMIT),
      });
    } catch {
      // §4/§10 — a failed history request is never fatal; the current page
      // stays rendered.
    } finally {
      this.set({ betHistoryLoading: false });
    }
  }
}

