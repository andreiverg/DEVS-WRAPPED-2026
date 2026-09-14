import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

export function IntroSlide({ data, durationMs }: SlideProps) {
  const titleRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (titleRef.current) applyEnterExit(tl, titleRef.current, duration);
    if (subRef.current) applyEnterExit(tl, subRef.current, duration, { enterMs: 900 });
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
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          padding: 64,
          textAlign: "center",
        }}
      >
        <div ref={titleRef}>
          <GlitchText fontSize={48}>{data.societyName}</GlitchText>
        </div>
        <div ref={subRef}>Your {data.yearLabel} Wrapped</div>
      </div>
    </PixelBackground>
  );
}
