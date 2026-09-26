import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { Caption } from "../components/Caption";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

export function MostActiveMonthSlide({ data, durationMs }: SlideProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLDivElement>(null);
  const hasMonth = data.mostActiveMonth !== null;

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (labelRef.current) applyEnterExit(tl, labelRef.current, duration);
    if (valueRef.current) applyEnterExit(tl, valueRef.current, duration, { enterMs: 900 });
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
          gap: 32,
          padding: 64,
          textAlign: "center",
        }}
      >
        <div ref={labelRef}>
          <Caption>Your most active month was</Caption>
        </div>
        <div ref={valueRef}>
          {hasMonth ? (
            <GlitchText durationMs={durationMs} fontSize={56}>{data.mostActiveMonth as string}</GlitchText>
          ) : (
            <GlitchText durationMs={durationMs} fontSize={38}>Still to be written</GlitchText>
          )}
        </div>
      </div>
    </PixelBackground>
  );
}
