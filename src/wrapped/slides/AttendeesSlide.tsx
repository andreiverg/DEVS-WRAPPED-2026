import { useRef } from "react";
import type { CSSProperties, ReactNode, Ref } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { CenteredText, Layer, PlacedImage } from "../components/Placed";
import { countUpValue, useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

const ASSETS = "/wrapped/attendees";

const minecraft: CSSProperties = { fontFamily: '"Minecraft", monospace', lineHeight: 1.5 };

// Scene build-up: layers fade in nearest-first, so the venue assembles from
// the crowd back to the stage, then the text lands once the room is built.
// The spotlight truss comes in last, at 1.0s — it's a shared element drawn
// by the story (StoryTruss) so it can glide over into the next slide.
const FADE_S = 0.5;
const FADE_STAGGER_S = 0.25;
const TEXT_DELAY_MS = 1300;

// Crowd hop: each row bounces off the floor on a ~110bpm beat, the back row
// half a beat behind so the room reads as a crowd rather than one sprite.
const BEAT_S = 0.55;
const FRONT_HOP_PX = 16;
const BACK_HOP_PX = 10;

/** Height of a floor-to-floor hop at time `t`, 0 on the beat, peaking mid-beat. */
function hop(timeSec: number, amplitudePx: number, phaseBeats = 0): number {
  return amplitudePx * Math.abs(Math.sin(Math.PI * (timeSec / BEAT_S + phaseBeats)));
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Outer layer takes the GSAP fade; inner layer takes the bounce, so the two transforms never collide. */
function SceneLayer({ fadeRef, liftPx = 0, children }: { fadeRef: Ref<HTMLDivElement>; liftPx?: number; children: ReactNode }) {
  return (
    <Layer ref={fadeRef}>
      <Layer style={liftPx ? { transform: `translateY(${-liftPx}px)` } : undefined}>{children}</Layer>
    </Layer>
  );
}

export function AttendeesSlide({ data, durationMs }: SlideProps) {
  const frontCrowdRef = useRef<HTMLDivElement>(null);
  const backCrowdRef = useRef<HTMLDivElement>(null);
  const speakersRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const progress = useCountUp(durationMs, TEXT_DELAY_MS);

  // Bounce is a pure function of the slide clock, like the rest of the motion.
  const elapsedMs = useSlideClock(durationMs);
  const timeSec = prefersReducedMotion() ? 0 : elapsedMs / 1000;

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    const buildOrder = [frontCrowdRef, backCrowdRef, speakersRef, stageRef];
    buildOrder.forEach((ref, i) => {
      if (ref.current) {
        tl.fromTo(ref.current, { opacity: 0 }, { opacity: 1, duration: FADE_S, ease: "power1.out" }, i * FADE_STAGGER_S);
      }
    });
    if (textRef.current) applyEnterExit(tl, textRef.current, duration, { enterMs: 900, delayMs: TEXT_DELAY_MS });
    return tl;
  }, durationMs);

  return (
    <PixelBackground durationMs={durationMs}>
      {/* Back to front: stage backdrop, stage deck, back crowd row, front crowd row. */}
      <SceneLayer fadeRef={stageRef}>
        <PlacedImage src={`${ASSETS}/stage.png`} left={-40} top={-137} width={1160} height={2057} />
      </SceneLayer>
      <SceneLayer fadeRef={speakersRef}>
        <PlacedImage src={`${ASSETS}/stage-speakers.png`} left={-134} top={927} width={1348} height={487} />
      </SceneLayer>
      <SceneLayer fadeRef={backCrowdRef} liftPx={hop(timeSec, BACK_HOP_PX, 0.5)}>
        <PlacedImage src={`${ASSETS}/crowd.png`} left={-167} top={843} width={1273} height={718} />
      </SceneLayer>
      <SceneLayer fadeRef={frontCrowdRef} liftPx={hop(timeSec, FRONT_HOP_PX)}>
        <PlacedImage src={`${ASSETS}/crowd.png`} left={-488} top={673} width={2249} height={1269} />
      </SceneLayer>

      <Layer ref={textRef}>
        <CenteredText centerX={544} top={638} style={{ ...minecraft, fontSize: 45, color: "#FFFFFF" }}>
          AND YOU GUYS LOVED IT
        </CenteredText>
        <CenteredText
          centerX={544}
          top={691}
          style={{ fontFamily: '"Joystix", monospace', fontSize: 128, lineHeight: 1.5, color: "#FFFFFF" }}
        >
          {countUpValue(data.totalAttendeesAcrossEvents, progress)}
        </CenteredText>
        <CenteredText centerX={537} top={887} width={576} style={{ ...minecraft, fontSize: 25, color: "#D5D4D4" }}>
          TOTAL ATTENDEES ACROSS EVERY
          <br />
          EVENT THIS YEAR
        </CenteredText>
      </Layer>

    </PixelBackground>
  );
}

AttendeesSlide.preload = [`${ASSETS}/stage.png`, `${ASSETS}/stage-speakers.png`, `${ASSETS}/crowd.png`, "/wrapped/shared/spotlight-truss.png"];
