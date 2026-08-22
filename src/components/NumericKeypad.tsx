import { playClick } from "../state/sfx";
import { C, R, img } from "../ui/design";
import { Spr, TintSpr, Tmp } from "../ui/Sprite";

import { useDesign } from "../ui/DesignContext";
/**
 * `CustomKeypad` (`Assets/Keypad/`, spec §0/§3) — the shared custom numeric
 * keypad: digits, `.`, backspace, capped at a 7-character length and 2
 * decimal places, rejecting a leading `.` and a second `.`
 * (`KeypadManager.InputKey`/`BackSpace`). `Application.isMobilePlatform`
 * -gated in the original; here that's the live portrait layout (spec §5)
 * instead of a device check.
 */
const ROWS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
];
const CHAR_LIMIT = 7;

export function NumericKeypad({
  value,
  currency,
  onChange,
  onDone,
  onCancel,
}: {
  value: string;
  currency: string;
  onChange: (next: string) => void;
  onDone: () => void;
  onCancel: () => void;
}) {
  const { KEYPAD } = useDesign();
  function pressKey(key: string) {
    playClick();
    if (value.length >= CHAR_LIMIT) return;
    if (key === "." && (value.includes(".") || value.length === 0)) return;
    if (value.includes(".")) {
      const frac = value.split(".")[1] ?? "";
      if (frac.length >= 2) return;
    }
    onChange(value + key);
  }

  function backspace() {
    playClick();
    onChange(value.slice(0, -1));
  }

  return (
    <div className="modal-fade">
      <div
        className="node"
        style={{ left: KEYPAD.scrim.x, top: KEYPAD.scrim.y, width: KEYPAD.scrim.w, height: KEYPAD.scrim.h, background: C.keypadScrim }}
        onClick={onCancel}
      />
      <div className="node" style={{ left: KEYPAD.body.x, top: KEYPAD.body.y, width: KEYPAD.body.w, height: KEYPAD.body.h, background: C.keypadBody, borderRadius: R.keypad }}>
        <div
          className="node"
          style={{
            left: KEYPAD.display.x - KEYPAD.body.x,
            top: KEYPAD.display.y - KEYPAD.body.y,
            width: KEYPAD.display.w,
            height: KEYPAD.display.h,
            background: C.keypadFace,
            borderRadius: R.keypad,
          }}
        >
          <div
            className="node"
            style={{
              left: KEYPAD.input.x - KEYPAD.display.x,
              top: KEYPAD.input.y - KEYPAD.display.y,
              width: KEYPAD.input.w,
              height: KEYPAD.input.h,
              background: C.keypadWell,
              borderRadius: R.keypad,
            }}
          >
            <Tmp
              rect={{
                x: KEYPAD.inputText.x - KEYPAD.input.x,
                y: 0,
                w: KEYPAD.inputText.w,
                h: KEYPAD.input.h,
              }}
              fontSize={KEYPAD.inputText.fs}
              color={C.white}
              align="left"
            >
              {currency} {value || "0"}
            </Tmp>
            <button
              type="button"
              className="btn keypad-key"
              style={{
                left: KEYPAD.backspace.x - KEYPAD.display.x,
                top: 0,
                width: KEYPAD.backspace.w,
                height: KEYPAD.input.h,
                borderRadius: R.keypadRow,
              }}
              onClick={backspace}
              aria-label="Backspace"
            >
              <TintSpr
                src={img("point")}
                tint={C.keypadWell}
                rect={{
                  x: KEYPAD.backspaceGlyph.x - KEYPAD.backspace.x,
                  y: KEYPAD.backspaceGlyph.y - KEYPAD.display.y,
                  w: KEYPAD.backspaceGlyph.w,
                  h: KEYPAD.backspaceGlyph.h,
                }}
              />
              <Tmp
                rect={{
                  x: KEYPAD.backspaceGlyph.x - KEYPAD.backspace.x,
                  y: KEYPAD.backspaceGlyph.y - KEYPAD.display.y,
                  w: KEYPAD.backspaceGlyph.w,
                  h: KEYPAD.backspaceGlyph.h,
                }}
                fontSize={40}
                color={C.keypadGlyph}
              >
                ⌫
              </Tmp>
            </button>
          </div>
        </div>

        {ROWS.map((row, r) => (
          <div key={r}>
            {row.map((key, c) => (
              <button
                key={key}
                type="button"
                className="btn keypad-key"
                style={{
                  left: KEYPAD.keyLefts[c] - KEYPAD.body.x,
                  top: KEYPAD.rowTops[r] - KEYPAD.body.y,
                  width: KEYPAD.keyW,
                  height: KEYPAD.keyH,
                  background: C.keypadFace,
                  borderRadius: R.keypad,
                }}
                onClick={() => pressKey(key)}
              >
                <Tmp rect={{ x: 0, y: 0, w: KEYPAD.keyW, h: KEYPAD.keyH }} fontSize={KEYPAD.keyFs} color={C.white}>
                  {key}
                </Tmp>
              </button>
            ))}
          </div>
        ))}

        {/* Bottom row: 0, 0, "." (dotzerobackspace). */}
        <button
          type="button"
          className="btn keypad-key"
          style={{
            left: KEYPAD.keyLefts[0] - KEYPAD.body.x,
            top: KEYPAD.rowTops[3] - KEYPAD.body.y,
            width: KEYPAD.keyW,
            height: KEYPAD.keyH,
            background: C.keypadFace,
            borderRadius: R.keypad,
          }}
          onClick={() => pressKey("0")}
        >
          <Tmp rect={{ x: 0, y: 0, w: KEYPAD.keyW, h: KEYPAD.keyH }} fontSize={KEYPAD.keyFs} color={C.white}>
            0
          </Tmp>
        </button>
        <button
          type="button"
          className="btn keypad-key"
          style={{
            left: KEYPAD.keyLefts[1] - KEYPAD.body.x,
            top: KEYPAD.rowTops[3] - KEYPAD.body.y,
            width: KEYPAD.keyW,
            height: KEYPAD.keyH,
            background: C.keypadFace,
            borderRadius: R.keypad,
          }}
          onClick={() => pressKey("0")}
        >
          <Tmp rect={{ x: 0, y: 0, w: KEYPAD.keyW, h: KEYPAD.keyH }} fontSize={KEYPAD.keyFs} color={C.white}>
            0
          </Tmp>
        </button>
        <button
          type="button"
          className="btn keypad-key"
          style={{
            left: KEYPAD.keyLefts[2] - KEYPAD.body.x,
            top: KEYPAD.rowTops[3] - KEYPAD.body.y,
            width: KEYPAD.keyW,
            height: KEYPAD.keyH,
            background: C.keypadFace,
            borderRadius: R.keypad,
          }}
          onClick={() => pressKey(".")}
        >
          <Spr
            src={img("point")}
            rect={{
              x: KEYPAD.dot.x - KEYPAD.keyLefts[2],
              y: KEYPAD.dot.y - KEYPAD.rowTops[3],
              w: KEYPAD.dot.w,
              h: KEYPAD.dot.h,
            }}
            style={{ background: C.white, borderRadius: "50%" }}
          />
        </button>

        <button
          type="button"
          className="btn keypad-key"
          style={{
            left: KEYPAD.save.x - KEYPAD.body.x,
            top: KEYPAD.save.y - KEYPAD.body.y,
            width: KEYPAD.save.w,
            height: KEYPAD.save.h,
            background: C.keypadSave,
            borderRadius: R.keypad,
          }}
          onClick={() => {
            playClick();
            onDone();
          }}
        >
          <Tmp rect={{ x: 0, y: 0, w: KEYPAD.save.w, h: KEYPAD.save.h }} fontSize={KEYPAD.save.fs} color={C.white}>
            Save
          </Tmp>
        </button>

        <button
          type="button"
          className="btn"
          style={{
            left: KEYPAD.close.x - KEYPAD.body.x,
            top: KEYPAD.close.y - KEYPAD.body.y,
            width: KEYPAD.close.w,
            height: KEYPAD.close.h,
          }}
          onClick={onCancel}
          aria-label="Close"
        >
          <Tmp rect={{ x: 0, y: 0, w: KEYPAD.close.w, h: KEYPAD.close.h }} fontSize={KEYPAD.close.fs} color={C.keypadGlyph}>
            ×
          </Tmp>
        </button>
      </div>
    </div>
  );
}
