import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import type { ComponentData } from "../api/types";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * React port of `Customizable.cs` (spec §5) — byte-for-byte the same `type`
 * enum and branch logic as the sibling Penaldo/Keno ports, confirming this
 * theming contract is a genuinely shared, cross-game system: `GameScene.
 * Activate` builds a `name -> value` lookup once from the decrypted
 * `meta.customization` payload and applies it to every `Customizable`
 * component in the scene; here that lookup is just context. The mock
 * server's token response always returns `[]`, so by default every one of
 * these is a pure passthrough — exactly like an un-configured partner in the
 * real game.
 */
const CustomizationContext = createContext<Record<string, string>>({});

export function CustomizationProvider({
  customData,
  children,
}: {
  customData: ComponentData[];
  children: ReactNode;
}) {
  const lookup = useMemo(() => {
    const map: Record<string, string> = {};
    for (const c of customData) if (!(c.name in map)) map[c.name] = c.value;
    return map;
  }, [customData]);

  return <CustomizationContext.Provider value={lookup}>{children}</CustomizationContext.Provider>;
}

function useCustomValue(name: string): string | undefined {
  return useContext(CustomizationContext)[name];
}

/** `type: imageColor` / `camColor` — any CSS color-accepting property. */
export function useCustomColor(name: string, fallback: string): string {
  const value = useCustomValue(name);
  return value && /^#[0-9a-fA-F]{3,8}$/.test(value) ? value : fallback;
}

/** `type: toggle` — `bool.TryParse` + `SetActive`. */
export function useCustomToggle(name: string, fallback: boolean): boolean {
  const value = useCustomValue(name);
  if (value === undefined) return fallback;
  return value.toLowerCase() === "true";
}

/** `type: text` — partner-supplied copy, itself still run through
 * `LanguageManager.Translate` (spec §5). Falls back to the normal i18n key
 * when there's no override for `name`. */
export function CustomizableText({ name, i18nKey }: { name: string; i18nKey: string }) {
  const override = useCustomValue(name);
  const { t, translateAdHoc } = useLanguage();
  const [text, setText] = useState(override ?? t(i18nKey));

  useEffect(() => {
    if (!override) {
      setText(t(i18nKey));
      return;
    }
    let cancelled = false;
    void translateAdHoc(override).then((translated) => {
      if (!cancelled) setText(translated);
    });
    return () => {
      cancelled = true;
    };
  }, [override, i18nKey, t, translateAdHoc]);

  return <>{text}</>;
}

/** `type: alternatingColor` — a win/loss text-color pair driven by two
 * separate customization keys (`ColorOption.cs`, spec §5), keyed by the
 * literal strings `"win-game-outcome-text-color"`/`"loss-game-outcome-text-
 * color"` exactly as in the source. */
export function useAlternatingColor(winFallback: string, lossFallback: string) {
  const colorA = useCustomColor("win-game-outcome-text-color", winFallback);
  const colorB = useCustomColor("loss-game-outcome-text-color", lossFallback);
  return { colorA, colorB };
}
