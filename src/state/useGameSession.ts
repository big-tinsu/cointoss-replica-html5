import { useEffect, useRef, useSyncExternalStore } from "react";
import { INTEGRATION } from "../api/integration";
import { GameEngine } from "./gameEngine";
import { PartnerGameEngine } from "./partnerGameEngine";
import type { GameEngineLike, GameSession } from "./sessionContract";

export type { GameSession } from "./sessionContract";

/**
 * Builds the engine for the integration this bundle was built for.
 *
 * Both classes satisfy `GameEngineLike` and produce the identical
 * `GameSnapshot`, so everything above this line is integration-agnostic —
 * flipping `VITE_INTEGRATION` swaps the entire backend contract without a
 * single component changing. `INTEGRATION` is a build-time constant, so the
 * unused engine and its client are tree-shaken out of the bundle.
 */
function createEngine(): GameEngineLike {
  return INTEGRATION === "aggregator" ? new GameEngine() : new PartnerGameEngine();
}

/** One engine per app lifetime, exposed to React via `useSyncExternalStore` so
 * every subscribed component re-renders exactly when the snapshot actually
 * changes — no prop drilling, no context needed for the hot game-loop state. */
export function useGameSession(): GameSession {
  const engineRef = useRef<GameEngineLike | null>(null);
  if (!engineRef.current) engineRef.current = createEngine();
  const engine = engineRef.current;

  const state = useSyncExternalStore(engine.subscribe, engine.getSnapshot);

  useEffect(() => {
    void engine.boot();
  }, [engine]);

  const actionsRef = useRef<GameSession["actions"]>({
    chooseAndBet: (choice) => void engine.chooseAndBet(choice),
    setStakeText: (raw) => engine.setStakeText(raw),
    commitStake: () => engine.commitStake(),
    addChip: (amount) => engine.addChip(amount),
    stepStake: (delta) => engine.stepStake(delta),
    dismissInsufficientFunds: () => engine.dismissInsufficientFunds(),
    retryReAuthenticate: () => engine.retryReAuthenticate(),
    toggleHelp: () => engine.toggleHelp(),
    refreshBetHistory: (page) => void engine.refreshBetHistory(page),
  });

  return { state, actions: actionsRef.current };
}
