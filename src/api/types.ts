// Wire-format DTOs mirroring the Unity C# `Data Structures/*.cs` files
// field-for-field (spec §4). Field names/casing are kept exactly as the
// backend sends them (e.g. `patnerUrl` is the real, misspelled key, shared
// with the sibling Penaldo/Keno contracts) so this file can double as the
// authoritative contract reference.

/** The three possible coin outcomes (`enum Outcome`, `GameManager.cs:12`,
 * spec §2). The player can only ever choose `head`/`tail` — `side` is a
 * server-decidable outcome only (see `PlayerSelection` below). */
export type Outcome = "head" | "tail" | "side";

/** The only two choices actually reachable from the UI (spec §2 — no third
 * "Side" button exists; confirmed via scene grep in the spec). */
export type PlayerSelection = "head" | "tail";

/** `AggregatorCurrency` (`Data Structures/LoginData.cs:11,14-18`) — min/max
 * bet ARE genuinely enforced in this game (spec §2/§3), unlike the
 * equivalent Penaldo/Keno contract fields. */
export interface AggregatorCurrency {
  minimum: number;
  maximum: number;
}

/** `Odds` (`Data Structures/LoginData.cs:20-26`) — a single flat multiplier,
 * `[JsonProperty("1")] public float One`. Kept on session state per spec §2
 * but never displayed directly by the original UI beyond being stored. */
export type OddsWire = Record<"1", number>;

/** `OpenRound` (`Data Structures/OpenRound.cs`) — an abandoned round left
 * over server-side from a previous session (spec §1 step 6/15). Only a
 * handful of fields are actually read by the client. */
export interface OpenRound {
  _id?: string;
  userId?: string;
  gameType?: string;
  username?: string;
  selection?: string;
  selectedEventType?: string[];
  amountPlaced: number;
  cashoutAmount: number;
  potentialWinning?: number;
}

/** `LoginData` (`Data Structures/LoginData.cs`) — the payload of both the
 * boot authenticate call and every subsequent re-authenticate call. */
export interface LoginData {
  username: string;
  sessionId: string;
  balance: string;
  currency: string;
  odds: OddsWire;
  openRound: OpenRound | null;
  aggregatorCurrency: AggregatorCurrency;
}

export interface AuthData {
  data: LoginData;
  status: boolean;
  message: string;
}

/** `AggregatorData` (`Data Structures/AggregatorData.cs`) — decrypted from
 * `ServerResponse.meta.data`, a field new to this game's contract vs.
 * Penaldo/Keno (spec §4). `name` drives the Pariplay/Jelly/Uplatform
 * branches in the original client; this rebuild implements the generic/
 * no-name path only (see README). */
export interface AggregatorData {
  name: string;
  id: string;
  server: string;
  type: string;
  aggregator: string;
  mode: string;
  data: Record<string, unknown>;
}

/** `ServerResponse` (`ServerResponse.cs`) — the outer envelope for the token
 * and authenticate calls. `meta` fields are individually AES ciphertext.
 * `meta.data` (decrypts to `AggregatorData`) is the field new to this game's
 * "aggregator" contract vs. Penaldo/Keno's "partner" contract (spec §4). */
export interface ServerResponseMeta {
  patnerUrl?: string;
  playerId?: string;
  customization?: string;
  data?: string;
  aggregatorResponse?: string;
}

export interface ServerResponse<TData = string> {
  status: boolean;
  data: TData;
  message: string;
  meta?: ServerResponseMeta;
}

/** `OutcomeResult` (`Data Structures/BetData.cs`). `won` is the literal
 * string "true"/"false" on the wire (kept as a string here for byte-for-byte
 * wire fidelity); use `isWon()` below to interpret it. */
export interface OutcomeResult {
  level: number;
  betTime: string;
  processedTime: string;
  selection: string;
  won: string;
  generatedOutcome: string;
  odds: number;
  amount: number;
  cashoutAmount: number;
}

export function isWon(outcome: Pick<OutcomeResult, "won">): boolean {
  return outcome.won.toLowerCase() === "true";
}

/** `BetSubData`/`BetData` (`Data Structures/BetData.cs`) — note `event` is a
 * one-element array (`[JsonProperty("event")] public OutcomeResult[] Event`),
 * always read as `Event[0]` — no ladder of multiple events like Penaldo. */
export interface BetSubData {
  event: OutcomeResult[];
}
export interface BetData {
  data: BetSubData;
}

/** `GUICustomData`/`ComponentData` (partner theming payload, spec §5). */
export interface ComponentData {
  _id?: string;
  name: string;
  value: string;
  type: CustomizableType;
  partnerId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type CustomizableType =
  | "imageColor"
  | "camColor"
  | "textColor"
  | "text"
  | "toggle"
  | "alternatingColor";

/** `BetRecordData` (spec §3, `CoinTossBetHistoryManager.cs:126-134`). Note:
 * unlike Keno/Penaldo there is no `potentialWinning`/`balanceAfter` field
 * read anywhere in the history render path. */
export interface BetRecordData {
  gameType: string;
  username: string;
  result: "won" | "lost" | "pending" | "draw" | string;
  amountPlaced: number;
  cashoutAmount: number;
  selectedEventType: OutcomeResult[] | null;
}

export interface Pagination {
  to: number;
  from: number;
  totalPages: number;
  total: number;
  limit: number;
  currentPage: number;
}

export interface BetHistoryResponse {
  data: {
    bet: {
      data: BetRecordData[];
      pagination: Pagination;
    };
  };
  status: string;
  message: string;
}

export interface LanguageList {
  data: Record<string, string>;
  message: string;
}

export interface Translations {
  data: string[];
  message: string;
}

// ---------------------------------------------------------------------------
// Confirmed-dead/vestigial Data Structure classes (spec §0, §4, Appendix#7) —
// a much larger set than either sibling game, none with any call site in the
// 39 read Unity scripts. Kept as unused TS types ONLY, for contract
// completeness/future-proofing — do NOT wire these up. See README
// "What was intentionally skipped" for the per-class rationale.
// ---------------------------------------------------------------------------

/** Unused — `Data Structures/AggregatorResponse.cs`. */
export interface AggregatorResponse {
  balance: string;
}

/** Unused — `Data Structures/CashoutData.cs`. */
export interface CashoutData {
  cashoutAmount: number;
  sessionId: string;
}

/** Unused — `Data Structures/EarData.cs`. Reads like an Ezugi-style
 * aggregator-launch-URL contract; no call site anywhere. */
export interface EarData {
  accessToken: string;
  sid: string;
  playerId: string;
  displayName: string;
  gameId: string;
  mobile: boolean;
  language: string;
  isFreeGame: boolean;
  returnUrl: string;
  currency: string;
  providerName: string;
  mode: string;
  gameType: string;
}

/** Unused — `Data Structures/EveBalance.cs`. Name suggests an "Evolution"/
 * "Eve" wallet-callback integration. */
export interface EveBalance {
  roundId: string;
  outcome: string;
  balance?: { totalBalance: number; currency: string; status: string };
}

/** Unused — `Data Structures/PartnerData.cs`. Reads like a back-office/CMS
 * login contract, not a player-facing one. */
export interface PartnerData {
  IAM: string;
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
  role: string;
}

/** Unused — `Data Structures/SwinttData.cs`. A Swintt-aggregator-shaped
 * session contract. */
export interface SwinttData {
  sessionId: string;
  userId: string;
  playerId: string;
  currency: string;
  username: string;
  operatorId: string;
  gameId: string;
  balance: number;
}

/** Unused — the standalone `Data Structures/SelectedEvent.cs`. */
export interface SelectedEvent {
  type: string;
  value: string;
}
