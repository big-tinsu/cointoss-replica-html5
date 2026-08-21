import { useState } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { playClick, setMuted } from "../state/sfx";
import { C, MENU, img } from "../ui/design";
import { TintSpr, Tmp } from "../ui/Sprite";

/**
 * `MenuPanel` (spec §5) — a near-full-bleed translucent purple overlay
 * (not a slide-in side drawer), opened by `NavPanel`'s single `MenuButton`.
 * Three rows on a 240px pitch: `About Button` ("How To Play", opens Help),
 * `BetHistoryButton` ("Bet History"), and `unmute`/`mute` — two full
 * alternate-state GameObjects in the scene, reproduced here as one row that
 * swaps icon/label locally and gates this port's click-sound (see
 * `state/sfx.ts`).
 *
 * `image.png` (the row-icon sprite driving both the close X and the
 * About/Bet-History icons) is a multi-icon placeholder sheet in the source
 * — its filename and composite content (a "?" bubble plus an unrelated
 * bar-chart glyph in one texture) read as a design placeholder rather than
 * per-context art, and the extraction doesn't decode which sub-region each
 * usage draws. Purpose-fit stand-ins are used instead (see README, "What
 * could not be matched exactly").
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
  const { t } = useLanguage();
  const [muted, setMutedState] = useState(false);
  if (!visible) return null;

  const rows = [
    {
      key: "about",
      icon: "circle",
      tint: C.menuIconBlue,
      label: t("How To Play"),
      onClick: () => {
        playClick();
        onHelp();
        onClose();
      },
    },
    {
      key: "history",
      icon: "circle",
      tint: C.menuIconBlue,
      label: t("Bet History"),
      onClick: () => {
        playClick();
        onBetHistory();
        onClose();
      },
    },
    {
      key: "sound",
      icon: muted ? "volume-off" : "volume",
      tint: C.soundBadge,
      label: t("Sound"),
      onClick: () => {
        playClick();
        setMuted(!muted);
        setMutedState(!muted);
      },
    },
  ];

  return (
    <div className="modal-fade">
      <div className="node" style={{ left: 0, top: 0, width: 1080, height: 2340, background: C.menuPurple, opacity: MENU.scrimAlpha }} />

      <button
        type="button"
        className="btn press"
        style={{ left: MENU.close.x, top: MENU.close.y, width: MENU.close.w, height: MENU.close.h }}
        onClick={() => {
          playClick();
          onClose();
        }}
        aria-label={t("Close")}
      >
        <Tmp rect={{ x: 0, y: 0, w: MENU.close.w, h: MENU.close.h }} fontSize={56} color={C.white}>
          ×
        </Tmp>
      </button>

      {rows.map((row, i) => {
        const rowTop = MENU.firstRowY + i * MENU.rowPitch;
        return (
          <button
            key={row.key}
            type="button"
            className="btn press"
            style={{ left: MENU.rowX, top: rowTop, width: MENU.rowW, height: MENU.rowH }}
            onClick={row.onClick}
          >
            {i < rows.length - 1 && (
              <div
                className="node"
                style={{ left: MENU.lineX - MENU.rowX, top: MENU.lineDy, width: MENU.lineW, height: 4, background: C.white }}
              />
            )}
            <TintSpr
              src={img(row.icon)}
              tint={row.tint}
              rect={{ x: MENU.iconX - MENU.rowX, y: MENU.iconDy, w: MENU.iconSize, h: MENU.iconSize }}
            />
            <Tmp
              rect={{ x: MENU.textX - MENU.rowX, y: MENU.textDy, w: MENU.textW, h: 64 }}
              fontSize={MENU.textFs}
              color={C.white}
              align="left"
            >
              {row.label}
            </Tmp>
            <TintSpr
              src={img("arrow-1-e")}
              tint={C.white}
              rect={{ x: MENU.arrowX - MENU.rowX, y: MENU.arrowDy, w: MENU.arrowSize, h: MENU.arrowSize }}
            />
          </button>
        );
      })}
    </div>
  );
}
