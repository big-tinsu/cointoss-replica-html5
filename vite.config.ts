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
const MOCK_SERVER = process.env.VITE_MOCK_SERVER || `http://localhost:${process.env.MOCK_PORT || 8789}`;

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
