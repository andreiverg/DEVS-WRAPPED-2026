import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { SocietyStatCard } from "../components/SocietyStatCard";
import { Layer, PlacedImage } from "../components/Placed";
import { countUpValue, useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

const ASSETS = "/wrapped/society-events";

/** Every poster in the collage shares the checker's tilt. */
const TILT = 19.09;

type Poster = { file: string; left: number; top: number; width: number; height: number };

/**
 * Poster collage in three tilted columns, drawn back to front. Each column
 * drifts along its own tilt — `direction` 1 slides it down the slant, -1 up.
 */
const COLUMNS: Array<{ direction: 1 | -1; posters: Poster[] }> = [
  {
    direction: -1,
    posters: [
      { file: "poster-mid-1.png", left: 505.19, top: -155.11, width: 662.54, height: 828.18 },
      { file: "poster-mid-2.jpg", left: 220.5, top: 639.92, width: 662.54, height: 883.39 },
      { file: "poster-mid-3.png", left: -64.19, top: 1490.16, width: 662.54, height: 828.18 },
    ],
  },
  {
    direction: 1,
    posters: [
      { file: "poster-left-4.gif", left: -747.62, top: 1357.16, width: 662.54, height: 828.18 },
      { file: "poster-left-3.gif", left: -472.47, top: 560.01, width: 663.77, height: 828.79 },
      { file: "poster-left-2.jpg", left: -203.75, top: -267.55, width: 688.31, height: 860.08 },
      { file: "poster-left-1.png", left: 89.43, top: -1063.42, width: 662.54, height: 828.18 },
    ],
  },
  {
    direction: 1,
    posters: [
      { file: "poster-right-1.png", left: 1275.17, top: -307.22, width: 662.54, height: 828.18 },
      { file: "poster-right-2.png", left: 999.51, top: 489.33, width: 662.54, height: 828.18 },
      { file: "poster-right-3.gif", left: 722.84, top: 1285.82, width: 663.77, height: 830.63 },
      { file: "poster-right-4.png", left: 435.21, top: 2080.54, width: 662.54, height: 828.18 },
    ],
  },
];

/** Drift speed along the column slant, canvas px per second. */
const DRIFT_PX_PER_SEC = 32;
/** Unit vector pointing "down" a column: the vertical axis rotated by TILT. */
const TILT_RAD = (TILT * Math.PI) / 180;
const DOWN_SLANT = { x: -Math.sin(TILT_RAD), y: Math.cos(TILT_RAD) };

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function SocietyEventsSlide({ data, durationMs }: SlideProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const progress = useCountUp(durationMs);
  // Pure function of the slide clock (not its own timer), like every other
  // animated layer, so it renders identically live or under stepped export.
  const elapsedMs = useSlideClock(durationMs);
  const drift = prefersReducedMotion() ? 0 : (elapsedMs / 1000) * DRIFT_PX_PER_SEC;

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (cardRef.current) applyEnterExit(tl, cardRef.current, duration, { enterMs: 900 });
    return tl;
  }, durationMs);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden", background: "#0D0714" }}>
      <Layer>
        {/* Tilted, half-strength copy of the shared checker backdrop behind the posters. */}
        <div
          style={{
            position: "absolute",
            left: 38.42,
            top: 6.5,
            width: 1080,
            height: 1920,
            transform: `rotate(${TILT}deg)`,
            opacity: 0.5,
          }}
        >
          <PixelBackground durationMs={durationMs} />
        </div>
        {COLUMNS.map(({ direction, posters }) => {
          const travel = direction * drift;
          return (
            <Layer
              key={posters[0].file}
              style={{ transform: `translate(${DOWN_SLANT.x * travel}px, ${DOWN_SLANT.y * travel}px)` }}
            >
              {posters.map((p) => (
                <PlacedImage key={p.file} src={`${ASSETS}/${p.file}`} {...p} rotate={TILT} />
              ))}
            </Layer>
          );
        })}
      </Layer>
      <div style={{ position: "absolute", left: 0, top: 0, width: 1081, height: 1932, background: "rgba(17,9,28,0.4)" }} />

      <SocietyStatCard
        ref={cardRef}
        label="THIS YEAR WE HELD"
        value={countUpValue(data.societyEventsHeld, progress)}
        caption="EVENTS ACROSS THE WHOLE SOCIETY"
      />
    </div>
  );
}

SocietyEventsSlide.preload = COLUMNS.flatMap(({ posters }) => posters.map((p) => `${ASSETS}/${p.file}`));
