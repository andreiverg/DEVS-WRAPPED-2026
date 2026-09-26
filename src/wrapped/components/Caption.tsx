import type { CSSProperties, ReactNode } from "react";

interface TextProps {
  children: ReactNode;
  style?: CSSProperties;
}

const captionStyle: CSSProperties = {
  fontFamily: '"Space Grotesk", sans-serif',
  fontWeight: 700,
  fontSize: 22,
  lineHeight: 1.4,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#C9BEDD",
  margin: 0,
};

/** Short uppercase lead-in label — "Your favourite team was", "Events attended". */
export function Caption({ children, style }: TextProps) {
  return <p style={{ ...captionStyle, ...style }}>{children}</p>;
}

const blurbStyle: CSSProperties = {
  fontFamily: '"Space Grotesk", sans-serif',
  fontWeight: 400,
  fontSize: 24,
  lineHeight: 1.5,
  color: "#C9BEDD",
  margin: 0,
};

/** Longer sentence-case flavor text — quips and archetype blurbs. */
export function Blurb({ children, style }: TextProps) {
  return <p style={{ ...blurbStyle, ...style }}>{children}</p>;
}
