import type { LanguageList, Translations } from "../api/types";
import { ApiError, getJson } from "../api/http";

/**
 * `LanguageManager.cs` (spec §6) hits `https://game.shacksevo.co/lang/...`
 * directly.
 *
 * In dev this stays same-origin (empty base): `vite.config.ts` proxies
 * `/lang` to `server/index.js`, which stubs the endpoints so the game runs
 * fully offline. A production build has no proxy and no `/lang` route on the
 * static host, so an empty base resolved to
 * `https://<deploy-host>/lang/api/v1/languages` and 404'd on every launch —
 * survivable (the catch in `LanguageContext.boot` falls back to the built-in
 * English strings) but it meant localization never worked off localhost.
 * Defaults to the real host in prod instead, mirroring how
 * `client.ts:resolveTokenUrl()` picks its own environment. `game.shacksevo.co`
 * returns `Access-Control-Allow-Origin` for the deploy origin, so this is a
 * plain cross-origin GET. Override with `VITE_LANGUAGE_BASE` (no trailing
 * slash) to point at a different host.
 */
const LANGUAGE_BASE =
  (import.meta.env.VITE_LANGUAGE_BASE as string | undefined) ??
  (import.meta.env.DEV ? "" : "https://game.shacksevo.co");

export async function fetchLanguageList(): Promise<Record<string, string>> {
  const res = await getJson<LanguageList>(`${LANGUAGE_BASE}/lang/api/v1/languages`);
  return res.data;
}

export async function fetchTranslations(code: string, keys: string[]): Promise<string[]> {
  const query = encodeURIComponent(JSON.stringify(keys));
  const res = await getJson<Translations>(
    `${LANGUAGE_BASE}/lang/api/v1/languages/${code}?texts=${query}`,
  );
  return res.data;
}

export { ApiError };
