import { img } from "../ui/design";

import { useDesign } from "../ui/DesignContext";
const BASE = import.meta.env.BASE_URL;

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
 * `Square`'s own `SpriteRenderer` sprite isn't resolved by this extraction
 * (only UI `Image`/`RawImage` sprites are decoded, not arbitrary 3D
 * `SpriteRenderer`s) — see the README's "What could not be matched
 * exactly"; the existing `coin-toss-bg.png`/`coin-toss-bg-wide.png` art
 * from the initial build fills that role.
 */
export function CoinStage({ anim }: { anim: CoinAnim }) {
  const { COIN_VIEWPORT } = useDesign();
  return (
    <div
      className="node coin-viewport"
      style={{ left: COIN_VIEWPORT.x, top: COIN_VIEWPORT.y, width: COIN_VIEWPORT.w, height: COIN_VIEWPORT.h }}
    >
      <img
        className="spr coin-viewport-bg"
        src={`${BASE}assets/img/coin-toss-bg.png`}
        alt=""
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
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
