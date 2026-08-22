
import { useDesign } from "../ui/DesignContext";
const BASE = import.meta.env.BASE_URL;

/**
 * The `Loading Screen.unity` scene is confirmed excluded from the actual
 * build config (spec §0 — `EditorBuildSettings.asset` has it `enabled: 0`),
 * so this isn't a separate route; it's just what renders while `boot()`
 * hasn't reached `phase: "ready"` yet. The 8-dot circular spinner geometry
 * is `Loading Display bkp`'s `Holder`/`dot (0..7)` layout — the scene's
 * other loading candidate, `Loading Display`, is just one static image with
 * no per-dot positions to reproduce.
 */
export function LoadingScreen() {
  const { LOADING } = useDesign();
  return (
    <>
      <img
        src={`${BASE}assets/ui/logo.png`}
        alt="Coin & Toss"
        style={{ position: "absolute", left: 340, top: 900, width: 400, height: 231 }}
      />
      <div className="node" style={{ left: LOADING.holder.x, top: LOADING.holder.y, width: LOADING.holder.w, height: LOADING.holder.h }}>
        {LOADING.dots.map((d, i) => (
          <span
            key={i}
            className="loading-dot"
            style={{
              position: "absolute",
              left: d.x - LOADING.holder.x,
              top: d.y - LOADING.holder.y,
              width: LOADING.dotSize,
              height: LOADING.dotSize,
              animationDelay: `${i * 0.1}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}
