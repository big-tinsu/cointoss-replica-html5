import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// The mock dev server (server/index.js) hosts the whole "aggregator" contract
// (spec §4): /api/v2/partner/agg/token (token exchange), /api/v2/bet-placed/
// agg-* (authenticate/place-bet/actions/manual-actions), /api/v1/bet-placed/...
// (bet history), and /lang/... (language list + translations). Proxying keeps
// the client's URLs same-origin in dev, matching how a real aggregator launch
// (iframe/webview pointed at a partner-hosted page) resolves its own backend.
// Overridable so this project's dev servers can run alongside the sibling
// replicas instead of colliding with them.
// MUST match server/index.js's own default (8787). These had drifted apart —
// the proxy defaulted to 8789 while the mock listened on 8787 — so a plain
// `npm run dev` sent every /api and /lang request to a dead port and the proxy
// answered 500, which surfaced in-game as the "HTTP/1.1 400 Bad Request"
// fatal-error screen.
//
// `MOCK_PORT` is read from the real process environment only, never from a
// `.env` file: `server/index.js` runs as its own process with no dotenv, so a
// `.env` value would move the proxy target without moving the port the mock
// actually listens on — reintroducing exactly the drift described above.

// Aggregator launches often sit behind a proxy that mounts the game under a
// sub-path ("https://host/games/cointoss/"). `VITE_BASE_PATH` is that mount
// point, without a trailing slash — Vite adds one. Unset (the default) keeps
// the relative base, which resolves correctly at any depth for a page served
// as `index.html` but not for a proxy that rewrites the URL without also
// rewriting the document path. `src/assetUrl.ts` reads the same variable so
// `public/` files, which Vite copies verbatim and never rewrites, move with
// the bundle.
export default defineConfig(({ mode }) => {
  // `process.env` alone misses `.env` files; `loadEnv` reads both, so a
  // committed `.env.production` works the same as a CI-injected variable.
  const env = { ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env };
  const mockServer =
    env.VITE_MOCK_SERVER || `http://localhost:${process.env.MOCK_PORT || 8787}`;

  return {
    plugins: [react()],
    base: env.VITE_BASE_PATH || "./",
    server: {
      port: Number(env.VITE_PORT) || 5175,
      strictPort: true,
      proxy: {
        "/api": mockServer,
        "/lang": mockServer,
      },
    },
  };
});
