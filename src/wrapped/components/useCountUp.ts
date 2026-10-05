import { useState } from "react";
import gsap from "gsap";
import { useSlideTimeline } from "../engine/Timeline";

/**
 * 0..1 count-up progress for a slide's headline number — same pacing as
 * StatReveal. It's a GSAP-tweened proxy rather than a component-owned timer,
 * so it stays frame-identical whether scrubbed live or by the stepped
 * render clock.
 */
export function useCountUp(durationMs: number, startMs = 300): number {
  const [progress, setProgress] = useState(0);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    const proxy = { p: 0 };
    const startS = startMs / 1000;
    tl.to(
      proxy,
      {
        p: 1,
        duration: Math.max(0.4, duration / 1000 - 1.1 - startS),
        ease: "power1.out",
        onUpdate: () => setProgress(proxy.p),
      },
      startS,
    );
    return tl;
  }, durationMs);

  return progress;
}

/** Whole-number count-up value, unformatted (the redesign shows "3120", not "3,120"). */
export function countUpValue(value: number, progress: number): string {
  return String(Math.round(Math.max(0, Math.min(1, progress)) * value));
}
