import { useRef, useState } from "react";
import gsap from "gsap";
import { PixelBackground } from "./PixelBackground";
import { RetroCounter } from "./RetroCounter";
import { Caption, Blurb } from "./Caption";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";

interface StatRevealProps {
  durationMs: number;
  label: string;
  value: number;
  suffix?: string;
  caption?: string;
}

/** Shared template for "label above a big count-up number" slides. */
export function StatReveal({ durationMs, label, value, suffix = "", caption }: StatRevealProps) {
  const labelRef = useRef<HTMLDivElement>(null);
  const counterWrapRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);
  const [progress, setProgress] = useState(0);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (labelRef.current) applyEnterExit(tl, labelRef.current, duration);
    if (captionRef.current) applyEnterExit(tl, captionRef.current, duration);
    if (counterWrapRef.current) applyEnterExit(tl, counterWrapRef.current, duration, { enterMs: 900 });

    // Count-up is a GSAP-tweened proxy value, not a component-owned timer —
    // its onUpdate fires during tl.seek() too, so it stays frame-identical
    // whether this timeline is scrubbed live or by the stepped render clock.
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
        <div ref={labelRef}>
          <Caption>{label}</Caption>
        </div>
        <div ref={counterWrapRef}>
          <RetroCounter value={value} progress={progress} suffix={suffix} size="hero" />
        </div>
        {caption ? (
          <div ref={captionRef}>
            <Blurb>{caption}</Blurb>
          </div>
        ) : null}
      </div>
    </PixelBackground>
  );
}
