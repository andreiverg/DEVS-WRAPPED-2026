import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OnCard } from "../components/OnCard";
import { CenteredText, Layer, PlacedImage } from "../components/Placed";
import { PixelButton } from "../components/PixelButton";
import { prefersReducedMotion } from "../components/PersonalArt";
import { HANGING_DEVA_SRC, LOGO_ASSETS, WrappedLogo } from "../components/WrappedLogo";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

const MONITOR_SRC = `${LOGO_ASSETS}/monitor-mascot.png`;

const inter: CSSProperties = { fontFamily: '"Inter", sans-serif', lineHeight: 1.5, color: "#FFFFFF" };

const BUTTON = { left: 250, top: 1420, width: 580, height: 150 };

/** Closing slide: the intro's wordmark card again (the recap card morphs into it), with a share button. */
export function ShareSlide({ data, durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const headingRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (headingRef.current) applyEnterExit(tl, headingRef.current, duration, { exitMs: 500 });
    if (titleRef.current) applyEnterExit(tl, titleRef.current, duration, { enterMs: 800, exitMs: 500 });
    if (yearRef.current) applyEnterExit(tl, yearRef.current, duration, { enterMs: 1000, exitMs: 500 });
    if (buttonRef.current) applyEnterExit(tl, buttonRef.current, duration, { enterMs: 600, delayMs: 700, exitMs: 500 });
    return tl;
  }, durationMs);

  // A slow "press me" pulse on the button's glow.
  const pulse = prefersReducedMotion() ? 0.5 : 0.5 + 0.5 * Math.sin((elapsedMs / 1000) * Math.PI * 1.4);

  return (
    <PixelBackground durationMs={durationMs}>
      <PlacedImage src={MONITOR_SRC} left={-391.37} top={1282.9} width={1016} height={1111} rotate={23.36} opacity={0.5} />
      <PlacedImage src={MONITOR_SRC} left={479.87} top={-401.73} width={1016} height={1111} rotate={-29.55} opacity={0.5} />

      <Layer ref={headingRef}>
        <CenteredText
          centerX={540}
          top={420}
          style={{ fontFamily: '"Joystix", monospace', fontSize: 52, lineHeight: 1.2, color: "#FFFFFF", textShadow: "0 6px 0 #2A1245" }}
        >
          THAT'S A WRAP,
        </CenteredText>
        <CenteredText
          centerX={540}
          top={492}
          style={{ fontFamily: '"Joystix", monospace', fontSize: 52, lineHeight: 1.2, color: "#D478FB", textShadow: "0 6px 0 #2A1245" }}
        >
          {`${data.displayName.toUpperCase()}!`}
        </CenteredText>
      </Layer>

      <OnCard>
        <WrappedLogo
          societyName={data.societyName}
          yearLabel={data.yearLabel}
          elapsedMs={elapsedMs}
          titleRef={titleRef}
          yearRef={yearRef}
        />
      </OnCard>

      <Layer ref={buttonRef}>
        <div style={{ position: "absolute", ...BUTTON, pointerEvents: "auto" }}>
          <PixelButton
            aria-label={`Share your ${data.yearLabel} Wrapped`}
            style={{
              width: "100%",
              height: "100%",
              borderRadius: 75,
              border: "6px solid transparent",
              background:
                "linear-gradient(#7B3FE4, #4E1FB0) padding-box, linear-gradient(to bottom, #D478FB, #2A1245) border-box",
              boxShadow: `0 10px 0 #1C1C1B, 0 0 ${30 + 40 * pulse}px rgba(212,120,251,${0.35 + 0.4 * pulse})`,
              fontFamily: '"Joystix", monospace',
              fontSize: 64,
              color: "#FFFFFF",
              textShadow: "0 5px 0 #2A1245",
              cursor: "pointer",
            }}
          >
            SHARE
          </PixelButton>
        </div>
        <CenteredText centerX={540} top={1630} style={{ ...inter, fontWeight: 500, fontSize: 30 }}>
          {"See you next year"}
        </CenteredText>
      </Layer>
    </PixelBackground>
  );
}

ShareSlide.preload = [MONITOR_SRC, HANGING_DEVA_SRC];
