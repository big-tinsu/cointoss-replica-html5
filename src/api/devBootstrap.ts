/**
 * Dev-only convenience so `npm run dev` is playable with zero configuration.
 *
 * Unlike Penaldo/Keno, Coin Toss's token contract carries no partner-supplied
 * query param at all (spec §4) — the whole page URL itself is the encrypted
 * credential payload (`requestToken` in `client.ts`), and "which backend to
 * hit" is an environment choice (`resolveTokenUrl()`), not something baked
 * into the launch URL. That means there is nothing to mint or mutate into
 * `window.location` here: in dev, `resolveTokenUrl()` already resolves to
 * this same origin's `/api` proxy (`vite.config.ts`), which `server/index.js`
 * serves — so a working session boots with literally no URL params required.
 *
 * This function exists (mirroring the sibling ports' `devBootstrap.ts` entry
 * point) purely to document that fact and to log it once, rather than to
 * mutate anything.
 */
export function devBootstrap(): void {
  if (!import.meta.env.DEV) return;
  console.info(
    "[dev] Coin Toss's contract needs no launch query params (spec §4) — " +
      "requestToken() already targets the local mock aggregator at " +
      "http://localhost:8787 via the /api proxy. Pass ?language=xx to test " +
      "localization. (?replayMode=true&roundId=... only exercises the " +
      "confirmed non-functional replay branch's fatal-error path — see README.)",
  );
}
