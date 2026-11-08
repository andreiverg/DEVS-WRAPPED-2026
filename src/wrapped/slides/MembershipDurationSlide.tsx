import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { StatCard } from "../components/StatCard";
import { Layer, PlacedImage } from "../components/Placed";
import { RobotSprite, ROBOT_BOX, ROBOT_SRC } from "../components/RobotSprite";
import { PILLAR_SRC, prefersReducedMotion } from "../components/PersonalArt";
import { countUpValue, useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

/**
 * Membership length as an arcade level-up: every month in DEVS fills the XP
 * bar once and levels the robot up, faster and faster, with the member's
 * rank title changing as they cross each threshold. Every frame is a pure
 * function of the slide clock.
 */

const MONTH_ABBR = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_NAME = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** Rank titles by whole months of membership. */
const RANKS = [
  { months: 0, title: "FRESH SIGNUP" },
  { months: 1, title: "SETTLING IN" },
  { months: 3, title: "REGULAR" },
  { months: 6, title: "VETERAN" },
  { months: 12, title: "OG MEMBER" },
] as const;

const rankAt = (months: number) => RANKS.reduce((best, r) => (months >= r.months ? r : best), RANKS[0]);

// Level-up pacing: the first level takes longest, each after it a bit quicker.
const LEVEL_START_S = 0.8;
const MAX_LEVEL_SPAN_S = 3.4;
const LEVEL_MAX_S = 0.6;
const LEVEL_SPEEDUP = 0.86;
/** After the last level-up, the bar eases to this month's partial progress. */
const REMAINDER_FILL_S = 0.5;
const POPUP_S = 0.75;
const HOP_S = 0.3;
const SPARK_S = 0.55;

// Layout, canvas px.
const ROBOT_SCALE = 1.05;
const ROBOT_W = ROBOT_BOX.width * ROBOT_SCALE;
const ROBOT_H = ROBOT_BOX.height * ROBOT_SCALE;
const ROBOT_TOP = 790;
const PEDESTAL_TOP = ROBOT_TOP + ROBOT_H - 40;
const BAR = { left: 140, top: 1600, width: 800, height: 88 };

const joystix: CSSProperties = { fontFamily: '"Joystix", monospace', lineHeight: 1.2, color: "#FFFFFF" };

/** "2025-09-20" -> { year: 2025, month: 8 }, without Date (no timezone shifts). */
function parseSignup(iso: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return null;
  const month = Number(m[2]) - 1;
  return month >= 0 && month < 12 ? { year: Number(m[1]), month } : null;
}

/** When each level-up lands, seconds into the slide. */
function levelUpTimes(levels: number): number[] {
  if (levels === 0) return [];
  const weights = Array.from({ length: levels }, (_, i) => LEVEL_SPEEDUP ** i);
  const total = weights.reduce((a, b) => a + b, 0);
  const span = Math.min(MAX_LEVEL_SPAN_S, levels * LEVEL_MAX_S);
  let t = LEVEL_START_S;
  return weights.map((w) => (t += (w / total) * span));
}

/** A burst of pixel squares flying out from a point and fading. */
function Sparks({ cx, cy, age, seed }: { cx: number; cy: number; age: number; seed: number }) {
  if (age < 0 || age > SPARK_S) return null;
  const f = age / SPARK_S;
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = (i / 10) * Math.PI * 2 + seed;
        const dist = 120 + 260 * (1 - (1 - f) ** 2);
        const size = 22 - 10 * f;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: cx + Math.cos(angle) * dist - size / 2,
              top: cy + Math.sin(angle) * dist - size / 2,
              width: size,
              height: size,
              background: i % 2 ? "#D478FB" : "#FFCD48",
              opacity: 1 - f,
              boxShadow: "0 0 12px rgba(212,120,251,0.8)",
            }}
          />
        );
      })}
    </>
  );
}

export function MembershipDurationSlide({ data, durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const cardRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const progress = useCountUp(durationMs);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (cardRef.current) applyEnterExit(tl, cardRef.current, duration, { enterMs: 900 });
    if (sceneRef.current) applyEnterExit(tl, sceneRef.current, duration, { enterMs: 600 });
    return tl;
  }, durationMs);

  const days = data.membershipDurationDays;
  const months = data.isNewMember ? 0 : Math.max(1, Math.floor(days / 30));
  const remainder = data.isNewMember ? Math.min(1, days / 30) : (days % 30) / 30;
  const signup = parseSignup(data.signupDate);

  const times = levelUpTimes(months);
  const reduced = prefersReducedMotion();
  const t = reduced ? Infinity : elapsedMs / 1000;

  const level = times.filter((e) => e <= t).length;
  const lastUp = level > 0 ? times[level - 1] : null;
  const since = lastUp === null ? Infinity : t - lastUp;

  // Bar fill: the level in progress, or the leftover part of this month once maxed out.
  let fill: number;
  if (level < months) {
    const start = level === 0 ? LEVEL_START_S : times[level - 1];
    fill = Math.max(0, Math.min(1, (t - start) / (times[level] - start)));
  } else {
    const from = lastUp ?? LEVEL_START_S;
    fill = remainder * Math.max(0, Math.min(1, (t - from) / REMAINDER_FILL_S));
  }

  const rank = rankAt(level);
  const rankedUp = level > 0 && rankAt(level - 1) !== rank;
  const popup = since < POPUP_S ? since / POPUP_S : null;
  const hop = since < HOP_S ? Math.sin((Math.PI * since) / HOP_S) * 60 : 0;

  const monthIndex = signup ? signup.month + level : null;
  const xpMonth = monthIndex !== null && signup ? `${MONTH_ABBR[monthIndex % 12]} ${signup.year + Math.floor(monthIndex / 12)}` : "";

  const value = data.isNewMember ? countUpValue(days, progress) : String(level);
  const unit = data.isNewMember ? (days === 1 ? "day" : "days") : months === 1 ? "month" : "months";
  const caption = data.isNewMember
    ? `${unit} — welcome to the club!`
    : signup
      ? `${unit}, ever since ${MONTH_NAME[signup.month]} ${signup.year}`
      : unit;

  const robotCx = 540;
  const robotCy = ROBOT_TOP + ROBOT_H * 0.4;

  return (
    <PixelBackground durationMs={durationMs}>
      <Layer ref={sceneRef}>
        {/* Pedestal: the top of a podium pillar. */}
        <PlacedImage
          src={PILLAR_SRC}
          left={540 - 220}
          top={PEDESTAL_TOP}
          width={440}
          height={200}
          crop={{ left: 0, top: 0, width: 100, height: ((2000 * 440) / 422 / 200) * 100 }}
        />
        {lastUp !== null ? <Sparks cx={robotCx} cy={robotCy} age={since} seed={level * 0.7} /> : null}
        <RobotSprite
          pose={level % 5}
          left={robotCx - ROBOT_W / 2}
          top={ROBOT_TOP - hop}
          scale={ROBOT_SCALE}
          style={{ filter: since < 0.15 ? "brightness(1.8)" : undefined }}
        />

        {popup !== null ? (
          <div
            style={{
              ...joystix,
              position: "absolute",
              left: 0,
              right: 0,
              top: ROBOT_TOP - 40 - popup * 70,
              textAlign: "center",
              fontSize: rankedUp ? 76 : 64,
              color: rankedUp ? "#D478FB" : "#FFCD48",
              textShadow: "0 6px 0 #2A1245",
              opacity: popup < 0.7 ? 1 : 1 - (popup - 0.7) / 0.3,
              transform: `scale(${1 + 0.35 * Math.max(0, 1 - popup * 5)})`,
            }}
          >
            {rankedUp ? "RANK UP!" : "LEVEL UP!"}
          </div>
        ) : null}

        {/* Rank title, level and the month the XP is up to. */}
        <div style={{ ...joystix, position: "absolute", left: 0, right: 0, top: 1425, textAlign: "center", fontSize: 68, textShadow: "0 6px 0 #2A1245" }}>
          {rank.title}
        </div>
        <div
          style={{
            position: "absolute",
            left: BAR.left + 10,
            top: 1525,
            width: BAR.width - 20,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
          }}
        >
          <span style={{ ...joystix, fontSize: 48, color: "#D478FB" }}>{`LV ${level}`}</span>
          <span style={{ fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 28, letterSpacing: "0.06em", color: "#D5D4D4" }}>
            {xpMonth}
          </span>
        </div>

        {/* XP bar. */}
        <div
          style={{
            position: "absolute",
            ...BAR,
            boxSizing: "border-box",
            borderRadius: BAR.height / 2,
            border: "6px solid transparent",
            background: "linear-gradient(#1C1C1B, #1C1C1B) padding-box, linear-gradient(to bottom, #D478FB, #666666) border-box",
            overflow: "hidden",
            boxShadow: since < 0.25 ? "0 0 50px rgba(255,205,72,0.7)" : "0 0 24px rgba(117,62,255,0.35)",
          }}
        >
          <div
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              bottom: 8,
              width: `calc(${fill * 100}% - ${16 * fill}px)`,
              borderRadius: 30,
              background: since < 0.12 ? "#FFFFFF" : "linear-gradient(90deg, #753EFF, #D478FB)",
            }}
          />
          {/* Pixel segment ticks over the fill. */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "repeating-linear-gradient(90deg, transparent 0 46px, rgba(28,28,27,0.55) 46px 52px)",
            }}
          />
        </div>
      </Layer>

      <StatCard ref={cardRef} label="YOU'VE BEEN ONE OF US FOR" value={value} caption={caption} />
    </PixelBackground>
  );
}

MembershipDurationSlide.preload = [ROBOT_SRC, PILLAR_SRC];
