import { C, ERROR, R, img } from "../ui/design";
import { Spr, TintSpr, Tmp } from "../ui/Sprite";

/**
 * `Unexpected Error Display` (`GameLoader.ShowError`, `GameLoader.cs:473-
 * 488`, spec §7) — a fatal boot error: red exclamation icon, HTTP-style
 * header, and a Relaunch button (there's no retry in the source, only a
 * full relaunch). The scene's *other* candidate, `ErrorPanel`, is a bright
 * neon-green-bordered raw HTTP-status dump that reads as a programmer debug
 * overlay rather than shipped UI, so this — the actually-designed error
 * screen — is what's ported (see README, "What could not be matched
 * exactly").
 */
export function ErrorScreen({ message }: { message: string }) {
  return (
    <>
      <div className="node" style={{ left: 0, top: 0, width: 1080, height: 2340, background: "rgba(72, 0, 0, 0.5)" }} />
      <TintSpr src={img("exclamation")} tint={C.errorRed} rect={ERROR.icon} />
      <Tmp rect={ERROR.header} fontSize={ERROR.header.fs} color={C.errorHeaderRed} bold>
        HTTP/1.1 400 Bad Request error
      </Tmp>
      <Tmp rect={ERROR.body} fontSize={ERROR.body.fs} color={C.white}>
        {message || "Unable to Place your bet"}
      </Tmp>
      <div className="btn" style={{ left: ERROR.button.x, top: ERROR.button.y, width: ERROR.button.w, height: ERROR.button.h }}>
        <Spr src={img("gui-rounded-edge-button")} rect={{ x: 0, y: 0, w: ERROR.button.w, h: ERROR.button.h }} style={{ borderRadius: R.relaunchButton, background: C.relaunchBlue }} />
        <Tmp rect={{ x: 0, y: 0, w: ERROR.button.w, h: ERROR.button.h }} fontSize={ERROR.button.fs} color={C.white}>
          Relaunch
        </Tmp>
      </div>
    </>
  );
}
