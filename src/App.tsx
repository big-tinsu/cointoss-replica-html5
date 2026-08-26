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
import { ResultsPanel } from "./components/ResultsPanel";
import { Ticker } from "./components/Ticker";
import { NotificationToast } from "./components/NotificationToast";
import { InsufficientFundsModal } from "./components/InsufficientFundsModal";
import { CashoutRetryModal } from "./components/CashoutRetryModal";
import { HelpModal } from "./components/HelpModal";
import { MenuPanel } from "./components/MenuPanel";
import { BetHistoryPanel } from "./components/BetHistoryPanel";
import { OrientationOverlay } from "./components/OrientationOverlay";
import { CustomizationProvider } from "./components/Customizable";
import { ShacksLoadingScreen } from "./loading/ShacksLoadingScreen";
import { useAssetPreload } from "./loading/useAssetPreload";

function computeAnim(busy: boolean, isFlipping: boolean, flipOutcome: string | null): CoinAnim {
  if (isFlipping && flipOutcome) return flipOutcome as CoinAnim;
  if (busy) return "load";
  return "idle";
}

/**
 * The `Canvas` root, in its z-order (see `hierarchy` in the extraction):
 * `background` (frame mobile-19, full-bleed) is drawn first, then
 * `Game Panel` (NavPanel/Ticker/GameView/BetPanel/ResultsPanel/
 * CashoutRetry/MenuPanel — all the live gameplay chrome), then the
 * top-level overlays (`Bet History`, `About`/Help, `PortraitOrientation
 * Warning`) each of which is a full-screen sibling of `Game Panel`, not
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
  const { canvas, BACKDROP, SCENE, LAYOUT } = useDesign();
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

  const showBetPanel = !state.hasMadeABet && !state.resultsVisible;

  return (
    <CustomizationProvider customData={state.customization}>
      <Stage spec={canvas}>
        {/* z 1 — `background`: frame mobile-19 stretched to the full
         * 1080x2340 canvas rect. This illustrated altar scene is the
         * design's ground; there is no gradient anywhere in the scene. */}
        <img
          className="spr stage-backdrop"
          src={ui(BACKDROP.sprite)}
          alt=""
          width={BACKDROP.rect.w}
          height={BACKDROP.rect.h}
          style={{ position: "absolute", left: BACKDROP.rect.x, top: BACKDROP.rect.y, width: BACKDROP.rect.w, height: BACKDROP.rect.h }}
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
                (Bet History / Help / orientation) are NOT in this layer. */}
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
            {SCENE.showTicker && <Ticker currency={state.currency} />}

            <CoinStage anim={computeAnim(state.busy, state.isFlipping, state.flipOutcome)} />

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

            <ResultsPanel
              visible={state.resultsVisible}
              result={state.lastResult}
              currency={state.currency}
              onRebet={actions.rebet}
              onNewRound={actions.newRound}
            />

            <CashoutRetryModal
              visible={state.cashoutRetryVisible}
              message={state.cashoutRetryMessage}
              onRetry={actions.retryReAuthenticate}
            />

            <InsufficientFundsModal
              visible={state.insufficientFundsVisible}
              onClose={actions.dismissInsufficientFunds}
            />

            <NotificationToast notification={state.notification} />

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

            <OrientationOverlay />
          </>
        )}
      </Stage>
    </CustomizationProvider>
  );
}
