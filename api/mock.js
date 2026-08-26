// Vercel serverless entry point for the mock aggregator — PREVIEW/TESTING ONLY.
//
// Why this exists: the real token exchange
// (`POST https://portal.shacksevo.co/api/v2/partner/agg/token`) currently
// returns `500 {"status":false,"message":"Unexpected number in JSON at
// position 1"}` for every launch. That failure is server-side and downstream of
// decryption — the backend decrypts our URL *and* the partner's `clientId`
// successfully, then throws parsing the clientId's own pipe-delimited
// `sessionId|userId|timestamp|hash` payload as JSON. Nothing in this client can
// work around it, and a failed token is fatal (`gameEngine.ts` -> `phase:
// "fatal-error"`), so the deployed build could not be previewed at all.
//
// This mounts the SAME Express mock that `npm run dev` uses (`server/index.js`)
// as a serverless function, letting the deployed build boot and play a full
// round against a fake wallet with no `clientId` and no real backend.
//
// It is opt-in from the client side and cannot be reached by accident:
//
//   - The client only targets it when the launch URL carries `?mock=1`
//     (`isMockBackend()` in `src/api/urlParams.ts`). A normal launch still goes
//     to `portal.shacksevo.co`, untouched.
//   - Its routes live under `/api/mock/**`, never at the real `/api/v2/**`
//     contract paths, so it cannot shadow the production contract even if the
//     game were pointed at this origin.
//
// This is a single plain file (`api/mock.js`), not the `api/mock/[...path].js`
// bracket catch-all convention it started as. That convention is Next.js-
// specific routing sugar; on a plain (non-Next.js) Vercel project it isn't
// recognized as a function route at all and every request under it 404s at
// Vercel's edge before this code ever runs. A single named file plus the
// `vercel.json` rewrite (which forwards the whole `/api/mock/**` prefix here)
// is the documented, reliable approach — this handler recovers the original
// sub-path itself from `req.url`.
//
// Known preview-only limitations (in-memory state, no shared store):
//   - The wallet resets to the seed balance whenever a cold instance serves a
//     request. Balances are illustrative, not a running ledger.
//   - `agg-place-bet` escrows the pending bet in memory and `agg-actions`
//     resolves it on the next request. Those two calls are milliseconds apart
//     and normally hit the same warm instance, but a cold start landing between
//     them surfaces the mock's own "You've no ongoing round. Kindly reload!"
//     error. Reload and the next round is fine.
import app from "../server/index.js";

/** Must match `MOCK_BASE` in `src/api/client.ts`. */
const MOCK_BASE = "/api/mock";

export default function handler(req, res) {
  // Read lazily by `isValidToken` (server/state.js): there is no shared memory
  // between invocations, so tokens are validated by shape rather than against a
  // per-instance `Set` that the next request probably won't share.
  process.env.MOCK_STATELESS_TOKENS = "1";

  // Vercel's Node runtime consumes the request stream and pre-populates
  // `req.body`. Express's `json()`/`urlencoded()` middleware would then try to
  // read an already-drained stream and hand the routes an empty body, so the
  // parsed value is normalised here and flagged with body-parser's own
  // `_body` sentinel, which makes both middlewares skip re-parsing.
  if (req.body !== undefined && req.body !== null) {
    if (Buffer.isBuffer(req.body) || typeof req.body === "string") {
      const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body;
      try {
        req.body = JSON.parse(raw);
      } catch {
        req.body = Object.fromEntries(new URLSearchParams(raw));
      }
    }
    req._body = true;
  }

  // Tell the app which prefix it is mounted under, so the `patnerUrl` it hands
  // back keeps every follow-up call inside `/api/mock/**`.
  req.headers["x-mock-base"] = MOCK_BASE;

  // Strip the prefix so the Express routes ("/api/v2/...", "/lang/...") match.
  const [path, query] = req.url.split("?");
  const routed = path.startsWith(MOCK_BASE) ? path.slice(MOCK_BASE.length) : path;
  req.url = (routed || "/") + (query ? `?${query}` : "");

  return app(req, res);
}
