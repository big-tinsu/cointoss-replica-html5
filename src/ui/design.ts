/**
 * Design-space constants extracted mechanically from the Unity scene.
 *
 * Source of truth: `/Users/jimi/codes/unity-ui-extract/out/cointoss.json`
 * (311 nodes from the Coin Toss `Canvas` scene), read via its `rect_css`
 * field — top-left origin, +y down, in the CanvasScaler reference space of
 * **1080 x 2340**. Every number below is the literal value from a named
 * node (node name given in a comment so it can be re-checked against the
 * JSON), except where a Unity layout group (`HorizontalLayoutGroup`/
 * `VerticalLayoutGroup`) drives a child's rect at runtime — those children
 * serialise as placeholder `0`/stale values in the scene file, so their
 * final rect is instead *derived* from the resolved parent rect + the
 * layout group's own padding/spacing/child-count, exactly the way Unity
 * itself would compute it. Every such derivation is called out inline.
 *
 * All units are design-space pixels. The stage (`ui/Stage.tsx`) scales the
 * whole 1080x2340 box by `sqrt((vw/1080) * (vh/2340))` — the shared
 * geometric-mean convention used across this game family's ports (see
 * "Visual fidelity" in the README for the one place this deliberately
 * diverges from this scene's own literal `CanvasScaler` config).
 */

export const DESIGN_W = 1080;
export const DESIGN_H = 2340;

/** `Canvas/Background` — the full-canvas backdrop. Mobile uses interface frame
 * mobile-19; the Desktop scene uses a different, landscape-authored sprite
 * (`Coin & Toss - desktop - 1.png`), so the sprite name travels with the rect
 * rather than being hardcoded at the call site. */
export const BACKDROP = {
  rect: { x: 0, y: 0, w: 1080, h: 2340 },
  sprite: "backdrop",
} as const;

/** The Mobile scene's Canvas -> CanvasScaler, verbatim. The Desktop scene
 * is a separate layout — see `design.desktop.ts`. */
export const CANVAS_MOBILE = {
  refW: 1080,
  refH: 2340,
  match: 1,
  mode: "MatchWidthOrHeight",
} as const;

const BASE = import.meta.env.BASE_URL;
/** The 13 real sliced comp frames actually referenced by the scene,
 * `Assets/Interface Design - Coin & Toss - Asset/...- mobile - N.png`,
 * copied to `public/assets/ui/*.png` under descriptive names. */
export const ui = (name: string) => `${BASE}assets/ui/${name}.png`;
/** Everything else (`Assets/Images and Sprites/**`, `Assets/Keypad/**`,
 * `Assets/Prefabs/Orientation/**`). */
export const img = (name: string) => `${BASE}assets/img/${name}.png`;

/* ------------------------------------------------------------------ colors */
/** Literal `Image.m_Color` / `TMP.fontColor` values. Names describe the
 * element, not an invented semantic role. */
export const C = {
  /** `bal` ("Balance" label). */
  balanceAmber: "#F7B41F",
  /** `Result Text` win colour / `CONGRATULATIONS!` header. */
  gold: "#F6C214",
  /** `About Button`/`BetHistoryButton`/`unmute` row icon tint. */
  menuIconBlue: "#1FA8F5",
  /** `unmute`/`Sound` icon badge (`point.png`) tint. */
  soundBadge: "#1E88A8",
  /** `MenuPanel/Panel` scrim. */
  menuPurple: "#2F1D52",
  /** `Rebet` (ResultsPanel). */
  rebetTeal: "#319298",
  /** `Newround`. */
  newRoundGreen: "#2AA800",
  /** `Cashout Retry/Rebet` (relabelled "Retry" here). */
  retryTeal: "#02414C",
  /** `Network Error Animation` / `Unexpected Error Display`'s exclamation tint. */
  errorRed: "#CC1707",
  /** `Error Header` text. */
  errorHeaderRed: "#FF0000",
  /** `Button` (Relaunch), Unexpected Error Display. */
  relaunchBlue: "#006EFF",
  /** `Insufficient Funds Panel/Text (TMP)` header. */
  insufficientRed: "#FF4E4E",
  /** `Insufficient Funds Panel/Button`. */
  insufficientCloseBlue: "#0EB6CC",
  /** `Notification Panel`. */
  notifyRed: "#FF0101",
  /** Keypad palette (`Assets/Keypad/` — same asset family as the sibling
   * ports' `CustomKeypad` prefab). */
  keypadBody: "#29323B",
  keypadFace: "#344550",
  keypadWell: "#1E2126",
  keypadGlyph: "#294853",
  keypadSave: "#3EA444",
  keypadScrim: "rgba(22, 27, 34, 0.5176)",
  /** `No Bet to Display/Image` / `Bet History` full-bleed backdrop. */
  historyPurple: "#2F1D52",
  historyCardPurple: "#5318A4",
  historyNoBetsGrey: "#BDBEBD",
  white: "#FFFFFF",
  black: "#000000",
} as const;

/* -------------------------------------------------------- 9-slice radii */
/**
 * Two 9-slice sprites appear in the project: `GUI Rounded Edge Button.png`
 * (a 256x256 filled rounded rect, `spriteBorder: 108`) and the keypad's
 * `round-edge-sprite.png` (identical border). Drawn `Sliced` at the canvas'
 * `referencePixelsPerUnit: 100`, the corner radius is
 *
 *     108 / m_PixelsPerUnitMultiplier
 *
 * and the multiplier is per element. The multipliers actually present in
 * `cointoss.json` (histogram over all 177 Image components) are 1, 2, 3, 4,
 * 5, 6, 8, 10 — so the radii below are the complete set actually used.
 */
export const slice9 = (pixelsPerUnitMultiplier: number) => 108 / pixelsPerUnitMultiplier;

export const R = {
  /** `Cashout Retry/Rebet` ("Retry" button). ppum 8. */
  retryButton: slice9(8), // 13.5
  /** `Insufficient Funds Panel/Image` (card). ppum 3. */
  insufficientCard: slice9(3), // 36
  /** `Insufficient Funds Panel/Button`. ppum 4. */
  insufficientClose: slice9(4), // 27
  /** `Unexpected Error Display/Button` (Relaunch). ppum 8. */
  relaunchButton: slice9(8), // 13.5
  /** `Notification Panel`. ppum 10. */
  notification: slice9(10), // 10.8
  /** Keypad body / display / input / keys. ppum 4. */
  keypad: slice9(4), // 27
  /** Keypad row containers + backspace. ppum 6. */
  keypadRow: slice9(6), // 18
} as const;

/* ------------------------------------------------------------------ layout */

/**
 * `Game Panel/NavPanel` — the top chrome. The panel node itself bleeds to
 * [-216, 1296] (1512 wide) because it's a stretch child of the scene's
 * 100x100 `Game Panel` anchor node rather than the real canvas — see
 * "Visual fidelity" in the README — but every actual child below sits
 * safely inside the visible 0..1080 page.
 */
export const NAV = {
  /** `logo` — frame `mobile-8`, the "Coin & Toss" bubble title, 1:1. */
  logo: { x: 26.85, y: 222.36, w: 274.3, h: 158.6 },
  /** `Bal Panel` — frame `mobile-1`. */
  balPanel: { x: 515.56, y: 210.58, w: 572.88, h: 182.16 },
  balLabel: { x: 584.56, y: 265.96, w: 208.46, h: 27, fs: 24.15 },
  currency: { x: 561.56, y: 285.46, w: 80.84, h: 64, fs: 35 },
  /** `Bal Panel/Currency/Panel/Text (TMP)` — the balance value itself; the
   * `Panel` it sits in has `Image.m_Enabled: false` (no plate). */
  value: { x: 643.56, y: 285.46, w: 208, h: 64, fs: 35 },
  /** `line` — frame `mobile-4`, a 3.5x60 divider. */
  divider: { x: 853.48, y: 271.66, w: 3.5, h: 60 },
  /** `bal (1)` — a static "PHONE\nMODE" label; kept as literal decorative
   * text (no live device-mode concept in this port). */
  mode: { x: 870.05, y: 288.16, w: 75.91, h: 27, fs: 18 },
  /** `MenuButton` — frame `mobile-6`, the single hamburger trigger. Its
   * `HamburgerMenu` glyph is frame `mobile-7`. Unlike the sibling ports,
   * NavPanel has no separate Help/Bet-History icon buttons — both live
   * inside the `MenuPanel` drawer this button opens (see MENU below). */
  menuButton: { x: 962.24, y: 275.61, w: 55.9, h: 48.1 },
  menuGlyph: { x: 975.24, y: 289.91, w: 29.9, h: 19.5 },
} as const;

/**
 * `Game Panel/Game View` — a `RawImage` of `GameView.renderTexture`,
 * rendered by an orthographic `Camera` (`orthographicSize: 8`, transparent
 * clear) framing the 3D `Coin` mesh (`Animator` states `idle`/`load`/
 * `head`/`tail`/`side`, matching `Coin.controller`) plus a background
 * `Square` sprite. The `SpriteRenderer` sprite on `Square` isn't resolved by
 * this extraction (it only decodes UI `Image`/`RawImage`, not arbitrary 3D
 * `SpriteRenderer`s) — see "What could not be matched exactly" in the
 * README; the existing `coin-toss-bg.png`/`coin-toss-bg-wide.png` art from
 * the initial build is reused for it.
 */
export const COIN_VIEWPORT = { x: 140, y: 548.664, w: 800, h: 800 } as const;

/**
 * `Interactive Pane` is a *stretch* child (`anchorMin/Max: (0,0)-(1,1)`) of
 * the scene's `Game Panel`, which is itself only a 100x100 positioning
 * anchor — not the real Canvas. Working through Unity's own stretch-rect
 * algebra, a stretch child's local offset from its parent's rect-min is
 * `anchoredPosition - 0.5*sizeDelta`, a constant **independent of the
 * parent's actual width**. So this whole subtree (`Interactive Pane` →
 * `BetPanel`/`ResultsPanel`/`Cashout Retry` and everything inside them) is
 * *always* 1360.8px wide — wider than the 1080 canvas on any device — with
 * whatever `Game Panel`'s live width happens to be (driven by the
 * `DynamicUiManager` script attached to the neighbouring `Responsive` node)
 * only sliding the -216/+64.8 split left or right, never fixing it. Static
 * extraction can't recover that runtime width, so this port makes the one
 * defensible choice: split the unavoidable 280.8px overflow evenly (140.4
 * each side) instead of reproducing the scene file's asymmetric -216/+64.8,
 * which is what actually clipped the left-most quick-bet chip. That's a
 * uniform **+75.6px** correction, applied once here to every rect that
 * descends from `Interactive Pane`'s coordinate space (`STAKE_FIELD`,
 * `CHIPS`, `CHOICE`, `RESULTS`, `CASHOUT_RETRY`) so they all stay mutually
 * aligned. See README, "What could not be matched exactly".
 */
const IP_X = 75.6;

/**
 * `Interactive Pane/BetPanel` — stake entry + quick-bet chips + the
 * Heads/Tails choice buttons. `Interactive Pane` itself has
 * `Image.m_Enabled: false` (no plate).
 */
export const STAKE_FIELD = {
  /** `ManualStakeInputField` — frame `mobile-10`. */
  field: { x: 117 + IP_X, y: 1345.46, w: 694.8, h: 127.8 },
  /** `Addition Button` — frame `mobile-11` (round plate) + `mobile-13`
   * (plus glyph) at its own inset rect. */
  increase: { x: 666.9 + IP_X, y: 1305.86, w: 207, h: 207 },
  increaseGlyph: { x: 729.9 + IP_X, y: 1364.36, w: 81, h: 90 },
  /** `Subtraction Button` — `mobile-11` + `mobile-12` (minus glyph). */
  decrease: { x: 54.9 + IP_X, y: 1305.86, w: 207, h: 207 },
  decreaseGlyph: { x: 113.4 + IP_X, y: 1377.86, w: 90, h: 63 },
  /** `minimum`/`maximum` — the scene's own rects put these in two
   * *overlapping* 540-wide boxes (left-aligned min / right-aligned max)
   * relying on Unity's shorter rendered text to keep them apart; at this
   * port's font metrics that overlap collided into unreadable glued text,
   * so the two boxes are split at the field's midpoint instead — still
   * left-aligned min / right-aligned max, just non-overlapping. */
  minimum: { x: 117 + IP_X, y: 1505.66, w: 694.8 / 2, h: 86.4, fs: 48 },
  maximum: { x: 117 + IP_X + 694.8 / 2, y: 1505.66, w: 694.8 / 2, h: 86.4, fs: 48 },
} as const;

/**
 * `BetPanel/QuickBet` — `VerticalLayoutGroup` (padding top 64, spacing 64,
 * `childControlHeight: false`, so each row keeps its own authored height of
 * 90.49) holding two `HorizontalLayoutGroup` rows of 4 chips each (spacing
 * 32, `childControlWidth: true` — the rows stretch to `QuickBet`'s own
 * resolved width of 1022.47). Row/chip rects below are the exact Unity
 * layout-group formula, since the children's own serialised rects are
 * runtime-computed placeholders (`0`) in the scene file.
 */
const QUICKBET_RECT = { x: -46.836 + IP_X, y: 1571.36, w: 1022.47 };
const QUICKBET_ROW_H = 90.49;
const QUICKBET_ROW_SPACING = 64;
const QUICKBET_CHIP_SPACING = 32;
export const CHIPS = {
  rowX: QUICKBET_RECT.x,
  rowW: QUICKBET_RECT.w,
  rowH: QUICKBET_ROW_H,
  firstRowY: QUICKBET_RECT.y + 64, // + VerticalLayoutGroup padding.top
  secondRowY: QUICKBET_RECT.y + 64 + QUICKBET_ROW_H + QUICKBET_ROW_SPACING,
  spacing: QUICKBET_CHIP_SPACING,
  /** (rowW - 3*spacing) / 4 children. */
  w: (QUICKBET_RECT.w - 3 * QUICKBET_CHIP_SPACING) / 4, // 231.6175
  fs: 54,
} as const;

/**
 * `BetPanel/ChoicePanel` — `HorizontalLayoutGroup` (spacing 76.4, both
 * control/expand flags true), the container's own rect IS resolved
 * (unlike its children), so the two 473.035-wide buttons are derived from
 * it directly. Frame `mobile-15` (Heads, blue) / `mobile-16` (Tails, gold).
 * Each button's nested labels ("Pays 2x" small text above "HEAD"/"TAIL")
 * serialise with corrupted rects (negative width/height — a
 * `HorizontalLayoutGroup`-driven placeholder) so their y-split is a
 * reasonable reconstruction from the one legible absolute value
 * (`Pays 2x` at y=2047.75, i.e. 24% down from the button's own top),
 * flagged here rather than silently invented.
 */
const CHOICE_RECT = { x: -46.836 + IP_X, y: 1923.26, w: 1022.47, h: 230.4 };
const CHOICE_SPACING = 76.4;
export const CHOICE = {
  y: CHOICE_RECT.y,
  h: CHOICE_RECT.h,
  w: (CHOICE_RECT.w - CHOICE_SPACING) / 2, // 473.035
  headsX: CHOICE_RECT.x,
  tailsX: CHOICE_RECT.x + (CHOICE_RECT.w - CHOICE_SPACING) / 2 + CHOICE_SPACING,
  payFs: 35,
  payDy: 0.24, // fraction of h
  labelFs: 79,
  labelDy: 0.56, // fraction of h
} as const;

/**
 * `ResultsPanel` — win/loss reveal. All rects here are fully resolved
 * (no layout group involved).
 */
export const RESULTS = {
  /** `Image` — `win-art.png`, the trophy badge. `UIManager.OnWin`/`OnLoss`
   * (`UIManager.cs:71-90`) show it on a win only — the scene's static rect
   * is always-active, but the runtime script gates it, so this port shows
   * it conditionally too rather than always drawing a trophy on a loss. */
  trophy: { x: 234 + IP_X, y: 1043.51, w: 460.8, h: 460.8 },
  resultText: { x: 194.4 + IP_X, y: 1504.31, w: 540, h: 115.2, fs: 96 },
  detailText: { x: -158.4 + IP_X, y: 1639.31, w: 1245.6, h: 45, fs: 54 },
  rebet: { x: -42.55 + IP_X, y: 1817.6, w: 466.26, h: 123.48, fs: 54 },
  newRound: { x: 505.59 + IP_X, y: 1817.6, w: 465.7, h: 123.48, fs: 54 },
} as const;

/** `Cashout Retry` — shown when a post-round re-authenticate call fails.
 * Relabelled "Retry" here (the button is literally named `Rebet` in the
 * scene but reads "Retry" per its TMP text). */
export const CASHOUT_RETRY = {
  message: { x: -158.4 + IP_X, y: 1406.21, w: 1245.6, h: 115.2, fs: 40 },
  button: { x: 216 + IP_X, y: 1800.86, w: 496.8, h: 135, fs: 54 },
} as const;

/**
 * `MenuPanel` — a near-full-bleed translucent purple overlay (not a
 * slide-in side drawer like the sibling ports), opened by NavPanel's single
 * `MenuButton`. Three rows on a 240px pitch: `About Button` ("How To Play",
 * opens Help), `BetHistoryButton` ("Bet History"), `unmute`/`mute` (a
 * Sound toggle — two full alternate-state GameObjects in the scene,
 * reproduced here as one row that swaps icon/label locally).
 */
export const MENU = {
  scrimAlpha: 0.6314,
  close: { x: 812.4, y: 168.66, w: 128, h: 128 },
  closeGlyph: { x: 844.4, y: 200.66, w: 64, h: 64 },
  rowX: -66,
  rowW: 1058.4,
  rowH: 150,
  firstRowY: 348.66,
  rowPitch: 240,
  iconX: 18,
  iconSize: 84,
  iconDy: 33, // offset from row top
  lineX: 18,
  lineW: 890.4,
  lineDy: 146, // offset from row top
  textX: 138,
  textW: 480,
  textFs: 64,
  textDy: 43, // offset from row top
  arrowX: 860.4,
  arrowSize: 48,
  arrowDy: 51, // offset from row top
} as const;

/** `Insufficient Funds Panel` — `VirtualCashManager.CheckBalance`. */
export const INSUFFICIENT = {
  card: { x: 60, y: 1032.66, w: 960, h: 600 },
  header: { x: -17, y: 1032.66, w: 1114, h: 196, fs: 84 },
  body: { x: 180, y: 1182.66, w: 720, h: 300, fs: 64 },
  close: { x: 124, y: 1472.66, w: 832, h: 128, fs: 64 },
} as const;

/**
 * `Unexpected Error Display` — the fatal-boot-error screen. (The scene also
 * has a bright-green-bordered `ErrorPanel` debug leftover with a raw HTTP
 * status dump; that one reads as a programmer debug overlay, not shipped
 * UI, so this — the actually-designed error screen — is what's ported.)
 */
export const ERROR = {
  icon: { x: 444, y: 507.66, w: 192, h: 192 },
  header: { x: 90, y: 725.66, w: 900, h: 84, fs: 53.8 },
  body: { x: 90, y: 827.66, w: 900, h: 180, fs: 54 },
  button: { x: 120, y: 1599.66, w: 840, h: 128, fs: 54 },
} as const;

/** `Notification Panel` — a red toast, `GUI Rounded Edge Button.png` @
 * ppum 10 (radius 10.8). */
export const TOAST = {
  panel: { x: -60, y: 157.66, w: 1200, h: 128 },
  text: { x: -44, y: 165.66, w: 1168, h: 112, fs: 54 },
} as const;

/**
 * `Loading Display bkp` — the 8-dot circular boot spinner (the scene's
 * other candidate, `Loading Display`, is just a single static image with no
 * per-dot geometry). `Holder` is 256x256 centred at design x=540 (canvas
 * centre).
 */
export const LOADING = {
  holder: { x: 412, y: 1204.66, w: 256, h: 256 },
  dotSize: 24,
  dots: [
    { x: 528, y: 1230.66 },
    { x: 588, y: 1260.66 },
    { x: 618, y: 1320.66 },
    { x: 588, y: 1380.66 },
    { x: 528, y: 1410.66 },
    { x: 468, y: 1380.66 },
    { x: 438, y: 1320.66 },
    { x: 468, y: 1260.66 },
  ],
} as const;

/**
 * `Bet History` — a full-screen panel (`#2F1D52` backdrop), not a modal
 * card like the sibling ports. Header + close + prev/next arrows are
 * resolved directly; rows are instantiated at runtime from a prefab (not
 * authored in the scene) so they inherit the header's column x-positions
 * and a reasonable row pitch, per the same convention used for the other
 * ports' runtime-instantiated lists.
 */
export const BET_HISTORY = {
  header: { x: 90, y: 128, w: 900, h: 64, fs: 64 },
  back: { x: 32, y: 105, w: 128, h: 128 },
  backGlyph: { x: 64, y: 137, w: 64, h: 64 },
  prev: { x: 32, y: 1106, w: 128, h: 128 },
  next: { x: 920, y: 1106, w: 128, h: 128 },
  scroll: { x: 0, y: 300, w: 1080, h: 2040 },
  /** `No Bet to Display` empty state. */
  emptyCard: { x: 90, y: 720, w: 900, h: 900 },
  emptyBug: { x: 476, y: 978, w: 128, h: 128 },
  emptyTitle: { x: 240, y: 1202, w: 600, h: 64, fs: 72 },
  emptySubtitle: { x: 90, y: 1342, w: 900, h: 128, fs: 48 },
  /** Row geometry (not authored — reasonable reconstruction): full content
   * width, generous row height for the date/status/stake/outcome/pay
   * columns this port's `BetRecordData` actually carries. */
  rowH: 96,
  rowFs: 32,
  rowPitch: 112,
} as const;

/**
 * `About` — "How To Play" content, reused for `HelpModal` (the scene's own
 * `aboutPage`/help-onboarding content is one shared static copy block, per
 * the game-logic layer's earlier documented decision to consolidate).
 */
export const HELP = {
  header: { x: 90, y: 126.85, w: 900, h: 128, fs: 84 },
  back: { x: 780, y: 127.85, w: 128, h: 128 },
  backGlyph: { x: 812, y: 159.85, w: 64, h: 64 },
  contentTop: 260,
  padX: 90,
  bodyFs: 40,
  bodyW: 900,
} as const;

/** `CustomKeypad` (prefab) — authored on a 1080x2340 canvas already (unlike
 * the sibling ports' 1080x1920 keypad prefab), so no re-centring offset is
 * needed. */
export const KEYPAD = {
  scrim: { x: -216, y: -11.34, w: 1512, h: 2688 },
  body: { x: -64.8, y: 660.66, w: 1209.6, h: 1344 },
  display: { x: 63.2, y: 795.06, w: 953.6, h: 201.6 },
  input: { x: 71.2, y: 803.06, w: 937.6, h: 185.6 },
  inputText: { x: 135.2, y: 819.06, w: 575.2, h: 153.6, fs: 36 },
  backspace: { x: 774.4, y: 803.06, w: 234.4, h: 185.6 },
  backspaceGlyph: { x: 827.6, y: 831.86, w: 128, h: 128, fs: 72 },
  rowTops: [1052.98, 1227.7, 1402.42, 1577.14],
  keyLefts: [63.2, 392.14, 721.09],
  keyW: 296.94,
  keyH: 142.72,
  keyFs: 72,
  save: { x: 63.2, y: 1767.86, w: 953.6, h: 172.8, fs: 72 },
  close: { x: 1023.84, y: 660.66, w: 120.96, h: 134.4, fs: 72 },
  dot: { x: 861.56, y: 1640.5, w: 16, h: 16 },
} as const;

/** `PortraitOrientationWarning` — the one real orientation overlay of the
 * three sibling games (spec-confirmed live, per the game-logic layer's
 * earlier documented decision). */
export const ORIENTATION = {
  icon: { x: 476, y: 1106, w: 128, h: 128 },
  text: { x: 190, y: 1470, w: 700, h: 90, fs: 24 },
} as const;
