import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { useSlideTimeline } from "../engine/Timeline";

interface GlitchTextProps {
  children: string;
  durationMs: number;
  fontSize?: number;
}

const baseStyle: CSSProperties = {
  fontFamily: '"Press Start 2P", monospace',
  lineHeight: 1.6,
  margin: 0,
  color: "#FFFFFF",
  textShadow: "0 0 8px rgba(155,95,240,0.85), 0 0 20px rgba(74,95,217,0.5)",
  willChange: "transform",
};

const ENTER_S = 0.45;
const ENTER_TRAVEL_PX = 16; // smaller than the container's own 40px fade-slide — this is the added flourish, riding on top of it, not a duplicate journey.
const IDLE_AMP_PX = 4;
const IDLE_LEG_S = 0.8; // two legs (yoyo) = 1.6s full period

/** Pixel-font headline: punchy entrance overshoot + continuous idle bounce while held. */
export function GlitchText({ children, durationMs, fontSize = 32 }: GlitchTextProps) {
  const textRef = useRef<HTMLParagraphElement>(null);

  useSlideTimeline(() => {
    const tl = gsap.timeline();
    if (textRef.current) {
      // fromTo with explicit endpoints — see Timeline.applyEnterExit's
      // comment for why not .from()/.to() across StrictMode's double-mount.
      tl.fromTo(
        textRef.current,
        { y: ENTER_TRAVEL_PX },
        { y: 0, duration: ENTER_S, ease: "back.out(1.7)" },
        0,
      );
      // repeat: -1 is fine to `.seek()` into at an arbitrary elapsedMs — gsap
      // resolves it via modulo, so this stays frame-identical under the
      // stepped export clock same as a finite tween would.
      tl.fromTo(
        textRef.current,
        { y: 0 },
        { y: -IDLE_AMP_PX, duration: IDLE_LEG_S, ease: "sine.inOut", yoyo: true, repeat: -1 },
        ENTER_S,
      );
    }
    return tl;
  }, durationMs);

  return (
    <p ref={textRef} style={{ ...baseStyle, fontSize }}>
      {children}
    </p>
  );
}
