import type { LanguageList, Translations } from "../api/types";
import { ApiError, getJson } from "../api/http";

/**
 * `LanguageManager.cs` (spec §6) hits `https://game.shacksevo.co/lang/...`
 * directly. This replica routes the same paths at its own origin instead —
 * `server/index.js` stubs them — so the game works fully offline/self
 * contained; point `VITE_LANGUAGE_BASE` at a real host to use one instead.
 */
const LANGUAGE_BASE = import.meta.env.VITE_LANGUAGE_BASE ?? "";

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
