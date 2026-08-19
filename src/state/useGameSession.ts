import { useEffect, useRef, useSyncExternalStore } from "react";
import type { PlayerSelection } from "../api/types";
import { GameEngine, type GameSnapshot } from "./gameEngine";

export interface GameSession {
  state: GameSnapshot;
  actions: {
    chooseAndBet: (choice: PlayerSelection) => void;
    setStakeText: (raw: string) => void;
    commitStake: () => void;
    addChip: (amount: number) => void;
    rebet: () => void;
    newRound: () => void;
    dismissInsufficientFunds: () => void;
    retryReAuthenticate: () => void;
    toggleHelp: () => void;
    refreshBetHistory: (page: number) => void;
  };
}

/** One `GameEngine` per app lifetime, exposed to React via
 * `useSyncExternalStore` so every subscribed component re-renders exactly
 * when the snapshot actually changes — no prop drilling, no context needed
 * for the hot game-loop state. */
export function useGameSession(): GameSession {
  const engineRef = useRef<GameEngine | null>(null);
  if (!engineRef.current) engineRef.current = new GameEngine();
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
    rebet: () => engine.rebet(),
    newRound: () => engine.newRound(),
    dismissInsufficientFunds: () => engine.dismissInsufficientFunds(),
    retryReAuthenticate: () => engine.retryReAuthenticate(),
    toggleHelp: () => engine.toggleHelp(),
    refreshBetHistory: (page) => void engine.refreshBetHistory(page),
  });

  return { state, actions: actionsRef.current };
}
