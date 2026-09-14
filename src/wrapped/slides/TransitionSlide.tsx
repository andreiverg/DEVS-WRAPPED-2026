import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

/** Pivot point between the society-wide recap and the member's personal stats. */
export function TransitionSlide({ durationMs }: SlideProps) {
  const textRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (textRef.current) applyEnterExit(tl, textRef.current, duration, { enterMs: 800, exitMs: 800 });
    return tl;
  }, durationMs);

  return (
    <PixelBackground>
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 64,
          textAlign: "center",
        }}
      >
        <div ref={textRef}>
          <GlitchText fontSize={40}>Now let's talk about you</GlitchText>
        </div>
      </div>
    </PixelBackground>
  );
}
