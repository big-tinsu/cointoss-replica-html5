/**
 * Partner backend contract client — `docs/PARTNER_API_INTEGRATION.md`.
 *
 * One function per real endpoint; nothing here decides *when* to call them,
 * that is `src/state/partnerGameEngine.ts`. The aggregator equivalent is
 * `client.ts`; the two are never both live, `VITE_INTEGRATION` picks one.
 *
 * Where this contract differs from the aggregator's, sharply:
 *   - the token call is a GET authorised by a bare `clientId` HEADER (§2.1),
 *     against a base decrypted out of the launch URL rather than configured;
 *   - authenticate returns a NESTED envelope and carries no session id, no
 *     open round and no stake limits (§2.2);
 *   - a round is ONE call — `th-place-bet` both resolves it and returns the
 *     authoritative balance, so there is no settle step and no balance
 *     endpoint to poll (§3, §11);
 *   - bet history keys off the decrypted `playerId`, not a session id (§4).
 *
 * REQUEST ENCODING: partner spec §1.6 mandates
 * `application/x-www-form-urlencoded`. This client sends JSON via the shared
 * `postJson`, matching the standing decision recorded in `http.ts` for the
 * aggregator side. If partner calls come back as though their fields were
 * missing, that helper is the single place to switch.
 */
import { decrypt, encrypt } from "./crypto";
import { getJson, postJson } from "./http";
import type {
  BetHistoryResponse,
  ComponentData,
  LeaderboardResponse,
  PartnerAuthEnvelope,
  PartnerBetData,
  PartnerLoginData,
  PartnerPlaceBetPayload,
  PartnerServerResponse,
  PlayerSelection,
} from "./types";

export const GAME_TYPE = "cointoss";

/** History page size (partner spec §4). */
const HISTORY_LIMIT = 20;

/** A business rejection: `status: false` (§1.4, §10). The round must NOT
 * animate and the player is expected to act — distinct from a transport
 * failure, which `ApiError` already separates.
 *
 * The live backend answers stake-limit rejections with HTTP 403 rather than
 * the 2xx the spec describes, so those arrive as `ApiError` instead. Both
 * carry the backend's own `message` and both land on the same "toast it, do
 * not spin" branch in the engine, so the distinction costs nothing. */
export class PartnerRejection extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PartnerRejection";
  }
}

/**
 * Only an EXPLICIT `status: false` is a rejection.
 *
 * Testing against the live backend is what forced this: its nested
 * authenticate envelope carries no `status` field at all, so treating a
 * missing one as falsy rejected every successful boot with "Error processing
 * your request" while the network tab showed nothing but 200s.
 */
function requireOk(res: { status?: boolean; message?: string }): void {
  if (res.status === false) {
    throw new PartnerRejection(res.message || "Error processing your request");
  }
}

export interface PartnerBootResult {
  token: string;
  /** Partner root, no trailing slash — bet history (`/api/v1/…`) hangs off it. */
  mainUrlBase: string;
  /** `${mainUrlBase}/api/v2/` — authenticate, place bet, leaderboard. */
  baseUrl: string;
  /** Decrypted `meta.playerId`; the bet-history path segment. */
  userId: string;
  customization: ComponentData[];
}

/**
 * §1.2 — the launch `clientId` is `"<anything>-<AES_HEX>"`, and the partner API
 * origin is the decryption of segment `[1]`.
 *
 * Faithful to the source's `split('-')[1]`: a clientId with more than one
 * hyphen still resolves off the second segment only, and anything that fails to
 * decrypt is a fatal launch error rather than a fallback.
 */
export async function resolveServerBase(clientId: string): Promise<string> {
  const segment = clientId.split("-")[1];
  if (!segment) {
    throw new Error("Unexpected server response caused an exception.");
  }
  const decoded = await decrypt(segment);
  if (!decoded) throw new Error("Unexpected server response caused an exception.");
  return decoded.replace(/\/+$/, "");
}

/**
 * §2.1 — `GET {serverBase}/api/v2/partner/fe/token`, credentialled by a bare
 * `clientId` header (NOT `Authorization`). `data` is the token, used verbatim
 * and never decrypted; every `meta` field is ciphertext.
 */
export async function requestToken(
  serverBase: string,
  clientId: string,
): Promise<PartnerBootResult> {
  const res = await getJson<PartnerServerResponse>(`${serverBase}/api/v2/partner/fe/token`, {
    clientId,
  });
  requireOk(res);

  if (!res.data) throw new Error("Unable to retrieve token. Reload the game or report issue.");
  if (!res.meta?.patnerUrl) {
    throw new Error("Unable to retrieve baseUrl. Reload the game or report issue.");
  }

  const mainUrlBase = (await decrypt(res.meta.patnerUrl)).replace(/\/+$/, "");
  // `playerId` keys bet history. Absent, history simply returns nothing —
  // non-fatal, unlike a missing base URL.
  const userId = res.meta.playerId ? await decrypt(res.meta.playerId) : "";
  const customization = res.meta.customization
    ? (JSON.parse(await decrypt(res.meta.customization)) as ComponentData[])
    : [];

  return { token: res.data, mainUrlBase, baseUrl: `${mainUrlBase}/api/v2/`, userId, customization };
}

/**
 * §2.2 — `th-authenticate-player`. The only field is `gameType`; the response's
 * `data` decrypts to a *nested* `{status, message, data}` envelope, so the
 * inner status is checked too.
 */
export async function authenticate(
  baseUrl: string,
  token: string,
): Promise<PartnerLoginData> {
  const res = await postJson<PartnerServerResponse>(
    `${baseUrl}bet-placed/th-authenticate-player`,
    { gameType: GAME_TYPE },
    { Authorization: `Bearer ${token}` },
  );
  requireOk(res);

  const envelope = JSON.parse(await decrypt(res.data)) as PartnerAuthEnvelope;
  // §2.2 documents `{status, message, data}`, but the live backend sends only
  // `{data}`. Reject on an explicit false; otherwise the presence of `data` is
  // what says the call succeeded.
  requireOk(envelope);
  if (!envelope.data) {
    throw new PartnerRejection(envelope.message || "Error processing your request");
  }
  return envelope.data;
}

/**
 * §3 — `th-place-bet`. The whole round in one call: it debits, runs the RNG and
 * returns the new authoritative balance together with the outcome to animate.
 *
 * `amountPlaced` is rounded to 2dp BEFORE encrypting — the backend rejects
 * more with "You cannot place bet above 2 decimal place".
 *
 * A `status: false` response is thrown as `PartnerRejection` so the caller
 * cannot fall through and spin the coin on a bet that was never accepted.
 */
export async function placeBet(
  baseUrl: string,
  token: string,
  payload: {
    currency: string;
    username: string;
    selection: PlayerSelection;
    amountPlaced: number;
  },
): Promise<PartnerBetData> {
  const body: PartnerPlaceBetPayload = {
    currency: payload.currency,
    username: payload.username,
    selection: payload.selection,
    gameType: GAME_TYPE,
    amountPlaced: Math.round(payload.amountPlaced * 100) / 100,
  };
  const res = await postJson<PartnerServerResponse>(
    `${baseUrl}bet-placed/th-place-bet`,
    { data: await encrypt(JSON.stringify(body)) },
    { Authorization: `Bearer ${token}` },
  );
  requireOk(res);

  return JSON.parse(await decrypt(res.data)) as PartnerBetData;
}

/**
 * §4 — bet history. Plain JSON, no encryption, `/api/v1/` off `mainUrlBase`
 * (not `baseUrl`), keyed by the decrypted `playerId`. No `aggregator=true`
 * flag here, unlike the aggregator contract's otherwise identical path.
 */
export async function fetchBetHistory(
  mainUrlBase: string,
  token: string,
  userId: string,
  page = 1,
  limit = HISTORY_LIMIT,
): Promise<BetHistoryResponse> {
  return getJson<BetHistoryResponse>(
    `${mainUrlBase}/api/v1/bet-placed/partner/user/${userId}/${GAME_TYPE}?limit=${limit}&page=${page}`,
    { Authorization: `Bearer ${token}` },
  );
}

/**
 * §5 — the standalone leaderboard board. Plain JSON, sorted client-side by
 * `rank` because server order is not guaranteed.
 *
 * NOT WIRED TO ANY UI. `GameSnapshot` is the contract both integrations share
 * (see `state/sessionContract.ts`), so partner cannot add board state to it
 * without breaking the aggregator swap. The part of §5 that DOES reach the
 * player is the `leaderboard` object embedded in a place-bet response, which
 * `PartnerGameEngine` surfaces as a one-time toast through the existing
 * `notification` field. This function is here so the contract client is
 * complete when a board UI is designed.
 */
export async function fetchLeaderboard(
  baseUrl: string,
  token: string,
): Promise<LeaderboardResponse["data"]["edges"]> {
  const res = await getJson<LeaderboardResponse>(
    `${baseUrl}leaderboard?gameType=${GAME_TYPE}`,
    { Authorization: `Bearer ${token}` },
  );
  if (!res.status || !res.data?.edges) return [];
  return [...res.data.edges].sort((a, b) => a.rank - b.rank);
}
