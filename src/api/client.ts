/**
 * Backend contract client — mirrors `GameLoader.RunTokenAndAuth`/
 * `RunAuthenticate` and every `GameManager`/`CoinTossBetHistoryManager` HTTP
 * call (spec §4). One function per real endpoint; nothing here decides
 * *when* to call them, that's `src/state/gameEngine.ts`.
 */
import { decrypt, encrypt } from "./crypto";
import { getJson, postJson } from "./http";
import { isMockBackend } from "./urlParams";
import type {
  AggregatorData,
  AuthData,
  BetData,
  BetHistoryResponse,
  ComponentData,
  LoginData,
  PlayerSelection,
  ServerResponse,
} from "./types";

export const GAME_TYPE = "cointoss";

/**
 * Path prefix the deployed preview mock is mounted under
 * (`api/mock.js`). Must match `MOCK_BASE` there. Namespaced under
 * `/api/mock/**` rather than the real `/api/v2/**` so the mock can never shadow
 * the production contract paths.
 */
const MOCK_BASE = "/api/mock";

/** Path of the token-exchange endpoint, appended to whichever host wins below.
 * `VITE_AGGREGATOR_TOKEN_HOST` carries the host *and* API base only — never
 * this suffix — so one variable covers every environment. */
const TOKEN_PATH = "/partner/agg/token";

/** Aggregator API base used when `VITE_AGGREGATOR_TOKEN_HOST` is unset. */
const DEFAULT_TOKEN_HOST = "https://game.shacksevo.co/user/api/v2";

/** `Environment` enum (`GameLoader.cs:10,22,146-148`) — a real production
 * build picks one of two hardcoded hosts; this port makes it configurable via
 * `VITE_AGGREGATOR_TOKEN_HOST`.
 *
 * Precedence, highest first:
 *   1. `?mock=1` — the bundled preview mock, so a preview never depends on a
 *      configured host or on aggregator credentials.
 *   2. `VITE_AGGREGATOR_TOKEN_HOST`, when set.
 *   3. `DEFAULT_TOKEN_HOST`.
 *
 * ⚠ There is no `import.meta.env.DEV` branch, so `npm run dev` does NOT target
 * the local mock: with the variable unset it posts to `DEFAULT_TOKEN_HOST`,
 * and `?mock=1` resolves to `/api/mock/**`, which the dev proxy forwards to
 * `server/index.js` unstripped (only the serverless wrapper strips that
 * prefix) — a 404. To play against the mock in dev, set
 * `VITE_AGGREGATOR_TOKEN_HOST` to this origin's `/api/v2`, which
 * `vite.config.ts` proxies to `server/index.js`. `devBootstrap.ts` still
 * describes the older same-origin-by-default behaviour. */
function resolveTokenUrl(): string {
  if (isMockBackend()) {
    return `${window.location.origin}${MOCK_BASE}/api/v2${TOKEN_PATH}`;
  }
  const host = import.meta.env.VITE_AGGREGATOR_TOKEN_HOST;
  if (host) return `${host.replace(/\/+$/, "")}${TOKEN_PATH}`;

  return `${DEFAULT_TOKEN_HOST}${TOKEN_PATH}`;
}

export interface BootResult {
  authorizationToken: string;
  mainUrlBase: string;
  baseUrl: string;
  aggregatorDataCipher: string; // resent verbatim as `data` on every authenticate call
  aggregator: AggregatorData;
  customization: ComponentData[];
}

/** Step 1 of `RunTokenAndAuth` (`GameLoader.cs:144-210`) — POSTs the whole
 * page URL (minus `replayMode`/`roundId`) as encrypted ciphertext, unlike
 * Penaldo/Keno's GET + `clientId` header (spec §4). */
export async function requestToken(pageHref: string): Promise<BootResult> {
  const encryptedHref = await encrypt(pageHref);
  const res = await postJson<ServerResponse>(resolveTokenUrl(), {
    url: encryptedHref,
  });

  if (!res.data) {
    throw new Error(
      "Unable to retrieve token. Reload the game or report issue.",
    );
  }
  if (!res.meta?.data) {
    throw new Error(
      "Unable to retrieve data. Reload the game or report issue.",
    );
  }
  if (!res.meta?.patnerUrl) {
    throw new Error(
      "Unable to retrieve baseUrl. Reload the game or report issue.",
    );
  }

  const aggregator = JSON.parse(await decrypt(res.meta.data)) as AggregatorData;
  const mainUrlBase = await decrypt(res.meta.patnerUrl);
  const customization = res.meta.customization
    ? (JSON.parse(await decrypt(res.meta.customization)) as ComponentData[])
    : [];

  return {
    authorizationToken: res.data,
    mainUrlBase,
    baseUrl: `${mainUrlBase}/api/v2/`,
    aggregatorDataCipher: res.meta.data,
    aggregator,
    customization,
  };
}

/** `RunAuthenticate` / `GameManager.ReAuthenticate` (`GameLoader.cs:369-443`,
 * `GameManager.cs:427-568`, spec §1 steps 4 & 12) — same endpoint reused for
 * boot (`initialRound=true`) and every post-round resync
 * (`initialRound=false`). `data` is the raw still-encrypted `AggregatorData`
 * blob from the token step, resent verbatim (not re-derived). */
export async function authenticate(
  baseUrl: string,
  token: string,
  aggregatorDataCipher: string,
  initialRound: boolean,
): Promise<LoginData> {
  const res = await postJson<ServerResponse>(
    `${baseUrl}bet-placed/agg-authenticate`,
    {
      data: aggregatorDataCipher,
      gameType: GAME_TYPE,
      initialRound: String(initialRound),
    },
    { Authorization: `Bearer ${token}` },
  );
  const decrypted = await decrypt(res.data);
  const authData = JSON.parse(decrypted) as AuthData;
  return authData.data;
}

/** `GameManager.RelayBetToBE` (`GameManager.cs:174-256`, spec §1 step 8, §4)
 * — escrows the bet server-side; the outcome is NOT in this response (that's
 * the separate `getResults` call below, fired automatically right after). */
export async function placeBet(
  baseUrl: string,
  token: string,
  sessionId: string,
  amountPlaced: number,
  selection: PlayerSelection,
): Promise<void> {
  const body = {
    sessionId,
    difficulties: "none", // hardcoded vestigial literal, spec §1 step 8 — sent for parity, ignored server-side
    amountPlaced: Math.round(amountPlaced * 100) / 100,
    selection,
  };
  const encrypted = await encrypt(JSON.stringify(body));
  await postJson<ServerResponse>(
    `${baseUrl}bet-placed/agg-place-bet`,
    { data: encrypted },
    { Authorization: `Bearer ${token}` },
  );
}

/** `GameManager.GetResults` (`GameManager.cs:258-359`, spec §1 step 9, §2) —
 * the one call whose response carries the server-decided `head`/`tail`/
 * `side` outcome. Fires automatically the instant `placeBet` succeeds, with
 * zero intervening player action. */
export async function getResults(
  baseUrl: string,
  token: string,
  sessionId: string,
  selection: PlayerSelection,
): Promise<BetData> {
  const encrypted = await encrypt(JSON.stringify({ sessionId, selection }));
  const res = await postJson<ServerResponse>(
    `${baseUrl}bet-placed/agg-actions`,
    { data: encrypted },
    { Authorization: `Bearer ${token}` },
  );
  const decrypted = await decrypt(res.data);
  return JSON.parse(decrypted) as BetData;
}

/** `GameManager.SendResults` (`GameManager.cs:361-424`, spec §1 step 15) —
 * settles an abandoned open round found on load. NOT a live cashout button
 * (see README) — only ever called once, automatically, from boot. */
export async function manualActions(
  baseUrl: string,
  token: string,
  sessionId: string,
): Promise<void> {
  const encrypted = await encrypt(JSON.stringify({ sessionId }));
  await postJson<ServerResponse>(
    `${baseUrl}bet-placed/agg-manual-actions`,
    { data: encrypted },
    { Authorization: `Bearer ${token}` },
  );
}

/** `CoinTossBetHistoryManager.RetrieveBetHistory` (spec §3) — note this
 * keys off `sessionId` (not `userId`) and carries `aggregator=true`, both
 * unique to this game's contract vs. Penaldo/Keno. */
export async function fetchBetHistory(
  mainUrlBase: string,
  token: string,
  sessionId: string,
  page = 1,
  limit = 20, // spec §5.6/§10 — the contract's history page size
): Promise<BetHistoryResponse> {
  return getJson<BetHistoryResponse>(
    `${mainUrlBase}/api/v1/bet-placed/partner/user/${sessionId}/${GAME_TYPE}?aggregator=true&limit=${limit}&page=${page}`,
    { Authorization: `Bearer ${token}` },
  );
}
