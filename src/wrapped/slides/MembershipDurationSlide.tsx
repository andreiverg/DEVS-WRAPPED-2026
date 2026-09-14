import { useRef, useState } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { RetroCounter } from "../components/RetroCounter";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

export function MembershipDurationSlide({ data, durationMs }: SlideProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const counterWrapRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  const primaryValue = data.isNewMember
    ? data.membershipDurationDays
    : Math.max(1, Math.floor(data.membershipDurationDays / 30));
  const unitLabel = data.isNewMember
    ? primaryValue === 1
      ? "day"
      : "days"
    : primaryValue === 1
      ? "month"
      : "months";

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (labelRef.current) applyEnterExit(tl, labelRef.current, duration);
    if (counterWrapRef.current) applyEnterExit(tl, counterWrapRef.current, duration, { enterMs: 900 });

    const proxy = { p: 0 };
    tl.to(
      proxy,
      {
        p: 1,
        duration: Math.max(0.4, duration / 1000 - 1.4),
        ease: "power1.out",
        onUpdate: () => setProgress(proxy.p),
      },
      0.3,
    );

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
          gap: 40,
          padding: 64,
          textAlign: "center",
        }}
      >
        <div ref={labelRef}>{data.isNewMember ? "You've been a member for" : "Member for"}</div>
        <div ref={counterWrapRef}>
          <RetroCounter value={primaryValue} progress={progress} suffix={` ${unitLabel}`} size="lg" />
        </div>
      </div>
    </PixelBackground>
  );
}
