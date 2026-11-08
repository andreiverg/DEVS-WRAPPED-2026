import { useMemo, useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { StatCard } from "../components/StatCard";
import { RobotSprite, ROBOT_SRC } from "../components/RobotSprite";
import { prefersReducedMotion, seeded } from "../components/PersonalArt";
import { countUpValue, useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

/**
 * Events this member came to, as a camera roll: each event's photo is
 * snapped with a flash, pops up big in the middle of the frame, then flies
 * down into its spot in a scattered collage, while the card's counter ticks
 * up one event per snap. Pure function of the slide clock.
 */

type AttendedEvent = SlideProps["data"]["attendedEvents"][number];

const POLAROID_W = 270;
const POLAROID_H = 320;
const MAX_PHOTOS = 12;

// Snap pacing: slow first shots, speeding up, like someone getting into it.
const FIRST_SNAP_S = 0.7;
const FIRST_GAP_S = 0.45;
const GAP_SPEEDUP = 0.85;
const MIN_GAP_S = 0.12;
/** How long a fresh photo hangs big in the middle before flying to its spot. */
const HANG_S = 0.18;
const FLY_S = 0.4;
const FLASH_S = 0.16;
/** Events beyond the photos we have tick up on the counter over this long after the last snap. */
const TAIL_COUNT_S = 0.8;

// The collage area, below the stat card.
const AREA = { top: 760, bottom: 1860 };
const COLUMN_X = [215, 540, 865];
const POP = { x: 540, y: 1180, scale: 1.55 };

const pixelFont = { fontFamily: '"Minecraft", monospace', whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" } as const;

/** A pixel-bordered instant photo of one event, its name and date written on the strip. */
function Polaroid({ event }: { event: AttendedEvent }) {
  return (
    <div
      style={{
        width: POLAROID_W,
        height: POLAROID_H,
        boxSizing: "border-box",
        padding: 14,
        background: "#F1ECFA",
        border: "6px solid #1C1C1B",
        boxShadow: "8px 8px 0 rgba(13,7,20,0.45)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div style={{ flex: "0 0 200px", border: "4px solid #1C1C1B", background: "#2A1245", overflow: "hidden" }}>
        <img src={event.photoUrl} alt="" draggable={false} style={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
      <div style={{ ...pixelFont, marginTop: 12, fontSize: 22, color: "#2A1245" }}>{event.name}</div>
      <div style={{ ...pixelFont, marginTop: 4, fontSize: 18, color: "#7B3FE4" }}>{event.date}</div>
    </div>
  );
}

interface Shot {
  event: AttendedEvent;
  snapS: number;
  x: number;
  y: number;
  rotate: number;
}

/** Where each photo lands (a jittered 3-column grid) and when it's snapped. */
function layoutShots(events: AttendedEvent[]): Shot[] {
  const shown = events.slice(0, MAX_PHOTOS);
  const rows = Math.max(1, Math.ceil(shown.length / COLUMN_X.length));
  const rowStep = Math.min(300, (AREA.bottom - AREA.top) / rows);
  const top = AREA.top + (AREA.bottom - AREA.top - rowStep * rows) / 2;
  const rand = seeded(shown.length * 53 + 7);
  let snap = FIRST_SNAP_S;
  let gap = FIRST_GAP_S;
  return shown.map((event, i) => {
    const shot = {
      event,
      snapS: snap,
      x: COLUMN_X[i % COLUMN_X.length] + (rand() - 0.5) * 70,
      y: top + rowStep * (Math.floor(i / COLUMN_X.length) + 0.5) + (rand() - 0.5) * 50,
      rotate: (rand() - 0.5) * 24,
    };
    snap += gap;
    gap = Math.max(MIN_GAP_S, gap * GAP_SPEEDUP);
    return shot;
  });
}

const backOut = (x: number) => {
  const c1 = 1.70158;
  return 1 + (c1 + 1) * (x - 1) ** 3 + c1 * (x - 1) ** 2;
};
const lerp = (a: number, b: number, f: number) => a + (b - a) * f;

/** With no photos to show, the robot bops in their place. */
function IdleRobot({ t }: { t: number }) {
  const pose = Math.floor(t / 0.6) % 5;
  const bob = Math.abs(Math.sin((t * Math.PI) / 0.6)) * 30;
  return <RobotSprite pose={pose} left={540 - 300} top={1300 - bob} scale={600 / 423} />;
}

export function EventCorkboardSlide({ data, durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const cardRef = useRef<HTMLDivElement>(null);
  const progress = useCountUp(durationMs);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (cardRef.current) applyEnterExit(tl, cardRef.current, duration, { enterMs: 900 });
    return tl;
  }, durationMs);

  const shots = useMemo(() => layoutShots(data.attendedEvents), [data.attendedEvents]);
  const t = prefersReducedMotion() ? Infinity : elapsedMs / 1000;
  const count = data.eventsAttended;

  // Counter: one per snap, then any events without photos tick up after the last.
  let shown: string;
  if (shots.length === 0) {
    shown = countUpValue(count, progress);
  } else {
    const snapped = Math.min(count, shots.filter((s) => s.snapS <= t).length);
    const extra = Math.max(0, count - shots.length);
    const sinceLast = t - shots[shots.length - 1].snapS;
    shown = String(snapped + Math.round(extra * Math.max(0, Math.min(1, sinceLast / TAIL_COUNT_S))));
  }

  // The flash from the most recent snap.
  const lastFired = shots.filter((s) => s.snapS <= t).pop();
  const flashAge = lastFired ? t - lastFired.snapS : Infinity;
  const flash = flashAge < FLASH_S ? 0.6 * (1 - flashAge / FLASH_S) : 0;

  const share = data.societyEventsHeld > 0 ? Math.round((count / data.societyEventsHeld) * 100) : null;
  const noun = count === 1 ? "event" : "events";
  const caption =
    count === 0
      ? "events — next year's your year!"
      : share !== null
        ? `${noun}, ${Math.min(100, share)}% of everything we ran`
        : `${noun} this year`;

  return (
    <PixelBackground durationMs={durationMs}>
      {shots.length === 0 ? <IdleRobot t={Number.isFinite(t) ? t : 0} /> : null}

      {shots.map((shot, i) => {
        // Unsnapped photos stay mounted but hidden, so their images load before their snap.
        const age = t - shot.snapS;
        const f = Math.max(0, Math.min(1, (age - HANG_S) / FLY_S));
        const e = backOut(f);
        const x = lerp(POP.x, shot.x, e);
        const y = lerp(POP.y, shot.y, e);
        const scale = lerp(POP.scale, 1, e);
        const rotate = lerp(0, shot.rotate, e);
        // A snap starts as an over-exposed print that develops as it flies.
        const develop = Math.max(0, Math.min(1, age / (HANG_S + FLY_S)));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - POLAROID_W / 2,
              top: y - POLAROID_H / 2,
              transform: `rotate(${rotate}deg) scale(${scale})`,
              filter: develop < 1 ? `brightness(${lerp(2.2, 1, develop)})` : undefined,
              visibility: age < 0 ? "hidden" : "visible",
              pointerEvents: "none",
            }}
          >
            <Polaroid event={shot.event} />
          </div>
        );
      })}

      {/* Camera flash. */}
      {flash > 0 ? <div style={{ position: "absolute", inset: 0, background: "#FFFFFF", opacity: flash, pointerEvents: "none" }} /> : null}

      <StatCard ref={cardRef} label="YOU SHOWED UP TO" value={shown} caption={caption} />
    </PixelBackground>
  );
}

EventCorkboardSlide.preload = [ROBOT_SRC];
