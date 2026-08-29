import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";
import { U, U_FONT } from "./tokens";
import type { UMetrics } from "./scale";
import { UBackIcon, UCloseIcon } from "./icons";
import { ensureStyles } from "./styles";

/**
 * Shared building blocks for the three unified surfaces.
 *
 * These sit ABOVE each game's fixed-rect sprite system: the root is
 * `position:absolute; inset:0` inside the game's `Stage`, so it inherits the
 * stage transform (and therefore scales with the viewport) while laying its
 * own children out in normal flow. That is the trick that lets one component
 * render identically over eleven different scene coordinate systems.
 */

/**
 * Full-screen layer + dismiss scrim.
 *
 * Portalled to `document.body` so it escapes the game's `Stage`, which
 * applies a `transform: scale()` to a fixed reference-resolution box. Left
 * inside that box the overlay is laid out in design space: the scrim covers
 * the reference box rather than the screen, and on any viewport whose aspect
 * differs from the design's it is clipped on both sides. Out here it gets
 * real viewport pixels at any scene scale — the same treatment ReelWheel
 * already used for its own modals.
 */
export function UOverlay({
  onDismiss,
  align = "left",
  zIndex = 2000,
  children,
  label,
}: {
  onDismiss: () => void;
  /** `left` anchors a drawer; `center` centres a panel. */
  align?: "left" | "center";
  zIndex?: number;
  children: ReactNode;
  label: string;
}) {
  ensureStyles();
  if (typeof document === "undefined") return null;

  return createPortal(
    <div
      className="u-kit"
      style={{
        position: "fixed",
        inset: 0,
        zIndex,
        fontFamily: U_FONT,
        display: "flex",
        alignItems: align === "center" ? "center" : "stretch",
        justifyContent: align === "center" ? "center" : "flex-start",
      }}
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onDismiss}
        style={{
          position: "absolute",
          inset: 0,
          border: 0,
          padding: 0,
          background: U.scrim,
          cursor: "pointer",
        }}
      />
      {children}
    </div>,
    document.body,
  );
}

/**
 * The panel/drawer body. `variant` picks the geometry: a left-anchored
 * full-height drawer, or a page that is full-bleed in portrait and a centred
 * card in landscape.
 */
export function USurface({
  m,
  variant,
  children,
}: {
  m: UMetrics;
  variant: "drawer" | "page";
  children: ReactNode;
}) {
  const drawer = variant === "drawer";
  return (
    <div
      style={{
        position: "relative",
        display: "flex",
        flexDirection: "column",
        background: drawer ? U.surface : U.surfaceSunken,
        width: drawer ? m.drawerW : m.panelW,
        height: drawer ? "100%" : m.panelH,
        // A centred landscape page reads as a card; portrait is full-bleed
        // and must not show rounded corners against the screen edge.
        borderRadius: !drawer && !m.portrait ? m.radius.md : 0,
        borderRight: drawer ? `1px solid ${U.border}` : undefined,
        border: !drawer && !m.portrait ? `1px solid ${U.border}` : undefined,
        overflow: "hidden",
      }}
    >
      {children}
    </div>
  );
}

/**
 * Header bar, identical on all three surfaces: title on the left, a single
 * dismiss affordance on the right. A drawer closes with an X; a page that
 * was pushed from the menu goes back with an arrow.
 */
export function UHeader({
  m,
  title,
  onClose,
  icon = "close",
  closeLabel = "Close",
}: {
  m: UMetrics;
  title: string;
  onClose: () => void;
  icon?: "close" | "back";
  closeLabel?: string;
}) {
  const Icon = icon === "back" ? UBackIcon : UCloseIcon;
  return (
    <div
      style={{
        flex: "0 0 auto",
        display: "flex",
        alignItems: "center",
        gap: m.sp.sm,
        padding: `${m.sp.md}px ${m.sp.md}px`,
        borderBottom: `1px solid ${U.border}`,
      }}
    >
      <span
        style={{
          flex: "1 1 auto",
          minWidth: 0,
          fontSize: m.fs.title,
          fontWeight: 700,
          color: U.text,
          lineHeight: 1.2,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {title}
      </span>
      <button
        type="button"
        className="u-btn u-press"
        onClick={onClose}
        aria-label={closeLabel}
        style={{
          position: "static",
          flex: "0 0 auto",
          display: "grid",
          placeItems: "center",
          width: m.tap,
          height: m.tap,
          borderRadius: m.radius.sm,
          background: "transparent",
        }}
      >
        <Icon size={m.fs.title} color={U.text} />
      </button>
    </div>
  );
}

/** Scrollable body region. */
export function UBody({
  m,
  children,
  style,
}: {
  m: UMetrics;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      className="u-scroll"
      style={{
        flex: "1 1 auto",
        minHeight: 0,
        overflowY: "auto",
        padding: m.sp.md,
        display: "flex",
        flexDirection: "column",
        gap: m.sp.sm,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** A tappable menu row: icon, label, optional trailing node. */
export function URow({
  m,
  icon,
  label,
  trailing,
  onClick,
}: {
  m: UMetrics;
  icon: ReactNode;
  label: string;
  trailing?: ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="u-btn u-press"
      onClick={onClick}
      style={{
        position: "static",
        display: "flex",
        alignItems: "center",
        gap: m.sp.md,
        width: "100%",
        padding: `${m.sp.md}px ${m.sp.md}px`,
        background: U.surfaceRaised,
        border: `1px solid ${U.border}`,
        borderRadius: m.radius.md,
        color: U.text,
        fontSize: m.fs.body,
        fontWeight: 600,
        textAlign: "left",
      }}
    >
      {icon}
      <span style={{ flex: "1 1 auto", minWidth: 0 }}>{label}</span>
      {trailing}
    </button>
  );
}

/** Centred empty/loading state. */
export function UEmpty({
  m,
  icon,
  title,
  hint,
}: {
  m: UMetrics;
  icon: ReactNode;
  title: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        flex: "1 1 auto",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: m.sp.sm,
        padding: m.sp.xl,
        textAlign: "center",
      }}
    >
      {icon}
      <span style={{ fontSize: m.fs.body, fontWeight: 600, color: U.text }}>{title}</span>
      {hint && <span style={{ fontSize: m.fs.caption, color: U.textDim }}>{hint}</span>}
    </div>
  );
}
