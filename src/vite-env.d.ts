/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Which betting client this build serves: "aggregator", or anything else
   * (including unset) for the DEFAULT, "partner". See `src/api/integration.ts`
   * and the two contracts in `docs/`. */
  readonly VITE_INTEGRATION?: string;
  /** Sub-path the game is mounted under by a proxy, without a trailing slash
   * (e.g. "/games/cointoss"). Mirrors `base` in `vite.config.ts`; consumed by
   * `src/assetUrl.ts`. Unset means relative asset URLs. */
  readonly VITE_BASE_PATH?: string;
  /** Origin serving `/lang/...`, when it is not the page's own. */
  readonly VITE_LANGUAGE_BASE?: string;
  /** Aggregator host + API base for the token exchange, without a trailing
   * slash and WITHOUT the `/partner/agg/token` path — `src/api/client.ts`
   * appends that. Defaults to `https://game.shacksevo.co/user/api/v2`. */
  readonly VITE_AGGREGATOR_TOKEN_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
