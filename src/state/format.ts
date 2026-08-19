/**
 * `LimitDecimalPlaces.cs` (spec §3) — the manual stake `TMP_InputField`'s
 * live validator: comma->dot, strip non-numeric/non-dot chars, collapse to a
 * single decimal point, cap at 2 fractional digits. Same mechanism as the
 * sibling Penaldo/Keno ports (this game has only the one stake field, no
 * side-bet stake).
 */
export function sanitizeStakeInput(raw: string): string {
  let input = raw.replace(/,/g, ".");
  input = input.replace(/[^0-9.]/g, "");

  const decimalIndex = input.indexOf(".");
  if (decimalIndex >= 0) {
    input = input.slice(0, decimalIndex + 1) + input.slice(decimalIndex + 1).replace(/\./g, "");
  }

  if (input.includes(".")) {
    const [whole, frac] = input.split(".");
    if (frac.length > 2) input = `${whole}.${frac.slice(0, 2)}`;
  }

  return input;
}

export function formatMoney(amount: number): string {
  return amount.toFixed(2);
}
