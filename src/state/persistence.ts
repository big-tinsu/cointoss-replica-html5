/**
 * localStorage mirror of Unity's `PlayerPrefs` keys (spec §3).
 *
 * STAKE-PERSISTENCE BUG FIX (deliberate improvement, documented per task
 * brief): the Unity source reads the remembered stake back with
 * `PlayerPrefs.GetFloat("ctstake", playerData.minimum)` (`GameManager.cs:56,
 * 133`) but every *writer* in the codebase persists to a different key,
 * `"stbstake"` (`StakeInput.cs:43,48`, `VirtualCashManager.cs:109,115`) —
 * `"ctstake"` is never written anywhere. Net effect in the original: the
 * stake silently resets to the session minimum on every Rebet/New Round,
 * instead of remembering the player's last-used amount. This port uses ONE
 * consistent key throughout (`cointossStake` below) instead of reproducing
 * the mismatch — see README for the "fix vs. preserve" judgment call.
 *
 * `SavedData.cs`'s `SavedParams` class also obfuscates a few other
 * PlayerPrefs keys behind meaningless-looking literals (e.g.
 * `"9349 130 403 910 CT"` for `hasFreebet`) — described in spec §3 as a
 * trivial, no-real-security "harder to eyeball in devtools" attempt. Since
 * the free-bet mechanic itself is dormant/never-triggered in the source
 * (spec §3/§7) and isn't ported here (see README), there's nothing left that
 * would need that obfuscation; plain, readable keys are used throughout.
 */
const KEYS = {
  stake: "cointossStake",
} as const;

export function loadStake(fallback: number): number {
  const raw = localStorage.getItem(KEYS.stake);
  const parsed = raw !== null ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function saveStake(value: number): void {
  localStorage.setItem(KEYS.stake, String(value));
}
