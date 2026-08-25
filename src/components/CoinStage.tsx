import { img } from "../ui/design";

import { useDesign } from "../ui/DesignContext";

export type CoinAnim = "idle" | "load" | "head" | "tail" | "side";

/**
 * `Game Panel/Game View` (spec §7/§8) — a `RawImage` of `GameView.
 * renderTexture`, rendered by an orthographic `Camera` framing the 3D
 * `Coin` mesh (`Animator` states `idle`/`load`/`head`/`tail`/`side`,
 * `Coin.controller`) plus a background `Square` sprite. Reproduced here as
 * a CSS 3D flip-card at the exact `Game View` rect (140, 548.664, 800x800)
 * — `data-anim` selects the `@keyframes` in `index.css` that lands the card
 * on the named face, matching the Animator literally.
 *
 * `Game View` is a bare `RawImage` — the render texture, nothing else. The
 * `Square` behind the coin is a 3D `SpriteRenderer` INSIDE that texture and
 * is not resolved by this extraction (only UI `Image`/`RawImage` sprites are
 * decoded) — see the README's "What could not be matched exactly".
 *
 * It must not be stood in for with `coin-toss-bg.png`: that file is the
 * 1080x1920 full-screen MOBILE backdrop, and painting it into this 700x700
 * box drew an opaque, hard-edged rectangle of squashed temple art over the
 * real backdrop — the most visible defect on the desktop scene. The camera
 * clears to transparent, so the coin floats on the page backdrop; the soft
 * pool of light under it is a non-rectangular radial wash, which is what the
 * live build shows.
 */
export function CoinStage({ anim }: { anim: CoinAnim }) {
  const { COIN_VIEWPORT } = useDesign();
  return (
    <div
      className="node coin-viewport"
      style={{ left: COIN_VIEWPORT.x, top: COIN_VIEWPORT.y, width: COIN_VIEWPORT.w, height: COIN_VIEWPORT.h }}
    >
      <span className="coin-viewport-glow" aria-hidden="true" />
      {anim === "side" ? (
        <img className="coin-side" src={img("side")} alt="Side" />
      ) : (
        <div className="coin-flipper" data-anim={anim}>
          <div className="coin-face coin-face-front">
            <img src={img("heads")} alt="Heads" />
          </div>
          <div className="coin-face coin-face-back">
            <img src={img("tails")} alt="Tails" />
          </div>
        </div>
      )}
    </div>
  );
}
