import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import { UnifiedMenu } from "../ui/unified";

/**
 * Adapter onto the shared `UnifiedMenu` (see `src/ui/unified/`).
 *
 * The hamburger drawer is one of the three chrome surfaces unified across
 * all eleven games, so it no longer renders against this game's `MENU` scene
 * rects — the kit owns palette, type scale and layout.
 */
export function MenuPanel({
  visible,
  onClose,
  onHelp,
  onBetHistory,
}: {
  visible: boolean;
  onClose: () => void;
  onHelp: () => void;
  onBetHistory: () => void;
}) {
  const { t, languages, currentLanguage, setLanguage } = useLanguage();
  const [muted, setMuted] = useState(false);

  const list = languages.length > 0 ? languages : [{ code: "en", language: "English" }];

  const click = (fn: () => void) => () => {
    playClick();
    fn();
  };

  return (
    <UnifiedMenu
      visible={visible}
      muted={muted}
      languages={list}
      currentLanguageCode={currentLanguage.code}
      onSelectLanguage={(code) => {
        const lang = list.find((l) => l.code === code);
        if (lang) void setLanguage(lang);
      }}
      onOpenHowToPlay={click(onHelp)}
      onOpenBetHistory={click(onBetHistory)}
      onToggleMute={() => {
        playClick();
        setMuted((m) => !m);
      }}
      onClose={onClose}
      t={t}
    />
  );
}
