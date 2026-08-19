import { useEffect, useState } from "react";

const INITIALS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const ENDINGS = "0123456789abcdefghijklmnopqrstuvwxyz";
const REFRESH_MS = 20000;

function pick(chars: string): string {
  return chars[Math.floor(Math.random() * chars.length)];
}

function randomInt(min: number, max: number): number {
  return min + Math.floor(Math.random() * (max - min));
}

/**
 * `Ticker.cs` (spec §1 step 5, §7) — unlike the sibling games, this one is
 * fully live and self-contained: generates fabricated "someone just won"
 * strings and scrolls them as a marquee. Purely decorative social-proof, no
 * server data involved. The source only regenerates once per scene `Start()`
 * (see `GameScene.cs`'s commented-out re-trigger hook, spec §1 step 5); this
 * port additionally refreshes the fabricated names/amounts periodically so
 * the marquee stays fresh across a long session — a small enhancement over
 * the once-per-load original, documented here and in the README.
 */
export function Ticker({ currency }: { currency: string }) {
  const [text, setText] = useState("");

  useEffect(() => {
    const generate = () => {
      let display = "";
      for (let i = 0; i < 5; i++) {
        display += pick(INITIALS);
        display += "***";
        display += pick(ENDINGS);
        display += ` won ${currency} ${randomInt(1000, 999999)}  •  `;
      }
      setText(display);
    };
    generate();
    const id = setInterval(generate, REFRESH_MS);
    return () => clearInterval(id);
  }, [currency]);

  return (
    <div className="ticker">
      <div className="ticker-track">
        <span>{text}</span>
        <span aria-hidden="true">{text}</span>
      </div>
    </div>
  );
}
