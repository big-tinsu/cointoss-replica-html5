const BASE = import.meta.env.BASE_URL;

/**
 * The `Loading Screen.unity` scene is confirmed excluded from the actual
 * build config (spec §0 — `EditorBuildSettings.asset` has it `enabled: 0`),
 * so this isn't a separate route; it's just what renders while `boot()`
 * hasn't reached `phase: "ready"` yet.
 */
export function LoadingScreen() {
  return (
    <div className="loading-screen">
      <img src={`${BASE}assets/img/shacksevobanner.png`} alt="Shacks Evolution" className="loading-logo" />
      <div className="loading-spinner" aria-label="Loading">
        <span />
        <span />
        <span />
      </div>
    </div>
  );
}
