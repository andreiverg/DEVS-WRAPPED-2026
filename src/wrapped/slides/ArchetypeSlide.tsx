import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { MascotSlot } from "../components/MascotSlot";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import { ARCHETYPE_BLURB, ARCHETYPE_LABEL } from "../data/archetypeCopy";
import type { SlideProps } from "../engine/SlideRegistry";

export function ArchetypeSlide({ data, durationMs }: SlideProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const nameRef = useRef<HTMLDivElement>(null);
  const blurbRef = useRef<HTMLDivElement>(null);
  const mascotRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (labelRef.current) applyEnterExit(tl, labelRef.current, duration);
    if (mascotRef.current) applyEnterExit(tl, mascotRef.current, duration, { enterMs: 600 });
    if (nameRef.current) applyEnterExit(tl, nameRef.current, duration, { enterMs: 900 });
    if (blurbRef.current) applyEnterExit(tl, blurbRef.current, duration, { enterMs: 1100 });
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
        <div ref={labelRef}>Your DEVS archetype is</div>
        <div ref={mascotRef}>
          <MascotSlot archetype={data.archetype} />
        </div>
        <div ref={nameRef}>
          <GlitchText fontSize={40}>{ARCHETYPE_LABEL[data.archetype]}</GlitchText>
        </div>
        <div ref={blurbRef} style={{ maxWidth: "80%" }}>
          {ARCHETYPE_BLURB[data.archetype]}
        </div>
      </div>
    </PixelBackground>
  );
}
