import { createContext, createElement, useContext, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
// Side-effect-only: pulls in gsap's ambient `namespace gsap { ... }` types
// (used below as `gsap.core.Timeline`) without binding a local `gsap` name
// or including the runtime in this module's output.
import type {} from "gsap";

/**
 * Injectable time source for slide animations. Slide components must NEVER
 * call requestAnimationFrame or Date.now() directly — they read elapsed time
 * via `useSlideClock`, which resolves to one of two sources depending on
 * which provider wraps the tree:
 *
 *  - LiveClockProvider: ticks via requestAnimationFrame (real wall-clock).
 *  - SteppedClockProvider: elapsedMs is supplied externally, frame by frame,
 *    by the Playwright-driven /render route. No ticking of its own.
 *
 * Both feed the exact same slide components and GSAP timelines, so a
 * timeline built once behaves identically live or under headless capture.
 */

interface LiveClockValue {
  mode: "live";
}

interface SteppedClockValue {
  mode: "stepped";
  elapsedMs: number;
}

type ClockContextValue = LiveClockValue | SteppedClockValue;

const ClockContext = createContext<ClockContextValue>({ mode: "live" });

export function LiveClockProvider({ children }: { children: ReactNode }) {
  return createElement(ClockContext.Provider, { value: { mode: "live" } }, children);
}

/**
 * Drives every slide beneath it with an explicit, externally-controlled
 * elapsed time instead of a ticker. The render route re-renders with a new
 * `elapsedMs` for each frame it wants captured.
 */
export function SteppedClockProvider({
  elapsedMs,
  children,
}: {
  elapsedMs: number;
  children: ReactNode;
}) {
  return createElement(ClockContext.Provider, { value: { mode: "stepped", elapsedMs } }, children);
}

/**
 * Elapsed time (ms) since the current slide became active, clamped to
 * `durationMs`. Live mode ticks via rAF; stepped mode returns exactly what
 * the provider was given, with no drift or timer of its own.
 */
export function useSlideClock(durationMs: number): number {
  const clock = useContext(ClockContext);
  const [liveElapsedMs, setLiveElapsedMs] = useState(0);
  const startRef = useRef<number | null>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (clock.mode !== "live") return;
    startRef.current = null;
    setLiveElapsedMs(0);

    const tick = (now: number) => {
      if (startRef.current === null) startRef.current = now;
      const elapsed = Math.min(now - startRef.current, durationMs);
      setLiveElapsedMs(elapsed);
      if (elapsed < durationMs) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [clock.mode, durationMs]);

  return clock.mode === "stepped" ? clock.elapsedMs : liveElapsedMs;
}

export type SlideTimelineFactory = (durationMs: number) => gsap.core.Timeline;

export interface SlideTimelineHandle {
  timeline: gsap.core.Timeline;
  /** Scrub to an absolute elapsed time since slide start. Idempotent. */
  seek(elapsedMs: number): void;
  destroy(): void;
}

/**
 * Builds a GSAP timeline for one slide and hands back a handle that is
 * scrubbed by elapsed time rather than played by GSAP's own ticker — that's
 * what lets the same timeline be driven by either clock source above.
 */
export function createSlideTimeline(
  factory: SlideTimelineFactory,
  durationMs: number,
): SlideTimelineHandle {
  const timeline = factory(durationMs);
  timeline.pause(0);

  return {
    timeline,
    seek(elapsedMs: number) {
      const clampedSeconds = Math.max(0, Math.min(elapsedMs, durationMs)) / 1000;
      timeline.seek(clampedSeconds, false);
    },
    destroy() {
      timeline.kill();
    },
  };
}

/**
 * Convenience hook combining the two primitives above: builds the timeline
 * once per `durationMs` change (via `factory`, which should be stable —
 * wrap it in `useCallback`/`useMemo` at the call site) and keeps it scrubbed
 * to the current slide clock on every render.
 */
export function useSlideTimeline(
  factory: SlideTimelineFactory,
  durationMs: number,
): gsap.core.Timeline | null {
  const elapsedMs = useSlideClock(durationMs);
  const handleRef = useRef<SlideTimelineHandle | null>(null);
  const [, forceUpdate] = useState(0);

  useEffect(() => {
    handleRef.current = createSlideTimeline(factory, durationMs);
    forceUpdate((n) => n + 1);
    return () => {
      handleRef.current?.destroy();
      handleRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [durationMs]);

  useEffect(() => {
    handleRef.current?.seek(elapsedMs);
  }, [elapsedMs]);

  return handleRef.current?.timeline ?? null;
}

/**
 * Adds the standard IG-story-style enter/hold/exit shape to a timeline for
 * one or more targets: fade+slide in at the start, untouched hold in the
 * middle, fade+slide out at the end. Shared across slides so every one gets
 * the same enter/exit feel without duplicating the tween pair.
 */
export function applyEnterExit(
  timeline: gsap.core.Timeline,
  targets: gsap.TweenTarget,
  durationMs: number,
  opts: { enterMs?: number; exitMs?: number } = {},
): void {
  const enterS = (opts.enterMs ?? 700) / 1000;
  const exitS = (opts.exitMs ?? 700) / 1000;
  const totalS = durationMs / 1000;

  // fromTo with explicit endpoints on both sides — not .from()/.to(), which
  // infer the "other" endpoint from the target's current inline style. That
  // inference breaks the moment a tween is torn down and rebuilt against the
  // same DOM node (e.g. React StrictMode's dev-mode double-invoke of
  // effects): killing the first tween leaves opacity:0 sitting in the
  // element's style, so a freshly-created .from() reads that as its "to"
  // value and animates 0 -> 0, i.e. nothing visibly renders.
  timeline.fromTo(
    targets,
    { opacity: 0, y: 40 },
    { opacity: 1, y: 0, duration: enterS, ease: "power2.out" },
    0,
  );
  timeline.fromTo(
    targets,
    { opacity: 1, y: 0 },
    { opacity: 0, y: -40, duration: exitS, ease: "power2.in" },
    Math.max(enterS, totalS - exitS),
  );
}
