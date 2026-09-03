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

/**
 * Every money figure the player reads — balance, stake, winnings, cashout,
 * bet history. Grouped thousands and exactly two decimals, so a five- or
 * six-figure balance stays legible instead of running together as one digit
 * string (`1000000.00` -> `1,000,000.00`).
 *
 * Deliberately `en-US` rather than the visitor's locale: the separator has to
 * agree with `sanitizeStakeInput` above, which reads "," as a decimal point
 * and would turn a locale-grouped figure back into a different number. One
 * grouping convention in, one out.
 *
 * Not for odds or any other bare multiplier — those are not money and never
 * reach four digits.
 */
const MONEY = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatMoney(amount: number | string | null | undefined): string {
  const n = typeof amount === "number" ? amount : Number(amount);
  return Number.isFinite(n) ? MONEY.format(n) : MONEY.format(0);
}
