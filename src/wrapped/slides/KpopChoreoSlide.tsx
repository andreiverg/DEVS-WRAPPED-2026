import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OutlinedText } from "../components/OutlinedText";
import { CenteredText, Layer, PlacedImage } from "../components/Placed";
import { countUpValue, useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

/**
 * Rhythm-game K-pop slide on an arcade stage: four target arrows across the
 * top, notes scrolling up from the bottom to meet them, a "PERFECT!" pop on
 * every hit, and a dancing robot that jumps into a new pose on each hit.
 * Every frame is a pure function of the slide clock (no timers of its own),
 * so it renders identically live or under the stepped export.
 */

const ASSETS = "/wrapped/kpop-choreos";
const ARROWS_SRC = `${ASSETS}/arrows.png`;
const ROBOT_SRC = `${ASSETS}/robot.png`;

// Lane geometry from the Figma frame: each arrow is a 252x330 crop of the
// four-arrow sprite sheet (left, up, down, right), all at the same top.
const LANES = [
  { left: 53, cropLeft: 0 },
  { left: 296, cropLeft: -96.6 },
  { left: 539, cropLeft: -194.04 },
  { left: 788, cropLeft: -292.92 },
] as const;
const ARROW_W = 252;
const ARROW_H = 330;
const SHEET_W_PCT = 392.86;
const TARGET_TOP = 91;

// The chart: when (seconds into the slide) each lane's note lands. Four
// singles walking across, then a four-arrow chord to finish.
const CHART: Array<{ lane: number; hitS: number }> = [
  { lane: 0, hitS: 1.0 },
  { lane: 1, hitS: 1.4 },
  { lane: 2, hitS: 1.8 },
  { lane: 3, hitS: 2.2 },
  ...[0, 1, 2, 3].map((lane) => ({ lane, hitS: 2.9 })),
];
/** How long a note takes to scroll from the bottom edge up to its target. */
const NOTE_TRAVEL_S = 0.9;
/** A hit note flares and fades over this long. */
const HIT_FLASH_S = 0.15;
/** Target arrow's bounce on a hit. */
const BOUNCE_S = 0.26;
const BOUNCE_SCALE = 0.16;
/** "PERFECT!" pop on each hit. */
const POP_S = 0.3;
const EXIT_S = 0.7;

const HIT_TIMES = [...new Set(CHART.map((n) => n.hitS))].sort((a, b) => a - b);

const clamp01 = (x: number) => Math.max(0, Math.min(1, x));
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};
/** 0 -> 1 -> 0 hump over `durationS` after `startS`, else 0. */
const pulse = (t: number, startS: number, durationS: number) => {
  const x = (t - startS) / durationS;
  return x >= 0 && x <= 1 ? Math.sin(Math.PI * x) : 0;
};

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** One arrow from the sprite sheet, in its lane. */
function Arrow({ lane, style }: { lane: number; style?: CSSProperties }) {
  const { left, cropLeft } = LANES[lane];
  return (
    <div style={{ position: "absolute", left, top: 0, width: ARROW_W, height: ARROW_H, overflow: "hidden", ...style }}>
      <img
        src={ARROWS_SRC}
        alt=""
        draggable={false}
        style={{ position: "absolute", left: `${cropLeft}%`, top: 0, width: `${SHEET_W_PCT}%`, height: "100%", maxWidth: "none" }}
      />
    </div>
  );
}

/** Notes glow brighter than the targets so they read as "incoming". */
const NOTE_LOOK: CSSProperties = { filter: "brightness(1.5) saturate(1.15) drop-shadow(0 0 18px rgba(212,120,251,0.85))" };

// Dancing robot: a 5-pose sprite sheet (2172x724, drawn at 1:1). The Figma
// frame shows pose 1 in a 423x434 box; the other poses are the same box slid
// along the sheet so each stays centered on its own figure.
const ROBOT_BOX = { left: 336, top: 1247, width: 423, height: 434 };
const ROBOT_SHEET = { width: 2172, height: 724, top: -182 };
/** Each pose's horizontal offset into the sheet, px (pose 1's from Figma; the rest by figure center). */
const ROBOT_POSE_X = [40, 441.5, 857.5, 1273, 1723.5];
// A hop per hit: a quick crouch, up, swap pose at the top, squash on landing.
const JUMP_S = 0.34;
const JUMP_PX = 70;
const SQUASH = 0.08;

/** Where the robot is mid-hop at time `t`: lift, squash/stretch, and which pose it's showing. */
function robotPose(t: number) {
  // One pose change per hit (a chord counts once), returning to pose 1 after the fifth.
  let pose = 0;
  let liftPx = 0;
  let squash = 0;
  HIT_TIMES.forEach((hitS, i) => {
    const x = (t - hitS) / JUMP_S;
    if (x >= 0.5) pose = (i + 1) % ROBOT_POSE_X.length;
    if (x < 0 || x > 1) return;
    liftPx = JUMP_PX * Math.sin(Math.PI * x);
    // Crouch going up (first 15%) and on landing (last 15%); stretch in the air.
    squash = x < 0.15 ? Math.sin((Math.PI * x) / 0.15) : x > 0.85 ? Math.sin((Math.PI * (x - 0.85)) / 0.15) : -0.5 * Math.sin(Math.PI * x);
  });
  return { pose, liftPx, squash };
}

function DancingRobot({ t }: { t: number }) {
  const { pose, liftPx, squash } = robotPose(t);
  return (
    <div
      style={{
        position: "absolute",
        ...ROBOT_BOX,
        overflow: "hidden",
        transformOrigin: "50% 100%",
        transform: `translateY(${-liftPx}px) scale(${1 + SQUASH * squash}, ${1 - SQUASH * squash})`,
        pointerEvents: "none",
      }}
    >
      <img
        src={ROBOT_SRC}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: -ROBOT_POSE_X[pose],
          top: ROBOT_SHEET.top,
          width: ROBOT_SHEET.width,
          height: ROBOT_SHEET.height,
          maxWidth: "none",
        }}
      />
    </div>
  );
}

function RhythmGame({ durationMs }: { durationMs: number }) {
  const elapsedMs = useSlideClock(durationMs);
  const reduced = prefersReducedMotion();
  // Reduced motion: show the finished state — targets and PERFECT!, no notes.
  const t = reduced ? HIT_TIMES[HIT_TIMES.length - 1] + POP_S : elapsedMs / 1000;
  const exit = 1 - clamp01((t - (durationMs / 1000 - EXIT_S)) / EXIT_S);

  const lastHit = [...HIT_TIMES].reverse().find((h) => h <= t);
  const popK = lastHit === undefined ? 0 : clamp01((t - lastHit) / POP_S);
  const perfectScale = 0.6 + 0.4 * easeOutBack(popK);
  const perfectOpacity = lastHit === undefined ? 0 : lastHit === HIT_TIMES[0] ? clamp01(popK * 4) : 1;

  return (
    <Layer style={{ opacity: exit }}>
      {/* Notes, under the targets. */}
      {!reduced &&
        CHART.map(({ lane, hitS }, i) => {
          const untilHit = hitS - t;
          if (untilHit > NOTE_TRAVEL_S || -untilHit > HIT_FLASH_S) return null;
          const travelled = 1 - clamp01(untilHit / NOTE_TRAVEL_S);
          const y = 1920 - (1920 - TARGET_TOP) * travelled;
          const flash = clamp01(-untilHit / HIT_FLASH_S);
          return (
            <Arrow
              key={i}
              lane={lane}
              style={{
                ...NOTE_LOOK,
                transform: `translateY(${y}px) scale(${1 + 0.2 * flash})`,
                opacity: 1 - flash,
              }}
            />
          );
        })}

      {/* Targets: bounce whenever a note lands in their lane. */}
      {LANES.map((_, lane) => {
        const bounce = Math.max(0, ...CHART.filter((n) => n.lane === lane).map((n) => pulse(t, n.hitS, BOUNCE_S)));
        return (
          <Arrow key={lane} lane={lane} style={{ top: TARGET_TOP, transform: `scale(${1 + BOUNCE_SCALE * bounce})` }} />
        );
      })}

      <CenteredText
        centerX={540}
        top={421}
        style={{
          fontFamily: '"04b_19", monospace',
          fontSize: 74.6,
          lineHeight: "normal",
          opacity: perfectOpacity,
          transform: `translateX(-50%) scale(${perfectScale})`,
        }}
      >
        <OutlinedText fill={["#FFB247", "#FF6F2D"]} stroke={{ width: 5.1, colors: ["#000000", "#525252"] }}>
          PERFECT!
        </OutlinedText>
      </CenteredText>

      <DancingRobot t={t} />
    </Layer>
  );
}

const inter: CSSProperties = { fontFamily: '"Inter", sans-serif', fontSize: 32, lineHeight: 1.5, color: "#FFFFFF" };

export function KpopChoreoSlide({ data, durationMs }: SlideProps) {
  const statRef = useRef<HTMLDivElement>(null);
  const progress = useCountUp(durationMs);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (statRef.current) applyEnterExit(tl, statRef.current, duration, { enterMs: 900 });
    return tl;
  }, durationMs);

  return (
    <PixelBackground durationMs={durationMs}>
      <PlacedImage src={`${ASSETS}/arcade-stage.png`} left={-3} top={16} width={1083} height={1904} />
      <div style={{ position: "absolute", left: -2, top: 4, width: 1082, height: 1916, background: "rgba(0,0,0,0.5)" }} />

      <RhythmGame durationMs={durationMs} />

      {/* Stat sits over the notes; the robot (inside RhythmGame) dances below it. */}
      <Layer ref={statRef}>
        <CenteredText centerX={536} top={722} style={{ fontFamily: '"Joystix", monospace', fontSize: 200, lineHeight: 1.5 }}>
          <OutlinedText fill={["#FFFFFF", "#999999"]} stroke={{ width: 8, colors: ["#753EFF", "#A77FFF"] }}>
            {countUpValue(data.kpopChoreosTaught, progress)}
          </OutlinedText>
        </CenteredText>
        <CenteredText centerX={540.5} top={722} style={{ ...inter, fontWeight: 700 }}>
          YOU LEARNED
        </CenteredText>
        <CenteredText centerX={540} top={1013} style={{ ...inter, fontWeight: 500 }}>
          K-POP choreos this year
        </CenteredText>
      </Layer>
    </PixelBackground>
  );
}

KpopChoreoSlide.preload = [ARROWS_SRC, ROBOT_SRC, `${ASSETS}/arcade-stage.png`];
