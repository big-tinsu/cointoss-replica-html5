import type { CSSProperties, ReactNode } from "react";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** `position: absolute` from a design-space rect. */
export function box(r: Rect, extra?: CSSProperties): CSSProperties {
  return { left: r.x, top: r.y, width: r.w, height: r.h, ...extra };
}

/**
 * An `Image` component whose `m_Color` is `#FFFFFF` at alpha 1 — the large
 * majority of this scene's Images. A neutral tint means "draw the PNG
 * unmodified", so this is a plain `<img>` at the extracted rect.
 */
export function Spr({
  src,
  rect,
  className,
  style,
  alt = "",
  eager,
}: {
  src: string;
  rect: Rect;
  className?: string;
  style?: CSSProperties;
  alt?: string;
  eager?: boolean;
}) {
  return (
    <img
      className={className ? `spr ${className}` : "spr"}
      src={src}
      alt={alt}
      width={Math.round(rect.w)}
      height={Math.round(rect.h)}
      style={box(rect, style)}
      draggable={false}
      decoding={eager ? "sync" : "async"}
      loading={eager ? "eager" : undefined}
    />
  );
}

/**
 * An `Image` with a real tint (Unity multiplies the sprite by `m_Color`).
 * Masks the element to the sprite's own alpha, then fills with the tint —
 * correct for this project's flat-icon sprites (`image.png`'s glyphs,
 * `point.png`, the arrow icons), which are all opaque-on-transparent.
 */
export function TintSpr({
  src,
  rect,
  tint,
  alpha = 1,
  className,
  style,
}: {
  src: string;
  rect: Rect;
  tint: string;
  alpha?: number;
  className?: string;
  style?: CSSProperties;
}) {
  const url = `url("${src}")`;
  return (
    <span
      className={className ? `tint-spr ${className}` : "tint-spr"}
      style={box(rect, {
        background: tint,
        opacity: alpha === 1 ? undefined : alpha,
        maskImage: url,
        WebkitMaskImage: url,
        ...style,
      })}
    />
  );
}

/**
 * A `TextMeshProUGUI` component. `fontSize` is the extracted `m_fontSize`
 * in design-space px; `align`/`valign` mirror `m_HorizontalAlignment`/
 * `m_VerticalAlignment` (the dominant pairing in the scene is centre +
 * middle). `m_lineSpacing` is 0 everywhere, so the line height is the
 * font's own.
 */
export function Tmp({
  rect,
  fontSize,
  color = "#FFFFFF",
  bold,
  align = "center",
  valign = "middle",
  className,
  style,
  children,
}: {
  rect: Rect;
  fontSize: number;
  color?: string;
  bold?: boolean;
  align?: "left" | "center" | "right";
  valign?: "top" | "middle" | "bottom";
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
}) {
  return (
    <span
      className={`tmp${className ? ` ${className}` : ""}`}
      style={box(rect, {
        fontSize,
        color,
        fontWeight: bold ? 700 : 400,
        justifyContent: align === "left" ? "flex-start" : align === "right" ? "flex-end" : "center",
        alignItems: valign === "top" ? "flex-start" : valign === "bottom" ? "flex-end" : "center",
        textAlign: align,
        ...style,
      })}
    >
      {children}
    </span>
  );
}
