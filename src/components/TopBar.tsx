import { useLanguage } from "../i18n/LanguageContext";
import { playClick } from "../state/sfx";
import { C, NAV, ui } from "../ui/design";
import { Spr, TintSpr, Tmp } from "../ui/Sprite";
import { useAutoFit } from "../ui/useAutoFit";

/**
 * `NavPanel` (spec §5) — logo, live balance, and the single hamburger
 * `MenuButton`. Unlike the sibling ports, NavPanel itself carries no
 * separate Help/Bet-History icon buttons — both live inside the `MenuPanel`
 * drawer this button opens (see `MenuPanel.tsx`), matching the scene
 * exactly instead of inventing extra top-bar icons.
 */
export function TopBar({
  currency,
  balance,
  onMenu,
}: {
  currency: string;
  balance: number;
  onMenu: () => void;
}) {
  const { t } = useLanguage();
  // `Currency` (the "USD" code) is its own sibling TMP node right before
  // this one — the value here is the numeric balance only, not re-prefixed.
  const valueText = balance.toFixed(2);
  const valueRef = useAutoFit<HTMLSpanElement>(NAV.value.fs, 16, [valueText]);

  return (
    <>
      {/* `logo` — frame mobile-8, the "Coin & Toss" bubble title, 1:1. */}
      <Spr src={ui("logo")} rect={NAV.logo} eager />

      {/* `Bal Panel` — frame mobile-1. */}
      <Spr src={ui("bal-panel")} rect={NAV.balPanel} />
      <Tmp rect={NAV.balLabel} fontSize={NAV.balLabel.fs} color={C.balanceAmber} align="left">
        {t("Balance")}
      </Tmp>
      <Tmp rect={NAV.currency} fontSize={NAV.currency.fs} color={C.white} align="left">
        {currency}
      </Tmp>
      <span
        ref={valueRef}
        className="tmp nowrap bal-value-fit"
        style={{
          position: "absolute",
          left: NAV.value.x,
          top: NAV.value.y,
          width: NAV.value.w,
          height: NAV.value.h,
          fontSize: NAV.value.fs,
          color: C.white,
          justifyContent: "flex-start",
          alignItems: "center",
        }}
      >
        {valueText}
      </span>
      <Spr src={ui("bal-divider")} rect={NAV.divider} />
      {/* `bal (1)` — a static design-time label, kept literally (no live
       * device-mode concept in this port). */}
      <Tmp rect={NAV.mode} fontSize={NAV.mode.fs} color={C.white}>
        {"PHONE\nMODE"}
      </Tmp>

      <button
        type="button"
        className="btn press"
        style={{ left: NAV.menuButton.x, top: NAV.menuButton.y, width: NAV.menuButton.w, height: NAV.menuButton.h }}
        onClick={() => {
          playClick();
          onMenu();
        }}
        aria-label={t("Select Language")}
      >
        <Spr src={ui("menu-button")} rect={{ x: 0, y: 0, w: NAV.menuButton.w, h: NAV.menuButton.h }} />
        <TintSpr
          src={ui("hamburger-icon")}
          tint={C.white}
          rect={{
            x: NAV.menuGlyph.x - NAV.menuButton.x,
            y: NAV.menuGlyph.y - NAV.menuButton.y,
            w: NAV.menuGlyph.w,
            h: NAV.menuGlyph.h,
          }}
        />
      </button>
    </>
  );
}
