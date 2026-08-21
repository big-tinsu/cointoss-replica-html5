import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// The mock dev server (server/index.js) hosts the whole "aggregator" contract
// (spec §4): /api/v2/partner/agg/token (token exchange), /api/v2/bet-placed/
// agg-* (authenticate/place-bet/actions/manual-actions), /api/v1/bet-placed/...
// (bet history), and /lang/... (language list + translations). Proxying keeps
// the client's URLs same-origin in dev, matching how a real aggregator launch
// (iframe/webview pointed at a partner-hosted page) resolves its own backend.
const MOCK_SERVER = "http://localhost:8789";

export default defineConfig({
  plugins: [react()],
  base: "./",
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      "/api": MOCK_SERVER,
      "/lang": MOCK_SERVER,
    },
  },
});
