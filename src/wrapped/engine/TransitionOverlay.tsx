import { forwardRef, useImperativeHandle, useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import type { TransitionKind } from "./SlideRegistry";

export interface TransitionOverlayHandle {
  /**
   * Plays a plain fade-to-white/fade-back transition. `onCovered` fires at
   * the moment the screen is fully covered — the caller swaps
   * `currentIndex` there so the slide change itself is never visible.
   * Collapses to an instant cut under reduced motion.
   */
  play(kind: TransitionKind, onCovered: () => void): Promise<void>;
}

const curtainStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  zIndex: 18,
  pointerEvents: "none",
  background: "#ffffff",
  opacity: 0,
};

function isReduced(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Full-screen transition chrome, rendered once by StoryController above the
 * current slide. Covers the screen, lets the caller swap slide content
 * underneath while fully obscured, then uncovers.
 */
export const TransitionOverlay = forwardRef<TransitionOverlayHandle>(function TransitionOverlay(_props, ref) {
  const curtainRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({
    async play(_kind, onCovered) {
      if (isReduced()) {
        onCovered();
        return;
      }

      const curtain = curtainRef.current;
      if (!curtain) {
        onCovered();
        return;
      }

      gsap.set(curtain, { opacity: 0 });
      await gsap.to(curtain, { opacity: 1, duration: 0.2, ease: "power1.in" });
      onCovered();
      await gsap.to(curtain, { opacity: 0, duration: 0.2, ease: "power1.out" });
    },
  }));

  return <div ref={curtainRef} style={curtainStyle} aria-hidden="true" />;
});
