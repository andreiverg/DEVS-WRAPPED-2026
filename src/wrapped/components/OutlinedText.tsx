import type { CSSProperties } from "react";

type Gradient = readonly [top: string, bottom: string];

interface OutlinedTextProps {
  children: string;
  /** Vertical fill gradient, top to bottom. */
  fill: Gradient;
  /** Outside stroke: width in px beyond the glyph edge, plus its vertical gradient. */
  stroke?: { width: number; colors: Gradient };
  style?: CSSProperties;
}

const clipToText = (colors: Gradient): CSSProperties => ({
  background: `linear-gradient(to bottom, ${colors[0]}, ${colors[1]})`,
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
});

/**
 * Gradient-filled display text with an optional gradient outline drawn
 * outside the glyphs (Figma's OUTSIDE stroke). CSS strokes are centered, so
 * the outline layer sits behind the fill at twice the width, leaving exactly
 * `stroke.width` visible past the glyph edge.
 */
export function OutlinedText({ children, fill, stroke, style }: OutlinedTextProps) {
  return (
    <span style={{ position: "relative", display: "inline-block", ...style }}>
      {stroke ? (
        <span
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            ...clipToText(stroke.colors),
            WebkitTextStroke: `${stroke.width * 2}px transparent`,
          }}
        >
          {children}
        </span>
      ) : null}
      <span style={{ position: "relative", ...clipToText(fill) }}>{children}</span>
    </span>
  );
}
