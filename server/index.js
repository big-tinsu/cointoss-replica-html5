// Mock "aggregator" backend — implements the Coin Toss-specific contract
// shape from spec §4 (genuinely different from Penaldo/Keno's "partner"
// contract: encrypted full-page-URL token exchange, `agg-*` endpoint prefix,
// `meta.data`/AggregatorData, real min/max bet enforcement, a two-call
// place-bet -> actions round resolution). Runs against in-memory state
// (state.js), so the game is fully playable with zero real backend/creds.
//
// Only the generic/no-aggregator-name path is implemented (task brief +
// README): Pariplay/Jelly/Uplatform are real third-party SDK integrations
// out of scope for a standalone rebuild.
//
// Env vars:
//   MOCK_PORT           default 8787
//   MOCK_FORCE_OUTCOME  "head" | "tail" | "side" | unset (real weighted RNG)
//   MOCK_OPEN_ROUND     "1" to seed an abandoned open round on first boot
//                       (exercises the auto-settle-on-load path, spec §1 step 6/15)
import { fileURLToPath } from "node:url";
import express from "express";
import cors from "cors";
import { encrypt, decrypt } from "./crypto.js";
import {
  getPlayer,
  aggregatorDataPayload,
  loginDataFor,
  maybeSeedOpenRound,
  placeBet,
  resolveRound,
  manualSettle,
  paginateHistory,
  mintToken,
  isValidToken,
  isCurrentSession,
  partnerLoginData,
  partnerCustomization,
  partnerPlaceBet,
  partnerLeaderboardEdge,
  GAME_TYPE,
} from "./state.js";
import { LANGUAGES, translateMany } from "./languages.js";

const PORT = Number(process.env.MOCK_PORT) || 8787;

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: false }));
app.use(express.json());

/**
 * Spec §1/§9.1 — every round call must carry the `sessionId` from the LATEST
 * authenticate, because that id rotates on each one. Rejecting a stale id here
 * is what turns "the single most common integration bug" into a dev-time
 * failure instead of a production one. `Invalid Operation. Kindly reload the
 * game.` is the real backend's own wording for this class (spec §8).
 */
function requireCurrentSession(req, res, sessionId) {
  if (isCurrentSession(sessionId)) return true;
  res.status(400).json(errorEnvelope("Invalid Operation. Kindly reload the game."));
  return false;
}

/**
 * The origin this mock tells the client to send every *subsequent* call to —
 * it comes back as the token response's `meta.patnerUrl`, and `client.ts`
 * derives `baseUrl` (`{origin}/api/v2/`) and the bet-history URL from it.
 *
 * `x-mock-base` lets a deployment mount this app under a path prefix instead
 * of at the domain root. The Vercel preview wrapper sets it to `/api/mock`, so
 * the mock's routes live at `/api/mock/api/v2/...` and can never shadow the
 * real `/api/v2/...` contract paths. Unset (local dev) it is "", leaving the
 * original root-mounted behaviour byte-identical.
 */
function requestOrigin(req) {
  const proto = req.get("x-forwarded-proto") ?? req.protocol;
  const host = req.get("host");
  const base = req.get("x-mock-base") ?? "";
  return `${proto}://${host}${base}`;
}

function errorEnvelope(message) {
  return { status: false, data: "", message };
}

function requireAuth(req, res) {
  const auth = req.headers.authorization ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!token || !isValidToken(token)) {
    res.status(401).json(errorEnvelope("Session Exipired"));
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Token exchange — `GameLoader.RunTokenAndAuth` (spec §1 step 3, §4). Unlike
// Penaldo/Keno's `GET .../fe/token` + `clientId` header, this POSTs the whole
// encrypted page URL as the `url` form field. The mock doesn't need to
// actually decrypt/inspect it — a real partner backend would use it to
// resolve which operator/session this launch belongs to.
// ---------------------------------------------------------------------------
app.post("/api/v2/partner/agg/token", async (req, res) => {
  if (!req.body?.url) {
    res.status(400).json(errorEnvelope("Unexpected server response caused an exception."));
    return;
  }
  const token = mintToken();
  res.json({
    status: true,
    data: token,
    message: "Token issued.",
    meta: {
      patnerUrl: await encrypt(requestOrigin(req)),
      customization: await encrypt(JSON.stringify([])),
      data: await encrypt(JSON.stringify(aggregatorDataPayload())),
      aggregatorResponse: "",
    },
  });
});

// ---------------------------------------------------------------------------
// Authenticate (boot, `initialRound=true`) / re-authenticate (every round
// after, `initialRound=false`, same endpoint reused) — spec §1 steps 4 & 12.
// ---------------------------------------------------------------------------
app.post("/api/v2/bet-placed/agg-authenticate", async (req, res) => {
  if (!requireAuth(req, res)) return;
  maybeSeedOpenRound();
  const encrypted = await encrypt(
    JSON.stringify({ data: loginDataFor(), status: true, message: "Player authenticated successfully" }),
  );
  res.json({ status: true, data: encrypted, message: "Player authenticated successfully" });
});

// ---------------------------------------------------------------------------
// Place bet — spec §1 step 8. Validates + escrows the pending selection; the
// RNG has NOT run yet (that's the separate agg-actions call below).
// ---------------------------------------------------------------------------
app.post("/api/v2/bet-placed/agg-place-bet", async (req, res) => {
  if (!requireAuth(req, res)) return;

  let payload;
  try {
    payload = JSON.parse(await decrypt(req.body.data));
  } catch {
    res.status(400).json(errorEnvelope("Unexpected server response caused an exception."));
    return;
  }

  if (!requireCurrentSession(req, res, payload.sessionId)) return;

  // `payload.difficulties` ("none") is the hardcoded, unused-elsewhere literal
  // flagged in spec §1 step 8 — accepted and ignored, matching the real
  // client's own "no corresponding UI/field" finding.
  try {
    placeBet({ selection: payload.selection, amountPlaced: payload.amountPlaced });
    res.json({ status: true, data: "", message: "Bet placed successfully" });
  } catch (err) {
    res.status(400).json(errorEnvelope(err.message || "Error debitting your wallet"));
  }
});

// ---------------------------------------------------------------------------
// Resolve — spec §1 step 9, §2. The one place the server-authoritative RNG
// runs (head/tail/side). Fired automatically right after place-bet succeeds,
// with zero intervening player action, per spec.
// ---------------------------------------------------------------------------
app.post("/api/v2/bet-placed/agg-actions", async (req, res) => {
  if (!requireAuth(req, res)) return;

  let payload;
  try {
    payload = JSON.parse(await decrypt(req.body.data));
  } catch {
    res.status(400).json(errorEnvelope("Unexpected server response caused an exception."));
    return;
  }
  if (!requireCurrentSession(req, res, payload.sessionId)) return;
  // selection was already captured at place-bet time; resent here for parity only

  try {
    const event = resolveRound(process.env.MOCK_FORCE_OUTCOME);
    // `BetData.data.event[0]` (spec §4) — double-nested, lowercase "event" key.
    const encrypted = await encrypt(JSON.stringify({ data: { event: [event] } }));
    res.json({ status: true, data: encrypted, message: "Round resolved." });
  } catch (err) {
    res.status(400).json(errorEnvelope(err.message || "You've no ongoing round. Kindly reload!"));
  }
});

// ---------------------------------------------------------------------------
// Manual actions — spec §1 step 15. Settles an abandoned open round found on
// load; NOT a live cashout button (see README). No-ops successfully when
// there's nothing to settle.
// ---------------------------------------------------------------------------
app.post("/api/v2/bet-placed/agg-manual-actions", async (req, res) => {
  if (!requireAuth(req, res)) return;

  let payload;
  try {
    payload = JSON.parse(await decrypt(req.body.data));
  } catch {
    res.status(400).json(errorEnvelope("Unexpected server response caused an exception."));
    return;
  }
  if (!requireCurrentSession(req, res, payload.sessionId)) return;

  manualSettle();
  res.json({ status: true, data: "", message: "Settled." });
});

// ===========================================================================
// PARTNER contract (docs/PARTNER_API_INTEGRATION.md).
//
// The same game served to the other class of betting client. Mounted
// alongside the aggregator routes rather than in a second server so
// `npm run dev` covers both, and so both share one wallet and one history —
// switch `VITE_INTEGRATION` and the balance carries over.
//
// The two contracts never collide: partner paths are `.../fe/token` and
// `bet-placed/th-*`, aggregator paths are `.../agg/token` and
// `bet-placed/agg-*`.
// ===========================================================================

// Token — partner §2.1. A GET credentialled by a bare `clientId` HEADER, not
// `Authorization`. The real backend resolves the operator from it; the mock
// only needs it to be present. `meta.playerId` is new versus the aggregator
// token response (it keys bet history), and there is no `meta.data` because
// partner has no AggregatorData blob.
app.get("/api/v2/partner/fe/token", async (req, res) => {
  const clientId = req.get("clientId") ?? req.get("clientid") ?? "";
  if (!clientId) {
    res.status(400).json(errorEnvelope("Invalid Partner"));
    return;
  }
  res.json({
    status: true,
    data: mintToken(),
    message: "Token issued.",
    meta: {
      patnerUrl: await encrypt(requestOrigin(req)),
      playerId: await encrypt(getPlayer().userId),
      customization: await encrypt(JSON.stringify(partnerCustomization())),
      partnerResponse: "",
    },
  });
});

// Authenticate — partner §2.2. One form field (`gameType`), and the response
// `data` decrypts to a NESTED {status, message, data} envelope, unlike the
// aggregator's flat one.
app.post("/api/v2/bet-placed/th-authenticate-player", async (req, res) => {
  if (!requireAuth(req, res)) return;
  // ONLY `data` — no `status`, no `message`. The spec documents all three,
  // but the live backend sends just this, and a client that treats the missing
  // `status` as falsy rejects every successful boot. Reproduced deliberately so
  // that bug cannot come back unnoticed in dev.
  const encrypted = await encrypt(JSON.stringify({ data: partnerLoginData() }));
  res.json({ status: true, data: encrypted, message: "Player authenticated successfully" });
});

// Place bet — partner §3. THE WHOLE ROUND IN ONE CALL: it validates, runs the
// RNG, moves the wallet and returns the authoritative new balance with the
// outcome. There is no resolve step and no settle step to follow.
//
// A validation failure answers 200 with `status: false` — a business
// rejection, which §3 requires the client to surface without spinning the
// coin. That is deliberately NOT a non-2xx: the two are different branches in
// the client's state machine.
app.post("/api/v2/bet-placed/th-place-bet", async (req, res) => {
  if (!requireAuth(req, res)) return;

  let payload;
  try {
    payload = JSON.parse(await decrypt(req.body.data));
  } catch {
    res.status(400).json(errorEnvelope("Unexpected server response caused an exception."));
    return;
  }

  let result;
  try {
    result = partnerPlaceBet(
      { selection: payload.selection, amountPlaced: payload.amountPlaced },
      process.env.MOCK_FORCE_OUTCOME,
    );
  } catch (err) {
    // 403, matching the live partner backend — the spec describes a 2xx
    // business rejection, but stake-limit failures really answer 403. Both
    // land on the same "toast it, do not spin" branch in the client.
    res.status(403).json(errorEnvelope(err.message || "Error debitting your wallet"));
    return;
  }

  const encrypted = await encrypt(JSON.stringify(result));
  res.json({ status: true, data: encrypted, message: "Bet placed successfully" });
});

// Leaderboard — partner §5. Plain JSON, relay-style edges. Returned
// deliberately unsorted so the client's own rank sort is exercised.
app.get("/api/v2/leaderboard", (req, res) => {
  if (!requireAuth(req, res)) return;
  const edges = [
    partnerLeaderboardEdge(3, "devPlayerThree"),
    partnerLeaderboardEdge(1),
    partnerLeaderboardEdge(2, "devPlayerTwo"),
  ];
  res.json({
    status: true,
    message: "",
    data: {
      edges,
      pageInfo: { hasNextPage: false, hasPreviousPage: false, startCursor: "", endCursor: "" },
      totalCount: edges.length,
    },
  });
});

// ---------------------------------------------------------------------------
// Bet history — keys off `sessionId` (not `userId`) and carries the
// `aggregator=true` flag, both unique to this game's contract (spec §3/§4).
// ---------------------------------------------------------------------------
app.get("/api/v1/bet-placed/partner/user/:sessionId/:gameType", (req, res) => {
  if (!requireAuth(req, res)) return;
  const page = Number(req.query.page) || 1;
  const limit = Number(req.query.limit) || 10;
  const { data, pagination } = paginateHistory(page, limit);
  res.json({ data: { bet: { data, pagination } }, status: "success", message: "" });
});

// ---------------------------------------------------------------------------
// Language service stubs (spec §4/§6) — unauthenticated, un-encrypted.
// ---------------------------------------------------------------------------
app.get("/lang/api/v1/languages", (_req, res) => {
  res.json({ data: LANGUAGES, message: "" });
});

app.get("/lang/api/v1/languages/:code", (req, res) => {
  let keys = [];
  try {
    keys = JSON.parse(req.query.texts ?? "[]");
  } catch {
    keys = [];
  }
  res.json({ data: translateMany(req.params.code, keys), message: "" });
});

const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  app.listen(PORT, () => {
    console.log(`[mock-aggregator] listening on http://localhost:${PORT}`);
    console.log(`[mock-aggregator] gameType=${GAME_TYPE}, player=${getPlayer().username}`);
    console.log(`[mock-aggregator] forceOutcome=${process.env.MOCK_FORCE_OUTCOME || "(none, real RNG: head 48% / tail 48% / side 4%)"}`);
  });
}

export default app;
