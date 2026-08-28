/**
 * The kit's own stylesheet, injected once per page.
 *
 * The unified surfaces must render identically in eleven repos whose
 * `index.css` files share almost nothing — only Diced happened to define the
 * `btn-reset` / `pressable` / `scroll-y` helpers the first draft leaned on.
 * So the kit ships its styles with it, scoped under `.u-kit`, and resets the
 * properties a host stylesheet is most likely to have set globally on
 * `button` (font, colour, background, border, appearance).
 */
const CSS = `
.u-kit, .u-kit * { box-sizing: border-box; }
.u-kit button {
  -webkit-appearance: none;
  appearance: none;
  margin: 0;
  font: inherit;
  color: inherit;
  background: none;
  border: 0;
  text-align: inherit;
  text-transform: none;
  letter-spacing: inherit;
  cursor: pointer;
}
.u-kit button:disabled { cursor: default; }
.u-btn { padding: 0; line-height: normal; }
.u-press { transition: transform 90ms ease, filter 90ms ease; }
.u-press:not(:disabled):active { transform: scale(0.97); filter: brightness(1.12); }
.u-scroll { -webkit-overflow-scrolling: touch; scrollbar-width: thin; }
.u-scroll::-webkit-scrollbar { width: 6px; }
.u-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.18); border-radius: 3px; }
.u-scroll::-webkit-scrollbar-track { background: transparent; }
`;

const STYLE_ID = "u-kit-styles";

/** Injected by `UOverlay`; idempotent, so mounting several surfaces is fine. */
export function ensureStyles(): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(STYLE_ID)) return;
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = CSS;
  document.head.appendChild(el);
}
