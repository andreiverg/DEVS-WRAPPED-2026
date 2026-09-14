import type { CSSProperties, ReactNode } from "react";

const wrapperStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#ffffff",
  color: "#000000",
  overflow: "hidden",
};

/** Full-bleed plain background behind slide content. */
export function PixelBackground({ children }: { scene?: string; children?: ReactNode }) {
  return <div style={wrapperStyle}>{children}</div>;
}
