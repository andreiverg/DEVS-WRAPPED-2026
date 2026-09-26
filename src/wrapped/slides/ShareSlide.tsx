import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { Caption } from "../components/Caption";
import { MascotSlot } from "../components/MascotSlot";
import { PixelButton } from "../components/PixelButton";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

export function ShareSlide({ data, durationMs }: SlideProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (rootRef.current) applyEnterExit(tl, rootRef.current, duration, { enterMs: 800, exitMs: 500 });
    return tl;
  }, durationMs);

  return (
    <PixelBackground durationMs={durationMs}>
      <div
        ref={rootRef}
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
        <MascotSlot archetype={data.archetype} size={200} />
        <GlitchText durationMs={durationMs} fontSize={46}>{`Share your ${data.yearLabel} Wrapped`}</GlitchText>
        <Caption>{data.societyName}</Caption>
        <PixelButton>Share</PixelButton>
      </div>
    </PixelBackground>
  );
}
