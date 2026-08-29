import { U } from "./tokens";
import { ACCENT, ACCENT_SOFT } from "./accent";
import { UBody, UHeader, UOverlay, USurface } from "./primitives";
import { useUnified } from "./scale";

/**
 * One block of help copy.
 *
 * Games differ in how their rules are authored: Diced and Coin Toss are a
 * flat numbered list, while Citadel and Keno carry section headings with a
 * mix of numbered rules and plain notes. Rendering the second kind as one
 * long numbered list loses the structure the copy was written with, so the
 * kit models all three shapes and numbers `rule` blocks only — restarting at
 * each heading.
 */
export type UHelpBlock =
  | { kind: "heading"; text: string }
  | { kind: "rule"; text: string }
  | { kind: "note"; text: string }
  /** A rule the scene called out in a warning colour (e.g. Coin Toss's
   *  "lands on its side" loss condition). Numbered like a rule. */
  | { kind: "warn"; text: string };

/** Unified "How to play" page — identical in all eleven games. */
export function UnifiedHowToPlay({
  visible,
  blocks,
  bullets,
  footer,
  onClose,
  t = (s) => s,
}: {
  visible: boolean;
  /** Full structure. Takes precedence over `bullets`. */
  blocks?: UHelpBlock[];
  /** Convenience for games whose copy is a flat numbered list. */
  bullets?: string[];
  /** e.g. "RTP is 95%". */
  footer?: string;
  onClose: () => void;
  t?: (s: string) => string;
}) {
  const m = useUnified();
  if (!visible) return null;

  const items: UHelpBlock[] =
    blocks ?? (bullets ?? []).map((text) => ({ kind: "rule" as const, text }));

  let n = 0;

  return (
    <UOverlay onDismiss={onClose} align="center" zIndex={80} label={t("How to play")}>
      <USurface m={m} variant="page">
        <UHeader m={m} title={t("How to play")} onClose={onClose} icon="back" closeLabel={t("Close")} />

        <UBody m={m} style={{ gap: m.sp.md }}>
          {items.map((block, i) => {
            if (block.kind === "heading") {
              n = 0;
              return (
                <span
                  key={i}
                  style={{
                    marginTop: i === 0 ? 0 : m.sp.sm,
                    fontSize: m.fs.label,
                    fontWeight: 700,
                    color: ACCENT,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    textAlign: "left",
                  }}
                >
                  {block.text}
                </span>
              );
            }

            if (block.kind === "note") {
              return (
                <span
                  key={i}
                  style={{
                    fontSize: m.fs.body,
                    color: U.textDim,
                    lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                  }}
                >
                  {block.text}
                </span>
              );
            }

            n += 1;
            const warn = block.kind === "warn";
            return (
              <div key={i} style={{ display: "flex", gap: m.sp.md, alignItems: "flex-start" }}>
                <span
                  style={{
                    flex: "0 0 auto",
                    display: "grid",
                    placeItems: "center",
                    width: 26,
                    height: 26,
                    borderRadius: "50%",
                    background: warn ? "rgba(229, 72, 77, 0.14)" : ACCENT_SOFT,
                    border: `1px solid ${warn ? U.lost : ACCENT}`,
                    color: warn ? U.lost : ACCENT,
                    fontSize: m.fs.caption,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {n}
                </span>
                <span
                  style={{
                    flex: "1 1 auto",
                    minWidth: 0,
                    fontSize: m.fs.body,
                    color: warn ? U.lost : U.text,
                    fontWeight: warn ? 700 : 400,
                    lineHeight: 1.4,
                    whiteSpace: "pre-wrap",
                    textAlign: "left",
                    paddingTop: 3,
                  }}
                >
                  {block.text}
                </span>
              </div>
            );
          })}

          {footer && (
            <span
              style={{
                marginTop: m.sp.sm,
                paddingTop: m.sp.md,
                borderTop: `1px solid ${U.border}`,
                fontSize: m.fs.caption,
                color: U.textDim,
                textAlign: "left",
              }}
            >
              {footer}
            </span>
          )}
        </UBody>
      </USurface>
    </UOverlay>
  );
}
