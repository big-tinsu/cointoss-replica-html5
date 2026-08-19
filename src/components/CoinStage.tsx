const BASE = import.meta.env.BASE_URL;

export type CoinAnim = "idle" | "load" | "head" | "tail" | "side";

/**
 * The coin render (spec §7/§8): `Coin.controller`/`Loading coin.controller`
 * drive Animator states literally named `idle`/`load`/`head`/`tail`/`side`
 * (`GameManager.StartRound()` plays `desiredOutcome.ToString()` directly).
 * Reproduced here as CSS `@keyframes` selected by a `data-anim` attribute —
 * `index.css`'s `.coin-flipper[data-anim="head"]`/`"tail"` rotate a two-sided
 * flip card to literally land on the named face; `"side"` shows the
 * dedicated edge-on sprite with a settling wobble instead of a rotation
 * (there's no third flip-card face for a coin's edge). `"load"` is a fast
 * continuous spin for the in-flight HTTP round-trip; `"idle"` is a gentle
 * static bob.
 */
export function CoinStage({ anim }: { anim: CoinAnim }) {
  return (
    <div className="coin-stage">
      <img className="coin-stage-bg" src={`${BASE}assets/img/coin-toss-bg.png`} alt="" />
      <div className="coin-viewport">
        {anim === "side" ? (
          <img className="coin-side" src={`${BASE}assets/img/side.png`} alt="Side" />
        ) : (
          <div className="coin-flipper" data-anim={anim}>
            <div className="coin-face coin-face-front">
              <img src={`${BASE}assets/img/heads.png`} alt="Heads" />
            </div>
            <div className="coin-face coin-face-back">
              <img src={`${BASE}assets/img/tails.png`} alt="Tails" />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
