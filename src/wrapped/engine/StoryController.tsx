import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { motion } from "framer-motion";
import { ProgressBars } from "../components/ProgressBars";
import { LiveClockProvider } from "./Timeline";
import { TransitionOverlay } from "./TransitionOverlay";
import type { TransitionOverlayHandle } from "./TransitionOverlay";
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

export const StoryController = forwardRef<StoryControllerHandle, StoryControllerProps>(
  function StoryController({ slides, data, onComplete, onExit }, ref) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const [progress, setProgress] = useState(0);
    const [isPaused, setIsPaused] = useState(false);

    const rafRef = useRef<number>(0);
    const startRef = useRef<number | null>(null);
    const pausedAtRef = useRef(0);
    const pointerDownAtRef = useRef<number | null>(null);
    const manualPauseRef = useRef(false);
    const overlayRef = useRef<TransitionOverlayHandle>(null);
    const isTransitioningRef = useRef(false);

    const slide = slides[currentIndex];

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
        if (isTransitioningRef.current) return;
        setProgress(0);

        const kind = slides[index].transitionIn;
        if (kind && overlayRef.current) {
          isTransitioningRef.current = true;
          overlayRef.current
            .play(kind, () => setCurrentIndex(index))
            .then(() => {
              isTransitioningRef.current = false;
            });
        } else {
          setCurrentIndex(index);
        }
      },
      [slides, onComplete],
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
    const SlideComponent = slide.component;

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
          <SlideComponent data={data} durationMs={slide.durationMs} />

          <TransitionOverlay ref={overlayRef} />

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
