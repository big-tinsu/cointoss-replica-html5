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

/**
 * Budget for the URL-encoded `texts=` value of a single request.
 *
 * The service takes its key list as a GET query parameter, so the whole
 * table travels in the request line — and 8KB is the usual ceiling there
 * (nginx's default `large_client_header_buffers`, and most CDNs in front of
 * it), past which the request is rejected outright with a 414. The Unity
 * client never came close because its `gameTexts` was ~100 short UI labels;
 * once the full operator rules copy is part of the table (see `strings.ts`)
 * one request would be several times that and every language would fail to
 * load. 6000 leaves room for the origin, path and encoding slack.
 */
const MAX_QUERY_CHARS = 6000;

/** Greedily packs `keys` into request-sized batches, order preserved. */
function batchKeys(keys: string[]): string[][] {
  const batches: string[][] = [];
  let batch: string[] = [];
  let size = 2; // the encoded "[" and "]"
  for (const key of keys) {
    // +3 for the "%2C" separator; a lone key over budget still goes out on
    // its own, since splitting a key would corrupt it.
    const cost = encodeURIComponent(JSON.stringify(key)).length + 3;
    if (batch.length > 0 && size + cost > MAX_QUERY_CHARS) {
      batches.push(batch);
      batch = [];
      size = 2;
    }
    batch.push(key);
    size += cost;
  }
  if (batch.length > 0) batches.push(batch);
  return batches;
}

/**
 * Translates `keys`, returning one entry per key IN THE ORDER GIVEN — the
 * caller zips the result back onto its key list positionally.
 *
 * That contract is why each batch is padded to its own length: a short
 * response would otherwise shift every following key onto the wrong string,
 * silently mislabelling the whole UI. A missing entry becomes `""`, which
 * the caller's empty-string check already turns back into the English key.
 */
export async function fetchTranslations(code: string, keys: string[]): Promise<string[]> {
  const batches = batchKeys(keys);
  const responses = await Promise.all(
    batches.map(async (batch) => {
      const query = encodeURIComponent(JSON.stringify(batch));
      const res = await getJson<Translations>(
        `${LANGUAGE_BASE}/lang/api/v1/languages/${code}?texts=${query}`,
      );
      return res.data;
    }),
  );
  return responses.flatMap((data, i) => batches[i].map((_, j) => data[j] ?? ""));
}

export { ApiError };
