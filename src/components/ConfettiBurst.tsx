/**
 * `PlayConfetti.cs`/`Confetti.prefab` (spec §7) — a full particle-system
 * prefab in the source wired to a free-bet reward popup whose trigger
 * condition (`VirtualCashManager.CheckForFreeBet()`) has zero call sites
 * anywhere (dormant, same class of gap flagged in both sibling specs). Since
 * Coin Toss is a single flat-payout game with no jackpot tier to gate a
 * rarer celebration on, this port ties a small CSS-only celebration to the
 * simplest clear condition available: any winning round (see README).
 */
export function ConfettiBurst() {
  const pieces = Array.from({ length: 24 });
  return (
    <div className="confetti-burst" aria-hidden="true">
      {pieces.map((_, i) => (
        <span key={i} className="confetti-piece" style={{ "--i": i } as React.CSSProperties} />
      ))}
    </div>
  );
}
