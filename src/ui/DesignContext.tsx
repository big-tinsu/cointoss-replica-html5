import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import * as mobile from "./design";
import * as desktop from "./design.desktop";
import type { CanvasSpec } from "./Stage";

/**
 * Which Unity scene's design tokens the tree renders against.
 *
 * Coin Toss ships a Mobile scene and a Desktop scene, and Unity swaps between them on
 * `Screen.width < Screen.height` (`DynamicUiManager`). They are separate
 * layouts, not one re-flowed, so every rect below comes from whichever scene is
 * active rather than being scaled.
 *
 * The desktop scene is a two-column layout: the coin viewport on the left and a tall Interactive Pane on the right holding the stake field, the quick-bet grid and the Heads/Tails choice, against mobile's single stacked column. Its quick-bet chips and choice buttons are driven by Unity LayoutGroups whose children carry stale editor rects, so those rects are derived from the group's spacing against the real row width (see specs/cointoss-desktop.json).
 */
export type DesignTokens = {
  canvas: CanvasSpec;
  isDesktop: boolean;
  SCENE: typeof mobile.SCENE;
  LAYOUT: typeof mobile.LAYOUT;
  BACKDROP: typeof mobile.BACKDROP;
  NAV: typeof mobile.NAV;
  COIN_VIEWPORT: typeof mobile.COIN_VIEWPORT;
  STAKE_FIELD: typeof mobile.STAKE_FIELD;
  CHIPS: typeof mobile.CHIPS;
  CHOICE: typeof mobile.CHOICE;
  CASHOUT_RETRY: typeof mobile.CASHOUT_RETRY;
  MENU: typeof mobile.MENU;
  INSUFFICIENT: typeof mobile.INSUFFICIENT;
  ERROR: typeof mobile.ERROR;
  TOAST: typeof mobile.TOAST;
  LOADING: typeof mobile.LOADING;
  BET_HISTORY: typeof mobile.BET_HISTORY;
  HELP: typeof mobile.HELP;
  KEYPAD: typeof mobile.KEYPAD;
};

function bundle(isDesktop: boolean): DesignTokens {
  const s = isDesktop ? (desktop as unknown as typeof mobile) : mobile;
  return {
    canvas: (isDesktop ? desktop.CANVAS : mobile.CANVAS_MOBILE) as CanvasSpec,
    isDesktop,
    SCENE: s.SCENE,
    LAYOUT: s.LAYOUT,
    BACKDROP: s.BACKDROP,
    NAV: s.NAV,
    COIN_VIEWPORT: s.COIN_VIEWPORT,
    STAKE_FIELD: s.STAKE_FIELD,
    CHIPS: s.CHIPS,
    CHOICE: s.CHOICE,
    CASHOUT_RETRY: s.CASHOUT_RETRY,
    MENU: s.MENU,
    INSUFFICIENT: s.INSUFFICIENT,
    ERROR: s.ERROR,
    TOAST: s.TOAST,
    LOADING: s.LOADING,
    BET_HISTORY: s.BET_HISTORY,
    HELP: s.HELP,
    KEYPAD: s.KEYPAD,
  };
}

const MOBILE_BUNDLE = bundle(false);
const DESKTOP_BUNDLE = bundle(true);

const DesignContext = createContext<DesignTokens>(MOBILE_BUNDLE);

export function DesignProvider({
  isDesktop,
  children,
}: {
  isDesktop: boolean;
  children: ReactNode;
}) {
  const value = useMemo(() => (isDesktop ? DESKTOP_BUNDLE : MOBILE_BUNDLE), [isDesktop]);
  return <DesignContext.Provider value={value}>{children}</DesignContext.Provider>;
}

export function useDesign(): DesignTokens {
  return useContext(DesignContext);
}
