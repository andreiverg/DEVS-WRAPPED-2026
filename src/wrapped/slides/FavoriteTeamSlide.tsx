import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import { CATEGORY_LABEL, CATEGORY_QUIP } from "../data/categoryCopy";
import type { SlideProps } from "../engine/SlideRegistry";

export function FavoriteTeamSlide({ data, durationMs }: SlideProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const quipRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (labelRef.current) applyEnterExit(tl, labelRef.current, duration);
    if (nameRef.current) applyEnterExit(tl, nameRef.current, duration, { enterMs: 900 });
    if (quipRef.current) applyEnterExit(tl, quipRef.current, duration, { enterMs: 1100 });
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
        <div ref={labelRef}>Your favourite team was</div>
        <div ref={nameRef}>
          <GlitchText fontSize={44}>{`${CATEGORY_LABEL[data.favoriteCategory]} Team`}</GlitchText>
        </div>
        <div ref={quipRef} style={{ maxWidth: "70%" }}>
          {CATEGORY_QUIP[data.favoriteCategory]}
        </div>
      </div>
    </PixelBackground>
  );
}
