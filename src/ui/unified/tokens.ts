/**
 * Unified overlay design system — shared verbatim across all eleven
 * `*-replica-html5` games.
 *
 * The three chrome surfaces (hamburger menu, bet history, how to play) are
 * deliberately NOT replicas of their per-game Unity originals: they render
 * identically everywhere so the fleet reads as one product. Everything here
 * is self-contained — the kit never reads a game's `design.ts` rects, which
 * is precisely what keeps the output identical across canvases that range
 * from 1242x2688 portrait to 1920x1080 landscape.
 *
 * The ONLY per-game variable is `accent` (see `accent.ts`).
 */

/** Shared palette. Identical in every game. */
export const U = {
  scrim: "rgba(0, 0, 0, 0.62)",
  /** Drawer / modal body. */
  surface: "#10131E",
  /** Rows and cards sitting on `surface`. */
  surfaceRaised: "#171B2B",
  /** Full-bleed page behind a panel. */
  surfaceSunken: "#0B0E17",
  border: "#242B40",
  borderStrong: "rgba(255, 255, 255, 0.16)",
  text: "#E6EAF2",
  textDim: "#8A93A6",
  textFaint: "#5C6478",
  onAccent: "#FFFFFF",
  won: "#3FBF6A",
  lost: "#E5484D",
  pending: "#F5B942",
} as const;

/**
 * One font for all eleven games. Arimo and Liberation Sans are already
 * bundled across these repos and are metric-compatible with Arial/Helvetica,
 * so the stack renders at the same measure everywhere and needs no new
 * webfont in any game. Per-game display faces (Astroline, Bestime, Mitr,
 * Good Brush, Debussy...) deliberately do not apply to these surfaces.
 */
export const U_FONT = '"Arimo", "Liberation Sans", Helvetica, Arial, sans-serif';
