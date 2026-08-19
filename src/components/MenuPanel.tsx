import { useLanguage } from "../i18n/LanguageContext";

/**
 * `MenuPanel`/`LangSettingsUi` (spec §5/§6) — folds the language selector
 * into the one menu panel opened from `TopBar`'s hamburger button.
 * `LangSettingsUi.OnLangEdit()`'s documented fix ("repopulate buttons only —
 * never touch panel visibility") is preserved by construction here: choosing
 * a language just calls `setLanguage()`, which never touches `visible`.
 */
export function MenuPanel({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const { t, languages, currentLanguage, setLanguage } = useLanguage();
  if (!visible) return null;

  return (
    <div className="modal-backdrop">
      <div className="modal-panel menu-panel">
        <header className="bet-history-header">
          <h2>{t("Select Language")}</h2>
          <button type="button" onClick={onClose} aria-label={t("Close")}>
            ×
          </button>
        </header>
        <ul className="language-list">
          {(languages.length > 0 ? languages : [{ code: "en", language: "English" }]).map((lang) => (
            <li key={lang.code}>
              <button
                type="button"
                className={lang.code === currentLanguage.code ? "language-option is-active" : "language-option"}
                onClick={() => void setLanguage(lang)}
              >
                {lang.language}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
