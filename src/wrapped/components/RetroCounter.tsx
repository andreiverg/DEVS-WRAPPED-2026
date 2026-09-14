import type { CSSProperties } from "react";

interface RetroCounterProps {
  value: number;
  /**
   * 0..1 count-up progress. Driven by the parent slide's GSAP timeline
   * (typically via a tweened proxy object's onUpdate), so this component
   * has no timer of its own and stays frame-identical live vs. rendered.
   */
  progress: number;
  suffix?: string;
  size?: "hero" | "lg" | "md";
  style?: CSSProperties;
}

const SIZE_PX: Record<NonNullable<RetroCounterProps["size"]>, number> = {
  hero: 120,
  lg: 72,
  md: 48,
};

/** Count-up display for a numeric stat. */
export function RetroCounter({ value, progress, suffix = "", size = "lg", style }: RetroCounterProps) {
  const clamped = Math.max(0, Math.min(1, progress));
  const displayed = Math.round(clamped * value);

  return (
    <div
      style={{
        fontSize: SIZE_PX[size],
        fontVariantNumeric: "tabular-nums",
        lineHeight: 1,
        ...style,
      }}
    >
      {displayed.toLocaleString()}
      {suffix}
    </div>
  );
}
