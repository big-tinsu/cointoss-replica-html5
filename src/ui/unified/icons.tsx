import type { CSSProperties } from "react";

/**
 * Icon set for the unified overlays — inline SVG, no PNG assets, so the same
 * glyphs ship in every game regardless of which sprite atlas that game
 * extracted from Unity, and stay crisp at any `Stage` scale.
 *
 * These are flow-positioned (`width`/`height`, no absolute rect) because the
 * unified surfaces lay out with flexbox rather than the per-game fixed-rect
 * system.
 */
function Glyph({
  size,
  color,
  style,
  children,
}: {
  size: number;
  color: string;
  style?: CSSProperties;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: "0 0 auto", display: "block", ...style }}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

type IconProps = { size: number; color: string; style?: CSSProperties };

export const UCloseIcon = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M18 6 6 18M6 6l12 12" />
  </Glyph>
);

export const UBackIcon = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M15 4 7 12l8 8" />
  </Glyph>
);

export const UChevronLeftIcon = UBackIcon;

export const UChevronRightIcon = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M9 4l8 8-8 8" />
  </Glyph>
);

export const UHelpIcon = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.2 9.3a2.8 2.8 0 1 1 3.7 2.7c-.6.2-.9.8-.9 1.4v.6" />
    <path d="M12 17.4h.01" />
  </Glyph>
);

export const UHistoryIcon = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M3.5 9A9 9 0 1 1 3 12.6" />
    <path d="M3 4.5V9h4.5" />
    <path d="M12 7.5V12l3 1.8" />
  </Glyph>
);

export const ULanguageIcon = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M3 12h18" />
    <path d="M12 3a15 15 0 0 1 0 18a15 15 0 0 1 0-18" />
  </Glyph>
);

export const USoundIcon = ({ muted, ...p }: IconProps & { muted?: boolean }) => (
  <Glyph {...p}>
    <path d="M4 9.5v5h3.2L12 18.5v-13L7.2 9.5H4z" />
    {muted ? (
      <path d="M16 9.5l4.5 5M20.5 9.5l-4.5 5" />
    ) : (
      <path d="M15.8 9.2a4 4 0 0 1 0 5.6M18.4 6.8a7.5 7.5 0 0 1 0 10.4" />
    )}
  </Glyph>
);

export const UPersonIcon = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="8.5" r="3.8" />
    <path d="M4.8 20a7.2 7.2 0 0 1 14.4 0" />
  </Glyph>
);

export const UTrophyIcon = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
    <path d="M7 6H4.5v1.5A3.5 3.5 0 0 0 8 11M17 6h2.5v1.5A3.5 3.5 0 0 1 16 11" />
    <path d="M12 14v3M8.5 20h7M9.5 20l.5-3h4l.5 3" />
  </Glyph>
);

export const UInfoIcon = (p: IconProps) => (
  <Glyph {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5.5M12 7.6h.01" />
  </Glyph>
);

/** Empty-state glyph for a bet-history list with no rows. */
export const UEmptyIcon = (p: IconProps) => (
  <Glyph {...p} style={{ ...p.style, strokeWidth: 1.4 }}>
    <rect x="3.5" y="4.5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M7.5 13h5M7.5 16h8" />
  </Glyph>
);

/** Team kit / shirt — the football games' "Select Team" row. */
export const UShirtIcon = (p: IconProps) => (
  <Glyph {...p}>
    <path d="M8.5 3.5 5 5.2 3.5 9l2.6 1.1V20.5h11.8V10.1L20.5 9 19 5.2l-3.5-1.7" />
    <path d="M8.5 3.5a3.5 3.5 0 0 0 7 0" />
  </Glyph>
);

/** Pitch — Street Soccer's "Select Pitch" row. */
export const UPitchIcon = (p: IconProps) => (
  <Glyph {...p}>
    <rect x="3" y="5.5" width="18" height="13" rx="1.5" />
    <path d="M12 5.5v13" />
    <circle cx="12" cy="12" r="2.4" />
    <path d="M3 9h2.6v6H3M21 9h-2.6v6H21" />
  </Glyph>
);
