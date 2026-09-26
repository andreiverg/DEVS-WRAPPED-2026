import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

const yearStyle: CSSProperties = {
  fontFamily: '"Jersey 10", monospace',
  fontSize: 200,
  lineHeight: 1,
  color: "#FFFFFF",
  textShadow: "0 0 10px rgba(123,63,228,0.8)",
};

export function IntroSlide({ data, durationMs }: SlideProps) {
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
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 40,
          padding: 64,
          textAlign: "center",
        }}
      >
        <div ref={titleRef} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <GlitchText durationMs={durationMs} fontSize={84}>{data.societyName}</GlitchText>
          <GlitchText durationMs={durationMs} fontSize={72}>WRAPPED</GlitchText>
        </div>
        <div ref={yearRef} style={yearStyle}>
          {data.yearLabel}
        </div>
      </div>
    </PixelBackground>
  );
}
