import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OnCard } from "../components/OnCard";
import { OutlinedText } from "../components/OutlinedText";
import { CenteredText, Layer, PlacedImage } from "../components/Placed";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

const ASSETS = "/wrapped/intro";

const logoFont: CSSProperties = { fontFamily: '"04b_19", monospace', lineHeight: "normal" };

const LOGO_OUTLINE = { width: 7.5, colors: ["#6A00FF", "#000000"] } as const;
/** Extruded "shadow" copy sitting just below the face of each word. */
const LOGO_BACK_FILL = ["#7247B3", "#7247B3"] as const;
const LOGO_FACE_FILL = ["#FFFFFF", "#AF5FFF"] as const;

/** Two-layer extruded wordmark: a darker copy offset below, the lit face on top. */
function LogoWord({
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
      <img src={`${ASSETS}/hanging-deva.png`} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%" }} />
    </div>
  );
}

export function IntroSlide({ data, durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const titleRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (titleRef.current) applyEnterExit(tl, titleRef.current, duration);
    if (yearRef.current) applyEnterExit(tl, yearRef.current, duration, { enterMs: 900 });
    return tl;
  }, durationMs);

  return (
    <PixelBackground durationMs={durationMs}>
      <PlacedImage
        src={`${ASSETS}/monitor-mascot.png`}
        left={-391.37}
        top={1282.9}
        width={1016}
        height={1111}
        rotate={23.36}
        opacity={0.5}
      />

      {/* Card-relative (0, 0 = the intro card's top-left); the card itself is the shared StoryCard. */}
      <OnCard>
        <Layer ref={titleRef}>
          <HangingDeva left={-36} top={460} size={355.64} elapsedMs={elapsedMs} />
          <LogoWord
            text={data.societyName}
            fontSize={313.06}
            face={{ centerX: 456.61, top: 39 }}
            back={{ centerX: 456.75, top: 61.54 }}
          />
          <LogoWord
            text="WRAPPED"
            fontSize={187.84}
            face={{ centerX: 454.19, top: 319.5 }}
            back={{ centerX: 455.5, top: 339.54 }}
          />
        </Layer>

        <Layer ref={yearRef}>
          <CenteredText centerX={750.41} top={482.82} style={{ ...logoFont, fontSize: 87.66, color: "#FFFFFF" }}>
            {data.yearLabel}
          </CenteredText>
        </Layer>

        {/* The top-right monitor overlaps the card in the design, so it rides above it. */}
        <PlacedImage
          src={`${ASSETS}/monitor-mascot.png`}
          left={394.87}
          top={-1044.73}
          width={1016}
          height={1111}
          rotate={-29.55}
          opacity={0.5}
        />
      </OnCard>
    </PixelBackground>
  );
}

IntroSlide.preload = [`${ASSETS}/monitor-mascot.png`, `${ASSETS}/hanging-deva.png`];
