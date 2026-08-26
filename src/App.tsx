import { useEffect, useState } from "react";
import { useGameSession } from "./state/useGameSession";
import { useLanguage } from "./i18n/LanguageContext";
import { getLaunchParams } from "./api/urlParams";
import { Stage } from "./ui/Stage";
import { DesignProvider, useDesign } from "./ui/DesignContext";
import { useResponsiveLayout } from "./hooks/useResponsiveLayout";
import { ui } from "./ui/design";
import { ErrorScreen } from "./components/ErrorScreen";
import { TopBar } from "./components/TopBar";
import { CoinStage, type CoinAnim } from "./components/CoinStage";
import { BetPanel } from "./components/BetPanel";
import { NotificationToast } from "./components/NotificationToast";
import { InsufficientFundsModal } from "./components/InsufficientFundsModal";
import { CashoutRetryModal } from "./components/CashoutRetryModal";
import { HelpModal } from "./components/HelpModal";
import { MenuPanel } from "./components/MenuPanel";
import { BetHistoryPanel } from "./components/BetHistoryPanel";
import { CustomizationProvider } from "./components/Customizable";
import { ShacksLoadingScreen } from "./loading/ShacksLoadingScreen";
import { useAssetPreload } from "./loading/useAssetPreload";

/**
 * Which `Coin.controller` Animator state the coin renders in.
 *
 * `settledOutcome` is checked BEFORE `busy` on purpose. A round resolving runs
 * a post-flip re-authenticate (`busy: true`) and then auto-resets to the bet
 * controls; if `busy` won, the coin would spin back to `load` for the duration
 * of that resync and then snap to the face — a visible flicker right at the
 * reveal. Resting on the settled face through the whole tail of the round is
 * both calmer and what "leave the coin on the previous outcome" asks for.
 * `chooseAndBet` clears `settledOutcome`, so the next round still spins.
 */
function computeAnim(
  busy: boolean,
  isFlipping: boolean,
  flipOutcome: string | null,
  settledOutcome: string | null,
): CoinAnim {
  if (isFlipping && flipOutcome) return flipOutcome as CoinAnim;
  if (settledOutcome) return settledOutcome as CoinAnim;
  if (busy) return "load";
  return "idle";
}

/**
 * The `Canvas` root, in its z-order (see `hierarchy` in the extraction):
 * `background` (frame mobile-19, full-bleed) is drawn first, then
 * `Game Panel` (NavPanel/GameView/BetPanel/
 * CashoutRetry/MenuPanel — all the live gameplay chrome), then the
 * top-level overlays (`Bet History`, `About`/Help), each of which is a
 * full-screen sibling of `Game Panel`, not
 * nested inside it.
 */
/**
 * Unity swaps whole scenes on device type (`DynamicUiManager`:
 * `Screen.width < Screen.height` => the Mobile scene, else the Desktop one).
 * The provider picks the matching token set; everything below reads it through
 * `useDesign()`, so one component tree renders either scene.
 */
export default function App() {
  const { isPortrait } = useResponsiveLayout();
  return (
    <DesignProvider isDesktop={!isPortrait}>
      <Game />
    </DesignProvider>
  );
}

function Game() {
  const { canvas, BACKDROP, LAYOUT } = useDesign();
  const { state, actions } = useGameSession();
  const { boot: bootLanguage } = useLanguage();

  const [menuVisible, setMenuVisible] = useState(false);
  const [betHistoryVisible, setBetHistoryVisible] = useState(false);

  // `Loading Display` stood in for the excluded `Loading Screen.unity`; the
  // studio screen replaces it and additionally waits on the coin art.
  const { progress, done: bootDone } = useAssetPreload(state.phase !== "booting");

  useEffect(() => {
    const { language } = getLaunchParams();
    void bootLanguage(language);
    // Runs once at mount, independently of and in parallel with auth (spec §1
    // step 2 / §6) — deliberately not awaited or gated on `state.phase`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hidden only while a bet is in flight. There is no results panel to defer to
  // any more — a resolved round auto-resets `hasMadeABet`, which brings the bet
  // controls straight back.
  const showBetPanel = !state.hasMadeABet;

  return (
    <CustomizationProvider customData={state.customization}>
      <Stage spec={canvas}>
        {/* z 1 — `background`: frame mobile-19. This illustrated altar scene is
         * the design's ground; there is no gradient anywhere in the scene.
         *
         * Position/size come from `.stage-backdrop` rather than inline styles:
         * the scene's literal [0,0,1080x2340] rect is the reference box, but the
         * VISIBLE canvas is usually wider than that, which left unpainted black
         * bars down both sides on real phones. The class stretches it over
         * `--canvas-w`/`--canvas-h` with `object-fit: cover` instead. */}
        <img
          className="spr stage-backdrop"
          src={ui(BACKDROP.sprite)}
          alt=""
          width={BACKDROP.rect.w}
          height={BACKDROP.rect.h}
          decoding="sync"
          loading="eager"
        />

        {!bootDone && state.phase !== "fatal-error" && <ShacksLoadingScreen progress={progress} />}
        {state.phase === "fatal-error" && <ErrorScreen message={state.fatalError ?? ""} />}

        {state.phase === "ready" && (
          <>
            {/* z 2 — `Game Panel`.
                Its children are laid out in a 1512x2688 bleed box, so the whole
                subtree is recentred on the canvas once here (`LAYOUT.gameD*`)
                rather than by editing each rect. Only the horizontal half of
                that recentre had been applied, which left every element in
                here — the header most visibly — 162.66px too low on Mobile.
                Desktop's offset is (0,0). The Canvas-level siblings below
                (Bet History / Help) are NOT in this layer. */}
            <div
              className="node"
              style={{
                left: 0,
                top: 0,
                width: "100%",
                height: "100%",
                transform: `translate(${LAYOUT.gameDx}px, ${LAYOUT.gameDy}px)`,
              }}
            >
            <TopBar currency={state.currency} balance={state.balance} onMenu={() => setMenuVisible(true)} />

            <CoinStage anim={computeAnim(state.busy, state.isFlipping, state.flipOutcome, state.settledOutcome)} />

            {showBetPanel && (
              <BetPanel
                currency={state.currency}
                minimum={state.minimum}
                maximum={state.maximum}
                stake={state.stake}
                stakeText={state.stakeText}
                quickBetValues={state.quickBetValues}
                busy={state.busy}
                onStakeText={actions.setStakeText}
                onCommitStake={actions.commitStake}
                onAddChip={actions.addChip}
              onStepStake={actions.stepStake}
                onChoose={actions.chooseAndBet}
              />
            )}

            <CashoutRetryModal
              visible={state.cashoutRetryVisible}
              message={state.cashoutRetryMessage}
              onRetry={actions.retryReAuthenticate}
            />

            <InsufficientFundsModal
              visible={state.insufficientFundsVisible}
              onClose={actions.dismissInsufficientFunds}
            />

            <MenuPanel
              visible={menuVisible}
              onClose={() => setMenuVisible(false)}
              onHelp={actions.toggleHelp}
              onBetHistory={() => {
                setBetHistoryVisible(true);
                actions.refreshBetHistory(1);
              }}
            />

            </div>

            {/* Toasts sit OUTSIDE the `Game Panel` transform layer: that layer
                is shifted by `LAYOUT.gameDy` (-162.66 on Mobile), which pulled the
                scene's own y=157.66 panel up to ~-5 and clipped it off the top of
                the screen. As a floating overlay its y is now plain canvas space. */}
            <NotificationToast notification={state.notification} />

            {/* z 3-6 — top-level Canvas siblings of `Game Panel`. */}
            <BetHistoryPanel
              visible={betHistoryVisible}
              history={state.betHistory}
              pagination={state.betHistoryPagination}
              loading={state.betHistoryLoading}
              currency={state.currency}
              onClose={() => setBetHistoryVisible(false)}
              onPageChange={actions.refreshBetHistory}
            />

            <HelpModal visible={state.helpVisible} oddsOne={state.oddsOne} onClose={actions.toggleHelp} />
          </>
        )}
      </Stage>
    </CustomizationProvider>
  );
}
