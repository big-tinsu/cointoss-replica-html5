/**
 * Direct port of `VirtualCashManager.GenerateValuesInRange(min, max,
 * buttonCount)` (`VirtualCashManager.cs:22-54`, spec §3) — a genuinely more
 * sophisticated mechanic than either sibling game's hand-authored quick-bet
 * chips: a log-scaled spread of `{1,2,5}×10ⁿ` candidate values between the
 * session's live `minimum`/`maximum`, evenly sampled down to however many
 * quick-bet buttons the layout has. This adapts automatically to whatever
 * min/max the aggregator currency returns, so it's ported algorithmically
 * rather than hardcoded.
 *
 * Faithful to the source's exact arithmetic:
 *   minPowerOfTen = floor(log10(min)); maxPowerOfTen = ceil(log10(max))
 *   candidates = { b * 10^p : b in {1,2,5}, minPowerOfTen <= p <= maxPowerOfTen }
 *                  filtered to [min, max)  (max is EXCLUSIVE, matching the
 *                  source's `generatedValue < max` — not a typo, ported as-is)
 *   step = (candidates.length - 1) / (buttonCount - 1)
 *   values[i] = candidates[round(i * step)]  for i in 0..buttonCount-1
 */
export function generateQuickBetValues(min: number, max: number, buttonCount: number): number[] {
  if (buttonCount <= 0 || min <= 0 || max <= min) return [];

  const minPowerOfTen = Math.floor(Math.log10(min));
  const maxPowerOfTen = Math.ceil(Math.log10(max));
  const baseValues = [1, 2, 5];

  const candidates: number[] = [];
  for (let p = minPowerOfTen; p <= maxPowerOfTen; p++) {
    const powerOfTenValue = 10 ** p;
    for (const b of baseValues) {
      const value = b * powerOfTenValue;
      if (value >= min && value < max) candidates.push(value);
    }
  }

  if (candidates.length === 0) return [];
  if (candidates.length === 1 || buttonCount === 1) {
    return Array(buttonCount).fill(candidates[candidates.length - 1]);
  }

  const step = (candidates.length - 1) / (buttonCount - 1);
  const values: number[] = [];
  for (let i = 0; i < buttonCount; i++) {
    const index = Math.round(i * step);
    values.push(candidates[index]);
  }
  return values;
}
