import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OnCard } from "../components/OnCard";
import { OutlinedText } from "../components/OutlinedText";
import { CenteredText, Layer, PlacedImage } from "../components/Placed";
import { RobotSprite, ROBOT_BOX, ROBOT_SRC } from "../components/RobotSprite";
import { STAT_VALUE_FILL, STAT_VALUE_STROKE } from "../components/StatCard";
import {
  ARCHETYPE_BADGES_SRC,
  ARCHETYPE_ORDER,
  ArchetypeBadge,
  PILLAR_SRC,
  fitJoystix,
  prefersReducedMotion,
} from "../components/PersonalArt";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import { ARCHETYPE_BLURB, ARCHETYPE_LABEL } from "../data/archetypeCopy";
import type { SlideProps } from "../engine/SlideRegistry";

const ARROWS_SRC = "/wrapped/kpop-choreos/arrows.png";
/** Left/right arrow crops of the four-arrow sheet, as on the K-pop slide. */
const ARROW = { width: 176, height: 230, sheetWidthPct: 392.86, leftCrop: 0, rightCrop: -292.92 };

const inter: CSSProperties = { fontFamily: '"Inter", sans-serif', lineHeight: 1.5, color: "#FFFFFF" };

/** Card-relative center line of the 866px archetype card. */
const CARD_CX = 433;

const ROBOT_SCALE = 1.25;
const ROBOT = { left: 540 - (ROBOT_BOX.width * ROBOT_SCALE) / 2, top: 400 };
const BADGE = { size: 210, left: 700, top: 300 };

// Slot-reel roll: archetypes flick past, each holding a little longer than
// the last, until the member's own one lands.
const ROLL_START_S = 0.5;
const ROLL_STEPS = 13;
const ROLL_FIRST_MS = 60;
const ROLL_GROWTH = 1.17;

/** Seconds into the slide at which each roll step starts; the last step is the member's archetype. */
const ROLL_TIMES = (() => {
  const times: number[] = [];
  let t = ROLL_START_S;
  for (let i = 0; i < ROLL_STEPS; i++) {
    times.push(t);
    t += (ROLL_FIRST_MS * ROLL_GROWTH ** i) / 1000;
  }
  return times;
})();
const LOCK_S = ROLL_TIMES[ROLL_TIMES.length - 1];

export function ArchetypeSlide({ data, durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const sceneRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (sceneRef.current) applyEnterExit(tl, sceneRef.current, duration, { enterMs: 600 });
    if (cardRef.current) applyEnterExit(tl, cardRef.current, duration, { enterMs: 900 });
    return tl;
  }, durationMs);

  const reduced = prefersReducedMotion();
  const t = reduced ? Infinity : elapsedMs / 1000;
  const targetIndex = Math.max(0, ARCHETYPE_ORDER.indexOf(data.archetype));
  // Steps counted back from the landing one, so the reel always stops on the member's archetype.
  const step = ROLL_TIMES.filter((s) => s <= t).length - 1;
  const shownIndex = step < 0 ? targetIndex : (targetIndex - (ROLL_STEPS - 1 - step) + ARCHETYPE_ORDER.length * 4) % ARCHETYPE_ORDER.length;
  const shown = ARCHETYPE_ORDER[shownIndex];
  const locked = t >= LOCK_S;
  const sinceLock = locked ? t - LOCK_S : 0;

  // On lock: a pop on the badge and name, then the robot celebrates.
  const pop = locked && !reduced ? 1 + 0.18 * Math.exp(-sinceLock * 7) * Math.cos(sinceLock * 22) : 1;
  const robotPose = locked ? 1 + (Math.floor(sinceLock * 2) % 4) : 0;
  const hop = locked && !reduced ? Math.abs(Math.sin(sinceLock * Math.PI * 2)) * 34 : 0;
  const badgeBob = reduced ? 0 : Math.sin(t * 2.4) * 10;
  // Arrows blink while the reel spins, then bow out.
  const arrowOpacity = locked ? Math.max(0, 1 - sinceLock * 3) : Math.floor(t * 5) % 2 === 0 ? 1 : 0.45;

  const name = ARCHETYPE_LABEL[shown].toUpperCase();

  const arrow = (side: "left" | "right") => (
    <div
      style={{
        position: "absolute",
        left: side === "left" ? 46 : 1080 - 46 - ARROW.width,
        top: 610,
        width: ARROW.width,
        height: ARROW.height,
        overflow: "hidden",
        opacity: arrowOpacity,
      }}
    >
      <img
        src={ARROWS_SRC}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: `${side === "left" ? ARROW.leftCrop : ARROW.rightCrop}%`,
          top: 0,
          width: `${ARROW.sheetWidthPct}%`,
          height: "100%",
          maxWidth: "none",
        }}
      />
    </div>
  );

  return (
    <PixelBackground durationMs={durationMs}>
      <Layer ref={sceneRef}>
        <CenteredText centerX={540} top={150} style={{ fontFamily: '"Joystix", monospace', fontSize: 52, lineHeight: 1.2, color: "#FFFFFF", textShadow: "0 6px 0 #2A1245" }}>
          SELECT YOUR
        </CenteredText>
        <CenteredText centerX={540} top={222} style={{ fontFamily: '"Joystix", monospace', fontSize: 52, lineHeight: 1.2, color: "#D478FB", textShadow: "0 6px 0 #2A1245" }}>
          CHARACTER
        </CenteredText>

        {/* Pedestal: the top of a podium pillar. */}
        <PlacedImage
          src={PILLAR_SRC}
          left={540 - 230}
          top={905}
          width={460}
          height={250}
          crop={{ left: 0, top: 0, width: 100, height: (2000 * 460) / 422 / 250 * 100 }}
        />
        <RobotSprite pose={robotPose} left={ROBOT.left} top={ROBOT.top - hop} scale={ROBOT_SCALE} />

        <ArchetypeBadge
          archetype={shown}
          left={BADGE.left - (BADGE.size * (pop - 1)) / 2}
          top={BADGE.top + badgeBob - (BADGE.size * (pop - 1)) / 2}
          size={BADGE.size * pop}
          rotate={12}
        />

        {arrow("left")}
        {arrow("right")}
      </Layer>

      <OnCard>
        <Layer ref={cardRef}>
          <CenteredText centerX={CARD_CX} top={64} style={{ ...inter, fontWeight: 700, fontSize: 32 }}>
            YOUR DEVS ARCHETYPE IS
          </CenteredText>
          <CenteredText
            centerX={CARD_CX - 4}
            top={130}
            style={{
              fontFamily: '"Joystix", monospace',
              fontSize: fitJoystix(name, 760, 110),
              lineHeight: 1.5,
              transform: `translateX(-50%) scale(${pop})`,
            }}
          >
            <OutlinedText fill={STAT_VALUE_FILL} stroke={{ ...STAT_VALUE_STROKE, width: 6 }}>
              {name}
            </OutlinedText>
          </CenteredText>
          <CenteredText
            centerX={CARD_CX}
            top={330}
            width={720}
            style={{ ...inter, fontWeight: 500, fontSize: 32, opacity: locked ? Math.min(1, sinceLock * 3) : 0 }}
          >
            {ARCHETYPE_BLURB[data.archetype]}
          </CenteredText>
        </Layer>
      </OnCard>
    </PixelBackground>
  );
}

ArchetypeSlide.preload = [ROBOT_SRC, ARCHETYPE_BADGES_SRC, ARROWS_SRC, PILLAR_SRC];
