import { assetUrl } from "../assetUrl";
import "./shacks-loading.css";

interface ShacksLoadingScreenProps {
  /** 0-100. Driven by `useAssetPreload` — the asset queue plus the game's
   * own boot handshake, so the bar tracks real work, not a timer. */
  progress?: number;
}

/**
 * The Shacks Evolution studio boot screen, shared by every replica.
 *
 * It sits over everything while `useAssetPreload` warms `public/` into the
 * browser cache, so the game's first frame draws with its art already
 * decoded instead of popping in sprite by sprite.
 */
export function ShacksLoadingScreen({ progress = 0 }: ShacksLoadingScreenProps) {
  const pct = Math.max(0, Math.min(100, Math.round(progress)));
  const text =
    pct < 50
      ? "Loading assets..."
      : pct < 75
        ? "Almost ready..."
        : pct < 100
          ? "Starting..."
          : "Ready";

  return (
    <div className="shacks-loading-screen">
      <img
        src={assetUrl("loading-screen/shacks-logo.png")}
        alt="Shacks Evolution Studios"
        className="shacks-company-logo"
      />

      <div className="shacks-loading-bar">
        <div className="shacks-loading-progress" style={{ width: `${pct}%` }} />
      </div>

      <p className="shacks-loading-message">{text}</p>
    </div>
  );
}
