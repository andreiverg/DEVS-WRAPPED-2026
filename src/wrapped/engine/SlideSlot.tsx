import { useState } from "react";
import { motion } from "framer-motion";
import type { TargetAndTransition } from "framer-motion";
import { CardLayerProvider } from "../components/OnCard";
import { CANVAS_WIDTH } from "../components/CanvasStage";
import { SlideTimeOffsetProvider } from "./Timeline";
import type { SafeWrappedStats } from "../data/validate";
import type { SlideConfig } from "./SlideRegistry";
import { TRANSITION_MS } from "./transitions";
import type { SlideTransition } from "./transitions";

const EASE = [0.65, 0, 0.35, 1] as const;

type Layer = "base" | "card";

interface SlotMotion {
  initial: TargetAndTransition;
  present: TargetAndTransition;
  leaving: TargetAndTransition;
}

/**
 * How each transition moves a slide's two layers: `base` (the scene) and
 * `card` (its text on the shared stat card, above the card itself).
 *
 * - dissolve: the incoming scene fades in over the outgoing one, which holds
 *   still underneath so the two never both go see-through at once.
 * - crt: the incoming scene powers on like an old TV — a bright horizontal
 *   line that snaps open to full height.
 * - parallax: two-speed push — the incoming scene slides in over the top
 *   while the outgoing one drifts back at a third of the speed.
 *
 * Outgoing card text always clears away, so the shared card underneath can
 * carry straight on into the next slide's text.
 */
function slotMotion(layer: Layer, { kind, direction }: SlideTransition): SlotMotion {
  const settled = { opacity: 1, x: 0, scaleY: 1, filter: "brightness(1)" };
  switch (kind) {
    case "dissolve":
      return {
        initial: { opacity: 0 },
        present: settled,
        leaving: layer === "base" ? settled : { opacity: 0 },
      };
    case "crt":
      return {
        initial: { scaleY: 0.004, filter: "brightness(3)" },
        present: settled,
        leaving: layer === "base" ? settled : { opacity: 0 },
      };
    case "parallax":
      return {
        initial: { x: direction * CANVAS_WIDTH },
        present: settled,
        leaving:
          layer === "base"
            ? { x: -direction * CANVAS_WIDTH * 0.35 }
            : { x: -direction * CANVAS_WIDTH, opacity: 0 },
      };
  }
}

interface SlideSlotProps {
  slide: SlideConfig;
  data: SafeWrappedStats;
  /** Where this slide starts on the story-wide timeline. */
  offsetMs: number;
  leaving: boolean;
  /** The transition in progress, or null when the slide is just sitting there. */
  transition: SlideTransition | null;
  /** Whether this slide mounted as the incoming side of a transition (vs. a hard cut / first load). */
  animateIn: boolean;
}

/**
 * One slide mounted in the story: its scene, plus a separate layer stacked
 * above the shared StoryCard that its <OnCard> content portals into. Both
 * layers stay mounted (same React key) as the slide goes from incoming to
 * outgoing, so its clock and timelines carry on uninterrupted.
 */
export function SlideSlot({ slide, data, offsetMs, leaving, transition, animateIn }: SlideSlotProps) {
  const [cardLayerEl, setCardLayerEl] = useState<HTMLDivElement | null>(null);
  const SlideComponent = slide.component;
  const durationS = transition ? TRANSITION_MS[transition.kind] / 1000 : 0;

  const layerProps = (layer: Layer, zIndex: number) => {
    const m = transition ? slotMotion(layer, transition) : null;
    return {
      initial: animateIn && m ? m.initial : false,
      animate: m ? (leaving ? m.leaving : m.present) : undefined,
      transition: { duration: durationS, ease: EASE },
      style: { position: "absolute", inset: 0, zIndex, transformOrigin: "50% 50%" } as const,
    };
  };

  // Slides with a card wait one render for their card layer to exist, so the
  // OnCard content is there when the slide's timelines are first built.
  const card = slide.shared?.card;
  const ready = !card || cardLayerEl;

  return (
    <>
      <motion.div {...layerProps("base", leaving ? 1 : 2)}>
        {ready ? (
          <SlideTimeOffsetProvider offsetMs={offsetMs}>
            <CardLayerProvider value={card && cardLayerEl ? { target: cardLayerEl, box: card } : null}>
              <SlideComponent data={data} durationMs={slide.durationMs} />
            </CardLayerProvider>
          </SlideTimeOffsetProvider>
        ) : null}
      </motion.div>
      <motion.div ref={setCardLayerEl} {...layerProps("card", leaving ? 6 : 7)} />
    </>
  );
}
