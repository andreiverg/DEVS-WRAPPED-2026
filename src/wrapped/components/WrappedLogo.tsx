import type { CSSProperties, Ref } from "react";
import { OutlinedText } from "./OutlinedText";
import { CenteredText, Layer } from "./Placed";

/**
 * The extruded "DEVS / WRAPPED / 2026" wordmark with the mascot swinging off
 * it, laid out in the 909x579 intro card's own coordinates. Shown on the
 * intro, and again on the share slide to close the story.
 */

export const LOGO_ASSETS = "/wrapped/intro";
export const HANGING_DEVA_SRC = `${LOGO_ASSETS}/hanging-deva.png`;

export const logoFont: CSSProperties = { fontFamily: '"04b_19", monospace', lineHeight: "normal" };

const LOGO_OUTLINE = { width: 7.5, colors: ["#6A00FF", "#000000"] } as const;
/** Extruded "shadow" copy sitting just below the face of each word. */
const LOGO_BACK_FILL = ["#7247B3", "#7247B3"] as const;
const LOGO_FACE_FILL = ["#FFFFFF", "#AF5FFF"] as const;

/** Two-layer extruded wordmark: a darker copy offset below, the lit face on top. */
export function LogoWord({
  text,
  fontSize,
  face,
  back,
}: {
  text: string;
  fontSize: number;
  face: { centerX: number; top: number };
  back: { centerX: number; top: number };
}) {
  return (
    <>
      <CenteredText centerX={back.centerX} top={back.top} style={{ ...logoFont, fontSize }}>
        <OutlinedText fill={LOGO_BACK_FILL} stroke={LOGO_OUTLINE}>
          {text}
        </OutlinedText>
      </CenteredText>
      <CenteredText centerX={face.centerX} top={face.top} style={{ ...logoFont, fontSize }}>
        <OutlinedText fill={LOGO_FACE_FILL} stroke={LOGO_OUTLINE}>
          {text}
        </OutlinedText>
      </CenteredText>
    </>
  );
}

// Mascot swing: a gentle pendulum hanging from the hand at her top right.
const SWING_DEG = 7;
const SWING_PERIOD_S = 2.4;
/** Her raised hand in hanging-deva.png, as a fraction of the image — the pivot. */
const HAND_ORIGIN = "69% 11%";

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** The mascot hanging off the card, swaying from her hand. Angle is a pure function of the slide clock. */
function HangingDeva({ left, top, size, elapsedMs }: { left: number; top: number; size: number; elapsedMs: number }) {
  const angle = prefersReducedMotion() ? 0 : SWING_DEG * Math.sin((2 * Math.PI * elapsedMs) / 1000 / SWING_PERIOD_S);
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        transformOrigin: HAND_ORIGIN,
        transform: `rotate(${angle}deg)`,
        pointerEvents: "none",
      }}
    >
      <img src={HANGING_DEVA_SRC} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

interface WrappedLogoProps {
  societyName: string;
  yearLabel: string;
  elapsedMs: number;
  /** Layer holding the wordmark + mascot, for the slide's own enter/exit. */
  titleRef?: Ref<HTMLDivElement>;
  /** Layer holding the year, which enters a beat later. */
  yearRef?: Ref<HTMLDivElement>;
}

export function WrappedLogo({ societyName, yearLabel, elapsedMs, titleRef, yearRef }: WrappedLogoProps) {
  return (
    <>
      <Layer ref={titleRef}>
        <HangingDeva left={-36} top={460} size={355.64} elapsedMs={elapsedMs} />
        <LogoWord text={societyName} fontSize={313.06} face={{ centerX: 456.61, top: 39 }} back={{ centerX: 456.75, top: 61.54 }} />
        <LogoWord text="WRAPPED" fontSize={187.84} face={{ centerX: 454.19, top: 319.5 }} back={{ centerX: 455.5, top: 339.54 }} />
      </Layer>

      <Layer ref={yearRef}>
        <CenteredText centerX={750.41} top={482.82} style={{ ...logoFont, fontSize: 87.66, color: "#FFFFFF" }}>
          {yearLabel}
        </CenteredText>
      </Layer>
    </>
  );
}
