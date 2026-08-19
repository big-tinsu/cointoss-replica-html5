import { useEffect, useState } from "react";
import { useGameSession } from "./state/useGameSession";
import { useResponsiveLayout } from "./hooks/useResponsiveLayout";
import { useLanguage } from "./i18n/LanguageContext";
import { getLaunchParams } from "./api/urlParams";
import { LoadingScreen } from "./components/LoadingScreen";
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

function computeAnim(busy: boolean, isFlipping: boolean, flipOutcome: string | null): CoinAnim {
  if (isFlipping && flipOutcome) return flipOutcome as CoinAnim;
  if (busy) return "load";
  return "idle";
}

export default function App() {
  const { state, actions } = useGameSession();
  const { boot: bootLanguage } = useLanguage();
  const { isPortrait } = useResponsiveLayout();
  const [betHistoryVisible, setBetHistoryVisible] = useState(false);
  const [menuVisible, setMenuVisible] = useState(false);

  useEffect(() => {
    const { language } = getLaunchParams();
    void bootLanguage(language);
    // Runs once at mount, independently of and in parallel with auth (spec §1
    // step 2 / §6) — deliberately not awaited or gated on `state.phase`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.phase === "booting") return <LoadingScreen />;
  if (state.phase === "fatal-error") return <ErrorScreen message={state.fatalError ?? ""} />;

  const showBetPanel = !state.hasMadeABet && !state.resultsVisible;

  return (
    <CustomizationProvider customData={state.customization}>
      <div className={`game-shell ${isPortrait ? "layout-portrait" : "layout-landscape"}`}>
        <TopBar
          currency={state.currency}
          balance={state.balance}
          onHelp={actions.toggleHelp}
          onMenu={() => setMenuVisible(true)}
          onBetHistory={() => {
            setBetHistoryVisible(true);
            actions.refreshBetHistory(1);
          }}
        />

        <Ticker currency={state.currency} />

        <main className="game-main">
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
              isMobileLayout={isPortrait}
              onStakeText={actions.setStakeText}
              onCommitStake={actions.commitStake}
              onAddChip={actions.addChip}
              onChoose={actions.chooseAndBet}
            />
          )}
        </main>

        <NotificationToast notification={state.notification} />

        <ResultsPanel
          visible={state.resultsVisible}
          result={state.lastResult}
          currency={state.currency}
          onRebet={actions.rebet}
          onNewRound={actions.newRound}
        />

        <InsufficientFundsModal
          visible={state.insufficientFundsVisible}
          onClose={actions.dismissInsufficientFunds}
        />
        <CashoutRetryModal
          visible={state.cashoutRetryVisible}
          message={state.cashoutRetryMessage}
          onRetry={actions.retryReAuthenticate}
        />
        <HelpModal visible={state.helpVisible} oddsOne={state.oddsOne} onClose={actions.toggleHelp} />
        <MenuPanel visible={menuVisible} onClose={() => setMenuVisible(false)} />
        <BetHistoryPanel
          visible={betHistoryVisible}
          history={state.betHistory}
          pagination={state.betHistoryPagination}
          loading={state.betHistoryLoading}
          currency={state.currency}
          onClose={() => setBetHistoryVisible(false)}
          onPageChange={actions.refreshBetHistory}
        />

        <OrientationOverlay />
      </div>
    </CustomizationProvider>
  );
}
