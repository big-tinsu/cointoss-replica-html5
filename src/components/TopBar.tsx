import { useLanguage } from "../i18n/LanguageContext";
import { CustomizableText } from "./Customizable";

const BASE = import.meta.env.BASE_URL;

/**
 * `NavPanel`/`MenuPanel`/`MenuButton` (spec §5) — the top chrome: brand
 * banner, live balance, and buttons for the menu (About + Language, folded
 * into one panel here), Bet History, and Help.
 *
 * Uses `shacksevobanner.png` as the canonical brand logo, not
 * `Onerapidplay Logo.png` — a differently-branded asset sitting alongside it
 * in the source (spec §8's flag); Shacks Evolution is this project's own
 * studio brand per `ProjectSettings.asset`, so it's the canonical choice.
 */
export function TopBar({
  currency,
  balance,
  onHelp,
  onBetHistory,
  onMenu,
}: {
  currency: string;
  balance: number;
  onHelp: () => void;
  onBetHistory: () => void;
  onMenu: () => void;
}) {
  const { t } = useLanguage();

  return (
    <header className="top-bar">
      <div className="brand">
        <img src={`${BASE}assets/img/shacksevobanner.png`} alt="Shacks Evolution" />
        <span className="brand-text">
          <CustomizableText name="header-banner-text" i18nKey="Welcome to Cointoss" />
        </span>
      </div>

      <div className="balance-pill">
        <span className="label">{t("Status")}</span>
        <span className="value">
          {currency} {balance.toFixed(2)}
        </span>
      </div>

      <nav className="top-bar-actions">
        <button type="button" onClick={onBetHistory} title={t("Bet History")}>
          📜
        </button>
        <button type="button" onClick={onHelp} title={t("About")}>
          ?
        </button>
        <button type="button" onClick={onMenu} title={t("Select Language")}>
          ☰
        </button>
      </nav>
    </header>
  );
}
