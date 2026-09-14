interface GlitchTextProps {
  children: string;
  fontSize?: number;
}

/** Plain heading text. */
export function GlitchText({ children, fontSize = 32 }: GlitchTextProps) {
  return <p style={{ fontSize, lineHeight: 1.3, margin: 0 }}>{children}</p>;
}
