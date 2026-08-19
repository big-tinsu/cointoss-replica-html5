/**
 * `KeypadManager.cs` (`Assets/Keypad/`, spec §0/§3) — the shared custom
 * numeric keypad: digits, `.`, backspace, capped at a 7-character length and
 * 2 decimal places, rejecting a leading `.` and a second `.`
 * (`KeypadManager.InputKey`/`BackSpace`). `Application.isMobilePlatform`-gated
 * in the original; here that's the live portrait breakpoint (spec §5)
 * instead of a device check. `HideKeypad()` fires a `static event Action
 * OnKeypadEdit` that `StakeInput` subscribes to, re-running manual-input
 * validation (spec §0's "cleaner pub/sub than the sibling games' direct-call
 * pattern") — reproduced here as the `onDone` callback invoking
 * `commitStake()`.
 */
const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0", "⌫"];
const CHAR_LIMIT = 7;

export function NumericKeypad({
  value,
  onChange,
  onDone,
}: {
  value: string;
  onChange: (next: string) => void;
  onDone: () => void;
}) {
  function pressKey(key: string) {
    if (key === "⌫") {
      onChange(value.slice(0, -1));
      return;
    }
    if (value.length >= CHAR_LIMIT) return;
    if (key === "." && value.includes(".")) return;
    if (key === "." && value.length === 0) return;
    if (value.includes(".")) {
      const frac = value.split(".")[1] ?? "";
      if (frac.length >= 2) return;
    }
    onChange(value + key);
  }

  return (
    <div className="numeric-keypad">
      <div className="keypad-grid">
        {KEYS.map((key) => (
          <button key={key} type="button" className="keypad-key" onClick={() => pressKey(key)}>
            {key}
          </button>
        ))}
      </div>
      <button type="button" className="keypad-done" onClick={onDone}>
        Done
      </button>
    </div>
  );
}
