import type { ReactNode } from "react";
import { motion } from "framer-motion";
import type { TargetAndTransition } from "framer-motion";
import { PixelCardSurface } from "../components/PixelCard";
import type { SharedState } from "./transitions";

const EASE = [0.65, 0, 0.35, 1] as const;

interface SharedElementProps {
  state: SharedState;
  /** Morph duration — the transition in progress. */
  durationS: number;
  /** Whether the element is newly arriving (the slide before didn't have it). */
  appearing: boolean;
  zIndex: number;
  /** How the element looks while absent: where it pops in from and shrinks/fades away to. */
  hidden: TargetAndTransition;
  /** Timing for popping in, when it should differ from the morph (e.g. to fit a slide's own build-up). */
  appear?: { delayS: number; durationS: number };
  children: ReactNode;
}

/**
 * An element several consecutive slides share, drawn once by the story.
 * Between two slides that both have it, it morphs (position + size) from one
 * box to the next so it reads as the same object; it pops in where a run of
 * slides having it begins and goes away where the next slide has none. Each
 * run remounts (keyed by `runStart`) so a returning element appears in place
 * rather than flying over from the previous run's box.
 */
function SharedElement({ state, durationS, appearing, zIndex, hidden, appear, children }: SharedElementProps) {
  const { box, lastBox, runStart } = state;
  if (!lastBox) return null;

  const timing = appearing && appear ? { delay: appear.delayS, duration: appear.durationS } : { duration: durationS };
  return (
    <motion.div
      key={runStart}
      initial={{ ...lastBox, ...hidden }}
      animate={box ? { ...box, opacity: 1, scale: 1 } : { ...lastBox, ...hidden }}
      transition={{ ...timing, ease: EASE }}
      style={{ position: "absolute", zIndex, pointerEvents: "none" }}
    >
      {children}
    </motion.div>
  );
}

type StoryElementProps = Omit<SharedElementProps, "zIndex" | "hidden" | "appear" | "children">;

/** The stat card the society/intro slides put their text on (above it, via <OnCard>). */
export function StoryCard(props: StoryElementProps) {
  return (
    <SharedElement {...props} zIndex={5} hidden={{ opacity: 0, scale: 0.92 }}>
      <PixelCardSurface />
    </SharedElement>
  );
}

/**
 * The spotlight truss rig over the stage scenes (Attendees -> Popular
 * Category), moving and scaling into place rather than being redrawn. On
 * arrival it fades in last in the Attendees build-up, after the stage
 * (see FADE_STAGGER_S in AttendeesSlide).
 */
export function StoryTruss(props: StoryElementProps) {
  return (
    <SharedElement {...props} zIndex={4} hidden={{ opacity: 0 }} appear={{ delayS: 1.0, durationS: 0.5 }}>
      <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
        {/* The art's lower ~29% is cropped off, as in Figma. */}
        <img
          src="/wrapped/shared/spotlight-truss.png"
          alt=""
          draggable={false}
          style={{ position: "absolute", left: 0, top: 0, width: "100%", height: "70.97%", maxWidth: "none" }}
        />
      </div>
    </SharedElement>
  );
}
