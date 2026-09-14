import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

function formatSignupDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "a while back";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}

export function SignupDateSlide({ data, durationMs }: SlideProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const dateRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (labelRef.current) applyEnterExit(tl, labelRef.current, duration);
    if (dateRef.current) applyEnterExit(tl, dateRef.current, duration, { enterMs: 900 });
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
          gap: 32,
          padding: 64,
          textAlign: "center",
        }}
      >
        <div ref={labelRef}>You joined {data.societyName} on</div>
        <div ref={dateRef}>
          <GlitchText fontSize={40}>{formatSignupDate(data.signupDate)}</GlitchText>
        </div>
      </div>
    </PixelBackground>
  );
}
