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

/**
 * Logical points -> canvas pixels.
 *
 * These canvases are authored at wildly different densities: 1242x2688 is a
 * ~390pt phone screen, 1920x1080 a ~1280pt desktop one. Sizing type off a
 * raw fraction of the canvas therefore CANNOT read correctly on both — the
 * same fraction that gives comfortable desktop body text lands at about 11pt
 * on the phone. So the scale is authored in device-independent points and
 * converted per orientation, which is what actually makes the surfaces look
 * the same to a player regardless of which game or device they are on.
 */
export function ptScale(refW: number, refH: number): number {
  const portrait = refH >= refW;
  return portrait ? refW / 390 : refH / 720;
}

/** Geometry unit for proportional boxes, as a fraction of the short edge. */
export function unit(refW: number, refH: number): number {
  return Math.min(refW, refH) / 100;
}

/** Type scale, in logical points. */
export const U_FS = {
  display: 22,
  title: 18,
  body: 15,
  label: 13,
  caption: 11.5,
  micro: 10,
} as const;

/** Spacing scale, in logical points. */
export const U_SP = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 30,
} as const;

/** Corner radii, in logical points. */
export const U_RADIUS = {
  sm: 6,
  md: 10,
  pill: 999,
} as const;

/**
 * Resolved, pixel-valued metrics for one canvas.
 *
 * Components read this rather than converting units at every call site, so
 * the scale rules live in exactly one place.
 */
export type UMetrics = {
  /** Canvas px per logical point. */
  pt: number;
  /** Geometry unit (1% of the short edge). */
  u: number;
  portrait: boolean;
  fs: Record<keyof typeof U_FS, number>;
  sp: Record<keyof typeof U_SP, number>;
  radius: { sm: number; md: number; pill: number };
  /** Left drawer width. */
  drawerW: number;
  /** Centred-panel box in landscape; full-bleed in portrait. */
  panelW: number;
  panelH: number;
  /** Square hit target for header buttons (44pt, the platform minimum). */
  tap: number;
};

export function metrics(refW: number, refH: number): UMetrics {
  const pt = ptScale(refW, refH);
  const u = unit(refW, refH);
  const portrait = refH >= refW;
  const scale = <K extends string>(o: Record<K, number>) =>
    Object.fromEntries(Object.entries(o).map(([k, v]) => [k, (v as number) * pt])) as Record<K, number>;

  return {
    pt,
    u,
    portrait,
    fs: scale(U_FS),
    sp: scale(U_SP),
    radius: { sm: U_RADIUS.sm * pt, md: U_RADIUS.md * pt, pill: U_RADIUS.pill },
    // Portrait leaves a strip of the game visible behind the scrim; landscape
    // is sized off the short edge so a 1920-wide scene doesn't get a drawer
    // half the screen across.
    drawerW: portrait ? refW * 0.82 : refH * 0.62,
    panelW: portrait ? refW : Math.min(refW * 0.72, refH * 1.15),
    panelH: portrait ? refH : refH * 0.88,
    tap: pt * 44,
  };
}
