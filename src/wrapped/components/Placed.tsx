import type { CSSProperties, ReactNode, Ref } from "react";

/**
 * Absolute-positioning helpers for the art-directed slides (Intro, the
 * society-wide stat slides). Those layouts are composed collages on the
 * fixed 1080x1920 canvas, so positions here are canvas pixels straight from
 * the Figma frames, not responsive layout.
 */

interface Box {
  left: number;
  top: number;
  width: number;
  height: number;
  /** Clockwise degrees, around the box center. */
  rotate?: number;
  opacity?: number;
}

/** Percent crop of the image inside its box (Figma's "crop" image fill). */
export interface ImageCrop {
  left: number;
  top: number;
  width: number;
  height: number;
}

function boxStyle({ left, top, width, height, rotate, opacity }: Box): CSSProperties {
  return {
    position: "absolute",
    left,
    top,
    width,
    height,
    transform: rotate ? `rotate(${rotate}deg)` : undefined,
    opacity,
    pointerEvents: "none",
  };
}

interface PlacedImageProps extends Box {
  src: string;
  crop?: ImageCrop;
  /** "cover" (default) or "fill" — "fill" stretches like a Figma STRETCH fill. */
  fit?: "cover" | "fill";
  /** Clip to an ellipse/rounded shape, e.g. "50%" for circular avatars. */
  radius?: CSSProperties["borderRadius"];
}

/** A static art layer positioned in canvas pixels. */
export function PlacedImage({ src, crop, fit = "cover", radius, ...box }: PlacedImageProps) {
  const imgStyle: CSSProperties = crop
    ? {
        position: "absolute",
        left: `${crop.left}%`,
        top: `${crop.top}%`,
        width: `${crop.width}%`,
        height: `${crop.height}%`,
        maxWidth: "none",
      }
    : { display: "block", width: "100%", height: "100%", objectFit: fit };

  return (
    <div style={{ ...boxStyle(box), overflow: crop || radius ? "hidden" : undefined, borderRadius: radius }}>
      <img src={src} alt="" draggable={false} style={imgStyle} />
    </div>
  );
}

interface CenteredTextProps {
  /** Canvas x of the text's horizontal center. */
  centerX: number;
  top: number;
  width?: number;
  style?: CSSProperties;
  children: ReactNode;
}

/** Text anchored by its horizontal center, as Figma's centered text boxes are. */
export function CenteredText({ centerX, top, width, style, children }: CenteredTextProps) {
  return (
    <div
      style={{
        position: "absolute",
        left: centerX,
        top,
        width,
        transform: "translateX(-50%)",
        textAlign: "center",
        whiteSpace: width ? "normal" : "nowrap",
        margin: 0,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/**
 * Full-canvas layer that GSAP can animate as one unit, without fighting the
 * per-element transforms (rotations, translateX(-50%)) of its children.
 */
export function Layer({ children, style, ref }: { children: ReactNode; style?: CSSProperties; ref?: Ref<HTMLDivElement> }) {
  return (
    <div ref={ref} style={{ position: "absolute", inset: 0, pointerEvents: "none", ...style }}>
      {children}
    </div>
  );
}
