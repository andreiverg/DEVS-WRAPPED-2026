import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { StatReveal } from "../components/StatReveal";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

function NoPrizesYet({ durationMs }: { durationMs: number }) {
  const textRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (textRef.current) applyEnterExit(tl, textRef.current, duration);
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
          <GlitchText fontSize={40}>No prizes yet — there's always next year</GlitchText>
        </div>
      </div>
    </PixelBackground>
  );
}

export function PrizesWonSlide({ data, durationMs }: SlideProps) {
  if (data.prizesWon <= 0) return <NoPrizesYet durationMs={durationMs} />;

  return (
    <StatReveal
      durationMs={durationMs}
      label="And won"
      caption="not bad for one year"
      value={data.prizesWon}
      suffix={data.prizesWon === 1 ? " prize" : " prizes"}
    />
  );
}
