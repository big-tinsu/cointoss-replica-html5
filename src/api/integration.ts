/**
 * Which betting client this build is serving.
 *
 * The same game ships to two audiences with genuinely different backends:
 *
 *   - **partner** (`docs/PARTNER_API_INTEGRATION.md`) — a `clientId` launch
 *     param carrying an encrypted server base, a `clientId`-header token GET,
 *     and ONE `th-place-bet` call that both resolves the round and returns the
 *     new balance.
 *   - **aggregator** (`docs/AGGREGATOR_API_INTEGRATION.md`) — the whole launch
 *     href posted as ciphertext, a rotating `sessionId`, and a four-call round
 *     (`agg-place-bet` → `agg-actions` → `agg-authenticate`).
 *
 * Partner is the DEFAULT: aggregator has to be asked for explicitly. Anything
 * other than the exact string "aggregator" — unset, empty, a typo — resolves to
 * partner, so a misspelt variable degrades to the default rather than to a
 * broken third state.
 */
export type Integration = "partner" | "aggregator";

export const INTEGRATION: Integration =
  import.meta.env.VITE_INTEGRATION === "aggregator" ? "aggregator" : "partner";

export const isAggregator = INTEGRATION === "aggregator";
export const isPartner = INTEGRATION === "partner";
