import { U, U_FONT } from "./tokens";
import { ACCENT, ACCENT_SOFT } from "./accent";
import { UBody, UHeader, UOverlay, URow, USurface } from "./primitives";
import { useUnified } from "./scale";
import type { Canvas } from "./scale";
import { UHelpIcon, UHistoryIcon, UInfoIcon, ULanguageIcon, UPersonIcon, UPitchIcon, UShirtIcon, USoundIcon, UTrophyIcon } from "./icons";

/**
 * Unified hamburger drawer — identical in all eleven games.
 *
 * Structure is fixed: identity block, the primary action rows, sound, then
 * an optional language list. Games opt rows in by passing the matching
 * handler; a game with no leaderboard simply omits `onOpenLeaderboard` and
 * the row is not rendered. Row ORDER never varies, so the same action sits
 * in the same place whichever game the player is in.
 */
export type ExtraRowIcon = "shirt" | "pitch" | "trophy" | "info";

const EXTRA_ICONS = {
  shirt: UShirtIcon,
  pitch: UPitchIcon,
  trophy: UTrophyIcon,
  info: UInfoIcon,
} as const;

export function UnifiedMenu({
  visible,
  canvas,
  username,
  muted,
  languages,
  currentLanguageCode,
  onSelectLanguage,
  onOpenHowToPlay,
  onOpenBetHistory,
  onOpenLeaderboard,
  extraRows,
  onOpenLanguage,
  onOpenAbout,
  onToggleMute,
  onClose,
  t = (s) => s,
}: {
  visible: boolean;
  canvas: Canvas;
  /** Omitted by games whose drawer has no identity row. */
  username?: string;
  muted: boolean;
  languages?: { code: string; language: string }[];
  currentLanguageCode?: string;
  onSelectLanguage?: (code: string) => void;
  onOpenHowToPlay: () => void;
  onOpenBetHistory: () => void;
  onOpenLeaderboard?: () => void;
  /**
   * Game-specific rows (Penaldo's "Select Team", Street Soccer's "Select
   * Pitch"). They render with the same row chrome as every other row and sit
   * directly under the primary actions, so the shared rows keep their fixed
   * positions across all eleven games. `icon` names a kit glyph rather than
   * taking a node, so a game cannot introduce off-system art here.
   */
  extraRows?: { key: string; label: string; icon: ExtraRowIcon; onClick: () => void }[];
  /** Games with a dedicated language SCREEN (Keno, Penaldo, Street Soccer)
   *  pass this instead of `languages`, and get a row rather than the inline
   *  chip list. */
  onOpenLanguage?: () => void;
  onOpenAbout?: () => void;
  onToggleMute: () => void;
  onClose: () => void;
  t?: (s: string) => string;
}) {
  const m = useUnified(canvas);
  if (!visible) return null;

  const iconSize = m.fs.title;

  return (
    <UOverlay onDismiss={onClose} align="left" zIndex={70} label={t("Menu")}>
      <USurface m={m} variant="drawer">
        <UHeader m={m} title={t("Menu")} onClose={onClose} closeLabel={t("Close")} />

        <UBody m={m}>
          {/* Identity block — only for games that surface a User ID. */}
          {username !== undefined && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: m.sp.md,
              padding: m.sp.md,
              background: U.surfaceRaised,
              border: `1px solid ${U.border}`,
              borderRadius: m.radius.md,
            }}
          >
            <span
              style={{
                display: "grid",
                placeItems: "center",
                width: m.tap,
                height: m.tap,
                flex: "0 0 auto",
                borderRadius: "50%",
                background: ACCENT_SOFT,
                border: `1px solid ${ACCENT}`,
              }}
            >
              <UPersonIcon size={m.fs.title} color={ACCENT} />
            </span>
            <span style={{ display: "flex", flexDirection: "column", gap: m.sp.xs * 0.4, minWidth: 0 }}>
              <span style={{ fontSize: m.fs.micro, color: U.textDim, letterSpacing: "0.06em" }}>
                {t("User ID")}
              </span>
              <span
                style={{
                  fontSize: m.fs.body,
                  fontWeight: 700,
                  color: U.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {username || "—"}
              </span>
            </span>
          </div>
          )}

          <URow
            m={m}
            icon={<UHelpIcon size={iconSize} color={ACCENT} />}
            label={t("How to play")}
            onClick={onOpenHowToPlay}
          />
          <URow
            m={m}
            icon={<UHistoryIcon size={iconSize} color={ACCENT} />}
            label={t("Bet History")}
            onClick={onOpenBetHistory}
          />
          {onOpenLeaderboard && (
            <URow
              m={m}
              icon={<UTrophyIcon size={iconSize} color={ACCENT} />}
              label={t("Leaderboard")}
              onClick={onOpenLeaderboard}
            />
          )}
          <URow
            m={m}
            icon={<USoundIcon size={iconSize} color={ACCENT} muted={muted} />}
            label={t("Sound")}
            trailing={
              <span
                aria-hidden="true"
                style={{
                  flex: "0 0 auto",
                  width: m.pt * 30,
                  height: m.pt * 18,
                  borderRadius: 999,
                  background: muted ? U.border : ACCENT,
                  position: "relative",
                  transition: "background 120ms",
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: m.pt * 2,
                    left: muted ? m.pt * 2 : m.pt * 14,
                    width: m.pt * 14,
                    height: m.pt * 14,
                    borderRadius: "50%",
                    background: U.onAccent,
                    transition: "left 120ms",
                  }}
                />
              </span>
            }
            onClick={onToggleMute}
          />
          {extraRows?.map((row) => {
            const Icon = EXTRA_ICONS[row.icon];
            return (
              <URow
                key={row.key}
                m={m}
                icon={<Icon size={iconSize} color={ACCENT} />}
                label={row.label}
                onClick={row.onClick}
              />
            );
          })}
          {onOpenLanguage && (
            <URow
              m={m}
              icon={<ULanguageIcon size={iconSize} color={ACCENT} />}
              label={t("Language")}
              onClick={onOpenLanguage}
            />
          )}
          {onOpenAbout && (
            <URow
              m={m}
              icon={<UInfoIcon size={iconSize} color={ACCENT} />}
              label={t("About")}
              onClick={onOpenAbout}
            />
          )}

          {/* The inline chips and the Language ROW are alternatives, never both:
              a game passing `onOpenLanguage` has a dedicated language screen. */}
          {!onOpenLanguage && languages && languages.length > 0 && onSelectLanguage && (
            <>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: m.sp.sm,
                  marginTop: m.sp.sm,
                  color: U.textDim,
                }}
              >
                <ULanguageIcon size={m.fs.label} color={U.textDim} />
                <span style={{ fontSize: m.fs.caption, fontWeight: 700, letterSpacing: "0.06em" }}>
                  {t("Select Language")}
                </span>
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: m.sp.xs }}>
                {languages.map((lang) => {
                  const active = lang.code === currentLanguageCode;
                  return (
                    <button
                      key={lang.code}
                      type="button"
                      className="u-btn u-press"
                      onClick={() => onSelectLanguage(lang.code)}
                      style={{
                        position: "static",
                        fontFamily: U_FONT,
                        fontSize: m.fs.caption,
                        fontWeight: active ? 700 : 500,
                        color: active ? ACCENT : U.textDim,
                        background: active ? ACCENT_SOFT : "transparent",
                        border: `1px solid ${active ? ACCENT : U.border}`,
                        borderRadius: m.radius.sm,
                        padding: `${m.sp.xs}px ${m.sp.sm}px`,
                      }}
                    >
                      {lang.language}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </UBody>
      </USurface>
    </UOverlay>
  );
}
