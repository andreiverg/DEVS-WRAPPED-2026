import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { ProgressBars } from "../components/ProgressBars";
import { LiveClockProvider } from "./Timeline";
import { SlideSlot } from "./SlideSlot";
import { StoryCard, StoryTruss } from "./SharedElements";
import { TRANSITION_MS, sharedStateAt } from "./transitions";
import type { SharedElementId } from "./transitions";
import type { SlideTransition } from "./transitions";
import { preloadImages } from "./preload";
import type { SafeWrappedStats } from "../data/validate";
import type { SlideConfig } from "./SlideRegistry";

export interface StoryControllerHandle {
  play(): void;
  pause(): void;
  /** Jump directly to a slide index, resetting its progress to 0. */
  seek(index: number): void;
  next(): void;
  prev(): void;
}

interface StoryControllerProps {
  slides: SlideConfig[];
  data: SafeWrappedStats;
  /** Called once the user advances past the final slide. */
  onComplete?: () => void;
  /** Called on swipe-down-to-exit. */
  onExit?: () => void;
}

const HOLD_THRESHOLD_MS = 180;

/** Comfortably past the longest transition (TRANSITION_MS) before warming up upcoming slides. */
const PREPARE_AFTER_MS = 1000;

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export const StoryController = forwardRef<StoryControllerHandle, StoryControllerProps>(
  function StoryController({ slides, data, onComplete, onExit }, ref) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    /** The outgoing slide, kept mounted underneath while a transition plays. */
    const [previousIndex, setPreviousIndex] = useState<number | null>(null);
    const [transition, setTransition] = useState<SlideTransition | null>(null);

    const rafRef = useRef<number>(0);
    const startRef = useRef<number | null>(null);
    const pausedAtRef = useRef(0);
    const pointerDownAtRef = useRef<number | null>(null);
    const manualPauseRef = useRef(false);
    const isTransitioningRef = useRef(false);

    const slide = slides[currentIndex];

    /** Each slide's start on the story-wide timeline (sum of the durations before it). */
    const offsetsMs = useMemo(() => {
      let total = 0;
      return slides.map((s) => {
        const start = total;
        total += s.durationMs;
        return start;
      });
    }, [slides]);

    const goTo = useCallback(
      (index: number) => {
        if (index < 0) {
          setCurrentIndex(0);
          setProgress(0);
          return;
        }
        if (index >= slides.length) {
          onComplete?.();
          return;
        }
        if (isTransitioningRef.current || index === currentIndex) return;
        setProgress(0);

        // A boundary's transition belongs to the later slide, whichever way
        // we cross it, so going back replays the same transition in reverse.
        const direction = index > currentIndex ? 1 : -1;
        const kind = prefersReducedMotion() ? undefined : slides[Math.max(index, currentIndex)].transitionIn;
        if (!kind) {
          setPreviousIndex(null);
          setCurrentIndex(index);
          return;
        }

        isTransitioningRef.current = true;
        setTransition({ kind, direction });
        setPreviousIndex(currentIndex);
        setCurrentIndex(index);
        window.setTimeout(() => {
          setPreviousIndex(null);
          isTransitioningRef.current = false;
        }, TRANSITION_MS[kind]);
      },
      [slides, onComplete, currentIndex],
    );

    const next = useCallback(() => goTo(currentIndex + 1), [goTo, currentIndex]);
    const prev = useCallback(() => goTo(currentIndex - 1), [goTo, currentIndex]);

    useImperativeHandle(
      ref,
      () => ({
        play: () => setIsPaused(false),
        pause: () => setIsPaused(true),
        seek: goTo,
        next,
        prev,
      }),
      [goTo, next, prev],
    );

    // Warm up the next two slides' art while this one plays, so their
    // images are decoded before their transitions start.
    useEffect(() => {
      const upcoming = [currentIndex, currentIndex + 1, currentIndex + 2].map((i) => slides[i]).filter(Boolean);
      for (const s of upcoming) {
        if (s.component.preload) preloadImages(s.component.preload);
      }
      // Heavier prep (e.g. physics) waits until this slide's own transition
      // has finished and the page is idle, so it never hitches an animation.
      const prepare = () => {
        for (const s of upcoming) s.component.prepare?.(s.durationMs);
      };
      let idleHandle: number | undefined;
      const settleTimer = window.setTimeout(() => {
        idleHandle = window.requestIdleCallback ? window.requestIdleCallback(prepare) : window.setTimeout(prepare, 0);
      }, PREPARE_AFTER_MS);
      return () => {
        window.clearTimeout(settleTimer);
        if (idleHandle !== undefined) (window.cancelIdleCallback ?? window.clearTimeout)(idleHandle);
      };
    }, [slides, currentIndex]);

    // Autoplay: advance current slide's progress until it hits 1, then move on.
    useEffect(() => {
      if (isPaused || !slide) return;
      startRef.current = null;
      pausedAtRef.current = progress;

      const tick = (now: number) => {
        if (startRef.current === null) startRef.current = now;
        const elapsed = now - startRef.current;
        const fraction = Math.min(
          1,
          pausedAtRef.current + elapsed / slide.durationMs,
        );
        setProgress(fraction);
        if (fraction >= 1) {
          goTo(currentIndex + 1);
          return;
        }
        rafRef.current = requestAnimationFrame(tick);
      };

      rafRef.current = requestAnimationFrame(tick);
      return () => cancelAnimationFrame(rafRef.current);
      // progress intentionally excluded: it's an output of this effect, not an input.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isPaused, currentIndex, slide, goTo]);

    if (!slide) return null;
    const mountedIndices = previousIndex !== null ? [previousIndex, currentIndex] : [currentIndex];
    const transitionS = transition ? TRANSITION_MS[transition.kind] / 1000 : 0;
    const sharedProps = (id: SharedElementId) => ({
      state: sharedStateAt(slides, currentIndex, id),
      durationS: transitionS,
      appearing: previousIndex === null || !slides[previousIndex].shared?.[id],
    });

    return (
      <LiveClockProvider>
        <motion.div
          style={{ position: "relative", width: "100%", height: "100%" }}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.4}
          onDragEnd={(_, info) => {
            if (info.offset.y > 120) onExit?.();
          }}
        >
          {mountedIndices.map((i) => (
            <SlideSlot
              key={i}
              slide={slides[i]}
              data={data}
              offsetMs={offsetsMs[i]}
              leaving={i !== currentIndex}
              transition={previousIndex !== null ? transition : null}
              animateIn={previousIndex !== null && i === currentIndex}
            />
          ))}

          <StoryTruss {...sharedProps("truss")} />
          <StoryCard {...sharedProps("card")} />

          <ProgressBars count={slides.length} currentIndex={currentIndex} progress={progress} />

          {/* Tap zones: left third = prev, center third = pause toggle, right third = next.
              Press-hold anywhere also pauses for as long as it's held. */}
          <div
            style={{ position: "absolute", inset: 0, zIndex: 15 }}
            onPointerDown={(e) => {
              pointerDownAtRef.current = performance.now();
              setIsPaused(true);
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
            }}
            onPointerUp={(e) => {
              const heldMs = pointerDownAtRef.current
                ? performance.now() - pointerDownAtRef.current
                : Infinity;
              pointerDownAtRef.current = null;

              if (heldMs >= HOLD_THRESHOLD_MS) {
                // was a hold, not a tap: resume unless manually paused via a center tap
                setIsPaused(manualPauseRef.current);
                return;
              }

              const bounds = e.currentTarget.getBoundingClientRect();
              const relativeX = (e.clientX - bounds.left) / bounds.width;
              if (relativeX < 0.33) {
                setIsPaused(manualPauseRef.current);
                prev();
              } else if (relativeX < 0.66) {
                manualPauseRef.current = !manualPauseRef.current;
                setIsPaused(manualPauseRef.current);
              } else {
                setIsPaused(manualPauseRef.current);
                next();
              }
            }}
            onPointerCancel={() => {
              pointerDownAtRef.current = null;
              setIsPaused(manualPauseRef.current);
            }}
          />
        </motion.div>
      </LiveClockProvider>
    );
  },
);
