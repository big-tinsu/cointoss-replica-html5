import { U } from "./tokens";
import { ACCENT, ACCENT_SOFT } from "./accent";
import { UBody, UHeader, UOverlay, USurface } from "./primitives";
import { useUnified } from "./scale";

/**
 * One block of help copy.
 *
 * These operator rules documents mix several distinct shapes — a top-level
 * "Game Overview" / "How To Play" / "Fair Play" structure, numbered
 * procedures, a button/glossary reference (bold name + description, not a
 * numbered step), and small worked-example tables (multiplier ladders,
 * "Stake = 100 / Cash Out = 5.55x / Total Win = 555"). Flattening all of that
 * into one numbered list loses exactly the structure the copy was authored
 * with, so the kit models each shape and a `rule`'s number restarts at every
 * `heading`.
 */
export type UHelpBlock =
  | { kind: "heading"; text: string }
  /** A numbered step. `label` (if given) is its bold lead-in, e.g. "Select
   *  Your Team" before the sentence describing it. */
  | { kind: "rule"; text: string; label?: string }
  | { kind: "note"; text: string }
  /** A rule the scene called out in a warning colour (e.g. Coin Toss's
   *  "lands on its side" loss condition, or a round-losing condition).
   *  Numbered like a rule. */
  | { kind: "warn"; text: string; label?: string }
  /** An unnumbered glossary/reference entry — a bold name (a button, a menu
   *  item, a defined term) followed by its description. Used for reference
   *  sections like "Game Buttons" that describe UI, not a procedure. */
  | { kind: "term"; label: string; text: string }
  /** A compact two-column reference table — multiplier ladders, worked
   *  payout examples. */
  | { kind: "table"; rows: [string, string][]; header?: [string, string] };

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

            if (block.kind === "term") {
              return (
                <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: m.fs.body, fontWeight: 700, color: U.text, textAlign: "left" }}>
                    {block.label}
                  </span>
                  <span
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
                </div>
              );
            }

            if (block.kind === "table") {
              // No `overflow: hidden` on the wrapper: combined with
              // `border-radius` it collapsed this box to its border width in
              // testing (Chrome only clipped, but never gave the flex/block
              // content its height back) — rounding the header's top corners
              // and the last row's bottom corners directly gets the same
              // look without relying on clipping.
              const last = block.rows.length - 1;
              return (
                <div key={i} style={{ border: `1px solid ${U.border}`, borderRadius: m.radius.md }}>
                  {block.header && (
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: m.sp.md,
                        padding: `${m.sp.xs}px ${m.sp.sm}px`,
                        background: U.surfaceRaised,
                        borderBottom: `1px solid ${U.border}`,
                        borderRadius: `${m.radius.md}px ${m.radius.md}px 0 0`,
                        fontSize: m.fs.micro,
                        fontWeight: 700,
                        color: U.textDim,
                        letterSpacing: "0.04em",
                        textTransform: "uppercase",
                      }}
                    >
                      <span>{block.header[0]}</span>
                      <span>{block.header[1]}</span>
                    </div>
                  )}
                  {block.rows.map(([k, v], j) => (
                    <div
                      key={j}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: m.sp.md,
                        padding: `${m.sp.xs}px ${m.sp.sm}px`,
                        borderTop: j === 0 && !block.header ? undefined : `1px solid ${U.border}`,
                        borderRadius: j === last ? `0 0 ${m.radius.md}px ${m.radius.md}px` : undefined,
                        fontSize: m.fs.caption,
                      }}
                    >
                      <span style={{ color: U.textDim }}>{k}</span>
                      <span style={{ color: U.text, fontWeight: 700 }}>{v}</span>
                    </div>
                  ))}
                </div>
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
                <div style={{ flex: "1 1 auto", minWidth: 0, display: "flex", flexDirection: "column", gap: 2, paddingTop: 3 }}>
                  {block.label && (
                    <span
                      style={{
                        fontSize: m.fs.body,
                        fontWeight: 700,
                        color: warn ? U.lost : U.text,
                        textAlign: "left",
                        lineHeight: 1.3,
                      }}
                    >
                      {block.label}
                    </span>
                  )}
                  <span
                    style={{
                      fontSize: m.fs.body,
                      color: warn ? U.lost : block.label ? U.textDim : U.text,
                      fontWeight: warn && !block.label ? 700 : 400,
                      lineHeight: 1.4,
                      whiteSpace: "pre-wrap",
                      textAlign: "left",
                    }}
                  >
                    {block.text}
                  </span>
                </div>
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
