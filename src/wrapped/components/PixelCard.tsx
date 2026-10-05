/** Canvas-pixel box for a stat card, as laid out in Figma. */
export interface CardBox {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Dark rounded stat card surface from the redesign: #1C1C1B fill with a 5px
 * inside border fading from glow-pink #D478FB (top) to grey #666666
 * (bottom). Fills its parent — StoryCard owns the position, so one card can
 * persist and morph across slides.
 */
export function PixelCardSurface() {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        borderRadius: 80,
        border: "5px solid transparent",
        background:
          "linear-gradient(#1C1C1B, #1C1C1B) padding-box, linear-gradient(to bottom, #D478FB, #666666) border-box",
      }}
    />
  );
}
