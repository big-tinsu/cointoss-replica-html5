import { C, R, img } from "../ui/design";
import { TintSpr, Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
/**
 * `Unexpected Error Display` (`GameLoader.ShowError`, `GameLoader.cs:473-488`,
 * spec §7) — a fatal error: red exclamation icon, HTTP-style header, the
 * message, a yellow "if the issue persists" hint and a Relaunch button
 * (there's no retry in the source, only a full relaunch). The scene's *other*
 * candidate, `ErrorPanel`, is a neon-green-bordered raw HTTP-status dump that
 * reads as a programmer debug overlay rather than shipped UI, so this — the
 * actually-designed error screen — is what's ported (see README).
 *
 * Three things here had been wrong on the Desktop scene:
 *
 * - The wash was a hardcoded 1080x2340 box, i.e. the MOBILE canvas, so on the
 *   1920-wide Desktop stage it tinted only the left 56% and left a hard
 *   vertical seam down the middle of the screen. It now comes from the
 *   scene's own `Unexpected Error Display` rect.
 * - Every Desktop `ERROR` rect was an invented literal: the icon sat at y=80
 *   instead of 444, and header/body/button were bunched into y 230..390 with
 *   the button at the SAME y as the body — so Relaunch was drawn on top of
 *   the message. They are measured from the scene now.
 * - The button drew the WHITE `GUI Rounded Edge Button.png` over a blue
 *   background, so a 256x256 white rounded square stretched to the button box
 *   showed up as a white ellipse covering the text. Masking to the sprite's
 *   alpha does not fix that either: the art's corner radius is 42% of its
 *   side, so stretching it to a 512x84 box turns the plate into an oval. The
 *   scene draws this `Sliced`, with `effectiveSliceBorderPx` 13.5 — i.e. a
 *   flat `#006EFF` fill with 13.5px corners, which is exactly what
 *   `R.relaunchButton` (`slice9(8)`) already encodes. Same treatment as
 *   `CashoutRetryModal`'s retry button.
 */
export function ErrorScreen({ message }: { message: string }) {
  const { ERROR } = useDesign();
  return (
    <>
      <div
        className="node"
        style={{
          left: ERROR.scrim.x,
          top: ERROR.scrim.y,
          width: ERROR.scrim.w,
          height: ERROR.scrim.h,
          background: C.errorScrim,
        }}
      />
      <TintSpr src={img("exclamation")} tint={C.errorRed} rect={ERROR.icon} />
      <Tmp rect={ERROR.header} fontSize={ERROR.header.fs} color={C.errorHeaderRed} bold>
        HTTP/1.1 400 Bad Request error
      </Tmp>
      <Tmp rect={ERROR.body} fontSize={ERROR.body.fs} color={C.white}>
        {message || "Unable to Place your bet"}
      </Tmp>
      <Tmp rect={ERROR.hint} fontSize={ERROR.hint.fs} color={C.errorHintYellow}>
        If the issue persists relaunch the game
      </Tmp>
      <button
        type="button"
        className="btn press"
        style={{
          left: ERROR.button.x,
          top: ERROR.button.y,
          width: ERROR.button.w,
          height: ERROR.button.h,
          border: "none",
          padding: 0,
          background: "transparent",
        }}
        onClick={() => window.location.reload()}
      >
        <span
          className="spr"
          style={{
            position: "absolute",
            inset: 0,
            background: C.relaunchBlue,
            borderRadius: R.relaunchButton,
          }}
        />
        <Tmp rect={{ x: 0, y: 0, w: ERROR.button.w, h: ERROR.button.h }} fontSize={ERROR.button.fs} color={C.white} bold>
          Relaunch
        </Tmp>
      </button>
    </>
  );
}
