import { defineConfig } from "vite";
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
const MOCK_SERVER = process.env.VITE_MOCK_SERVER || `http://localhost:${process.env.MOCK_PORT || 8787}`;

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: Number(process.env.VITE_PORT) || 5175,
    strictPort: true,
    proxy: {
      "/api": MOCK_SERVER,
      "/lang": MOCK_SERVER,
    },
  },
});
