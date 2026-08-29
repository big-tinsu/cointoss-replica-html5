import { U } from "./tokens";
import { ACCENT } from "./accent";
import { UOverlay } from "./primitives";
import { useUnified } from "./scale";

/**
 * Unified "About" card — the fourth shared chrome surface.
 *
 * Only Diced surfaces this today (from its menu's About row), but it lives in
 * the kit for the same reason the other three do: the version it replaces was
 * authored at fixed MOBILE design-space rects (a 960x560 card pinned at
 * y=984, over a 1242x2688 scrim) and those literals were reused verbatim on
 * the 1920x1080 desktop canvas — so on desktop the card hung off the bottom
 * of the screen. Rendering through `UOverlay` puts it in real viewport pixels
 * outside the stage transform, where that class of bug cannot occur.
 */
export function UnifiedAbout({
  visible,
  title,
  subtitle,
  version,
  onClose,
  t = (s) => s,
}: {
  visible: boolean;
  title: string;
  /** e.g. "Powered by Shacks Evolution Studios". */
  subtitle?: string;
  /** e.g. "v0.1.0". */
  version?: string;
  onClose: () => void;
  t?: (s: string) => string;
}) {
  const m = useUnified();
  if (!visible) return null;

  return (
    <UOverlay onDismiss={onClose} align="center" zIndex={90} label={title}>
      <div
        style={{
          position: "relative",
          width: Math.min(m.vw * 0.86, 340),
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: m.sp.sm,
          padding: m.sp.xl,
          background: U.surface,
          border: `1px solid ${U.border}`,
          borderRadius: m.radius.md,
          textAlign: "center",
        }}
      >
        <span style={{ fontSize: m.fs.display, fontWeight: 700, color: U.text }}>{title}</span>
        {subtitle && (
          <span style={{ fontSize: m.fs.body, color: U.textDim, lineHeight: 1.4 }}>{subtitle}</span>
        )}
        {version && <span style={{ fontSize: m.fs.caption, color: U.textFaint }}>{version}</span>}
        <button
          type="button"
          className="u-btn u-press"
          onClick={onClose}
          style={{
            position: "static",
            marginTop: m.sp.sm,
            width: "100%",
            padding: `${m.sp.sm}px ${m.sp.md}px`,
            borderRadius: m.radius.sm,
            background: ACCENT,
            color: U.onAccent,
            fontSize: m.fs.body,
            fontWeight: 700,
            textAlign: "center",
          }}
        >
          {t("Close")}
        </button>
      </div>
    </UOverlay>
  );
}
