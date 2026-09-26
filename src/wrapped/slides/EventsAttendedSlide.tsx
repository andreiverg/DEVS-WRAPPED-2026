import { useRef, useState } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { RetroCounter } from "../components/RetroCounter";
import { GlitchText } from "../components/GlitchText";
import { Caption } from "../components/Caption";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

export function EventsAttendedSlide({ data, durationMs }: SlideProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const counterWrapRef = useRef<HTMLDivElement>(null);
  const [countProgress, setCountProgress] = useState(0);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (labelRef.current) applyEnterExit(tl, labelRef.current, duration);
    if (counterWrapRef.current) applyEnterExit(tl, counterWrapRef.current, duration, { enterMs: 900 });

    // Count-up is a GSAP-tweened proxy value, not a component-owned timer —
    // its onUpdate fires during tl.seek() too, so it stays frame-identical
    // whether this timeline is scrubbed live or by the stepped render clock.
    const counterProxy = { p: 0 };
    tl.to(
      counterProxy,
      {
        p: 1,
        duration: Math.max(0.4, duration / 1000 - 1.4),
        ease: "power1.out",
        onUpdate: () => setCountProgress(counterProxy.p),
      },
      0.3,
    );

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
          gap: 24,
          padding: 64,
          textAlign: "center",
        }}
      >
        <div
          ref={labelRef}
          style={{ order: data.hasAttendedEvents ? 2 : 1 }}
        >
          <Caption>{data.hasAttendedEvents ? "Events you attended" : "Events attended this year"}</Caption>
        </div>
        <div ref={counterWrapRef} style={{ order: data.hasAttendedEvents ? 1 : 2 }}>
          {data.hasAttendedEvents ? (
            <RetroCounter value={data.eventsAttended} progress={countProgress} suffix=" events" size="hero" />
          ) : (
            <GlitchText durationMs={durationMs} fontSize={38}>Not yet — next year's your year</GlitchText>
          )}
        </div>
      </div>
    </PixelBackground>
  );
}
