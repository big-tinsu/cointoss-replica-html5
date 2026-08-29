/**
 * Unified overlay kit — the hamburger menu, bet history and how-to-play
 * surfaces, shared verbatim across all eleven `*-replica-html5` games.
 *
 * Every file in this directory is identical in every repo EXCEPT
 * `accent.ts`, which carries the one per-game colour.
 *
 * Games consume the kit through a thin adapter (the repo's existing
 * `MenuPanel` / `BetHistoryPanel` / `HelpModal` file), which maps that game's
 * own props and record shapes onto the kit's normalised API. That keeps
 * `App.tsx` wiring untouched.
 */
export { UnifiedMenu } from "./UnifiedMenu";
export { UnifiedBetHistory } from "./UnifiedBetHistory";
export type { UBetRow } from "./UnifiedBetHistory";
export { UnifiedAbout } from "./UnifiedAbout";
export { UnifiedHowToPlay } from "./UnifiedHowToPlay";
export type { UHelpBlock } from "./UnifiedHowToPlay";
export { U, U_FONT } from "./tokens";
export { metrics, useUnified } from "./scale";
export type { UMetrics } from "./scale";
export { ACCENT, ACCENT_SOFT } from "./accent";
