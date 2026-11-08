import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { StatCard } from "../components/StatCard";
import { Layer, PlacedImage } from "../components/Placed";
import { prefersReducedMotion } from "../components/PersonalArt";
import { useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

const MONITOR_SRC = "/wrapped/intro/monitor-mascot.png";

/** Attendance tiers, best first; a member sits in the first one their percentile fits. */
const TIERS = [
  { max: 1, label: "TOP 1%", title: "legend" },
  { max: 5, label: "TOP 5%", title: "elite" },
  { max: 10, label: "TOP 10%", title: "locked in" },
  { max: 25, label: "TOP 25%", title: "regular" },
  { max: 50, label: "TOP 50%", title: "casual" },
  { max: 100, label: "EVERYONE", title: "lurker" },
] as const;

// Ladder rows below the stat card, canvas px.
const ROW = { left: 210, width: 763, height: 116, firstTop: 820, step: 140 };
const MARKER = { size: 132, left: 50 };

// The marker starts on the bottom rung and hops up one rung at a time.
const HOP_START_S = 0.9;
const HOP_S = 0.3;
const HOP_ARC_PX = 36;

const rowLabel: CSSProperties = { fontFamily: '"Joystix", monospace', fontSize: 44, lineHeight: 1 };
const rowTitle: CSSProperties = { fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 26, letterSpacing: "0.06em" };

function tierIndex(percentile: number): number {
  const i = TIERS.findIndex((t) => percentile <= t.max);
  return i === -1 ? TIERS.length - 1 : i;
}

const rowTop = (i: number) => ROW.firstTop + i * ROW.step;

/** Where the marker is at `t`: its row (fractional while hopping) and lift off the rung. */
function markerAt(t: number, target: number) {
  const bottom = TIERS.length - 1;
  const hops = bottom - target;
  const x = (t - HOP_START_S) / HOP_S;
  if (x <= 0) return { row: bottom, lift: 0, arrived: hops === 0 };
  if (x >= hops) return { row: target, lift: 0, arrived: true };
  const done = Math.floor(x);
  const f = x - done;
  return { row: bottom - done - f, lift: HOP_ARC_PX * Math.sin(Math.PI * f), arrived: false };
}

/** Attendance percentile: the headline number on the card, and a high-score ladder of tiers below it. */
export function PercentileSlide({ data, durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const cardRef = useRef<HTMLDivElement>(null);
  const ladderRef = useRef<HTMLDivElement>(null);
  const progress = useCountUp(durationMs);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (cardRef.current) applyEnterExit(tl, cardRef.current, duration, { enterMs: 900 });
    if (ladderRef.current) {
      const rows = ladderRef.current.querySelectorAll("[data-rung]");
      tl.fromTo(rows, { opacity: 0, x: 60 }, { opacity: 1, x: 0, duration: 0.35, stagger: 0.07, ease: "power2.out" }, 0.2);
      applyEnterExit(tl, ladderRef.current, duration, { enterMs: 1 });
    }
    return tl;
  }, durationMs);

  const p = data.attendancePercentile;
  const inTopHalf = p <= 50;
  // Top half counts down from 100% to their rank; otherwise count up how many they out-attended.
  const target = inTopHalf ? p : 100 - p;
  const shown = inTopHalf ? Math.round(100 - (100 - p) * progress) : Math.round(target * progress);

  const tier = tierIndex(p);
  const t = prefersReducedMotion() ? Infinity : elapsedMs / 1000;
  const marker = markerAt(t, tier);

  return (
    <PixelBackground durationMs={durationMs}>
      <StatCard
        ref={cardRef}
        label={inTopHalf ? "YOU'RE IN THE TOP" : "YOU SHOWED UP MORE THAN"}
        value={`${shown}%`}
        caption={inTopHalf ? "of DEVS members for showing up" : "of DEVS members this year"}
      />

      <Layer ref={ladderRef}>
        {TIERS.map((tierRow, i) => {
          const lit = marker.arrived && i === tier;
          return (
            <div
              key={tierRow.label}
              data-rung
              style={{
                position: "absolute",
                left: ROW.left,
                top: rowTop(i),
                width: ROW.width,
                height: ROW.height,
                boxSizing: "border-box",
                padding: "0 44px",
                borderRadius: 36,
                border: "5px solid transparent",
                background: lit
                  ? "linear-gradient(#3B1A70, #22103F) padding-box, linear-gradient(to bottom, #D478FB, #753EFF) border-box"
                  : "linear-gradient(#1C1C1B, #1C1C1B) padding-box, linear-gradient(to bottom, #555555, #333333) border-box",
                boxShadow: lit ? "0 0 40px rgba(212,120,251,0.55)" : "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                color: lit ? "#FFFFFF" : "#8E8799",
              }}
            >
              <span style={rowLabel}>{tierRow.label}</span>
              <span style={{ ...rowTitle, color: lit ? "#D478FB" : "#6E6878" }}>{tierRow.title.toUpperCase()}</span>
            </div>
          );
        })}

        {/* "YOU" marker: the monitor mascot, hopping up the ladder rung by rung. */}
        <div
          style={{
            position: "absolute",
            left: MARKER.left,
            top: rowTop(marker.row) + ROW.height / 2 - MARKER.size / 2 - marker.lift,
            width: MARKER.size,
            height: MARKER.size + 40,
          }}
        >
          <PlacedImage src={MONITOR_SRC} left={0} top={0} width={MARKER.size} height={MARKER.size * (770 / 704)} />
          <div
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: MARKER.size * (770 / 704) - 6,
              textAlign: "center",
              fontFamily: '"Joystix", monospace',
              fontSize: 26,
              color: "#FFFFFF",
              textShadow: "0 3px 0 #2A1245",
            }}
          >
            YOU
          </div>
        </div>
      </Layer>
    </PixelBackground>
  );
}

PercentileSlide.preload = [MONITOR_SRC];
