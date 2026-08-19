import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { DEFAULT_STRINGS } from "./strings";
import { fetchLanguageList, fetchTranslations } from "./languageClient";

/** Mirrors `Language` (`LanguageManager.cs:264-269`). */
export interface Language {
  code: string;
  language: string;
}

const DEFAULT_LANGUAGE: Language = { code: "en", language: "English" };

function capitalizeFirst(s: string): string {
  if (!s || s.replace(/\s/g, "").length === 0) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

interface LanguageState {
  t: (key: string) => string;
  translateAdHoc: (text: string) => Promise<string>;
  languages: Language[];
  currentLanguage: Language;
  setLanguage: (lang: Language) => Promise<void>;
  warning: string | null;
  isReady: boolean;
}

const LanguageStateContext = createContext<LanguageState | null>(null);

/**
 * React port of `LanguageManager.cs` (spec §6). `gameTexts` becomes React
 * state (`strings`) instead of a static dictionary so components re-render on
 * `TranslateAll`; the fetch-and-zip mechanics (same key order in, translated
 * array back, force-capitalize first letter, fall back to the English key on
 * an empty/failed translation) are reproduced exactly. Uses a safe
 * lookup-with-fallback (`t()`) everywhere — never a throwing indexer, per the
 * spec §6 recommendation to complete uniformly what the source only
 * partially applied (`LanguageManager.GetText` vs. the throwing
 * `gameTexts[key]` used elsewhere in the same file).
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const [strings, setStrings] = useState<Record<string, string>>(() => ({ ...DEFAULT_STRINGS }));
  const [languages, setLanguages] = useState<Language[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<Language>(DEFAULT_LANGUAGE);
  const [warning, setWarning] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const stringsRef = useRef(strings);
  stringsRef.current = strings;

  const t = useCallback((key: string): string => stringsRef.current[key] ?? key, []);

  const translateAll = useCallback(async (lang: Language) => {
    if (lang.code.toLowerCase() === "en") {
      setStrings({ ...DEFAULT_STRINGS });
      setCurrentLanguage(lang);
      return;
    }
    const keys = Object.keys(DEFAULT_STRINGS);
    try {
      const translated = await fetchTranslations(lang.code, keys);
      const next: Record<string, string> = { ...stringsRef.current };
      keys.forEach((key, i) => {
        const value = translated[i];
        next[key] = value && value.replace(/\s/g, "").length > 0 ? capitalizeFirst(value) : key;
      });
      setStrings(next);
      setCurrentLanguage(lang);
    } catch {
      throw new Error("translate-failed");
    }
  }, []);

  const setLanguage = useCallback(
    async (lang: Language) => {
      try {
        await translateAll(lang);
      } catch {
        setWarning("Couldn't load game in language preset, defaulting to English (en)");
        await translateAll(DEFAULT_LANGUAGE);
      }
    },
    [translateAll],
  );

  const translateAdHoc = useCallback(
    async (text: string): Promise<string> => {
      if (!(text in stringsRef.current)) {
        stringsRef.current = { ...stringsRef.current, [text]: text };
        setStrings(stringsRef.current);
      }
      if (currentLanguage.code === "en") return text;
      try {
        const [translated] = await fetchTranslations(currentLanguage.code, [text]);
        const value =
          translated && translated.replace(/\s/g, "").length > 0 ? capitalizeFirst(translated) : text;
        stringsRef.current = { ...stringsRef.current, [text]: value };
        setStrings(stringsRef.current);
        return value;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (_err) {
        return text;
      }
    },
    [currentLanguage],
  );

  // Boot: fetch the language list + apply the URL's `language` param, exactly
  // like `GameLoader.RunLanguageInBackground` (spec §6, note the key is
  // `language`, not `lang` as in Penaldo/Keno) — runs independently of auth
  // and never blocks game activation.
  const bootedRef = useRef(false);
  const boot = useCallback(
    async (requestedCode: string) => {
      if (bootedRef.current) return;
      bootedRef.current = true;
      try {
        const list = await fetchLanguageList();
        const langs = Object.entries(list).map(([code, language]) => ({ code, language }));
        setLanguages(langs);
        const match = langs.find((l) => l.code === requestedCode);
        if (match) {
          try {
            await translateAll(match);
          } catch {
            setWarning("Couldn't load game in language preset, defaulting to English (en)");
            await translateAll(DEFAULT_LANGUAGE);
          }
        } else {
          await translateAll(DEFAULT_LANGUAGE);
          setWarning("Unrecognized language code, defaulting to English (en)");
        }
      } catch {
        await translateAll(DEFAULT_LANGUAGE);
        setWarning("Couldn't retrieve language options, defaulting to English (en)");
      } finally {
        setIsReady(true);
      }
    },
    [translateAll],
  );

  const value = useMemo<LanguageState & { boot: typeof boot }>(
    () => ({ t, translateAdHoc, languages, currentLanguage, setLanguage, warning, isReady, boot }),
    [t, translateAdHoc, languages, currentLanguage, setLanguage, warning, isReady, boot],
  );

  return <LanguageStateContext.Provider value={value}>{children}</LanguageStateContext.Provider>;
}

export function useLanguage(): LanguageState & { boot: (code: string) => Promise<void> } {
  const ctx = useContext(LanguageStateContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx as LanguageState & { boot: (code: string) => Promise<void> };
}
