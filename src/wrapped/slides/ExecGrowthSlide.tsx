import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OnCard } from "../components/OnCard";
import { CenteredText, Layer } from "../components/Placed";
import { countUpValue, useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

/**
 * Exec headshots. Each entry is the circle's Figma position and diameter
 * (x, y, size) plus where the photo sits inside that circle (dx, dy, w, h),
 * so off-center or non-square photos keep the framing chosen in Figma. The
 * Figma positions are the reduced-motion layout; otherwise the circles fall.
 */
type Headshot = [x: number, y: number, size: number, dx: number, dy: number, w: number, h: number];

const HEADSHOTS: Headshot[] = [
  [334.57, 5, 189.98, 0, 0, 189.98, 188.16],
  [773.34, 99.16, 188.16, 0, 0, 188.16, 188.16],
  [565.26, 44.55, 189.98, 0.62, 0, 189.98, 188.16],
  [428.73, 1486.11, 187.6, 0, 0, 188.16, 188.16],
  [560.55, 465.43, 187.6, 0, 0, 188.16, 188.16],
  [188.62, 278.06, 187.6, 0, 0, 188.16, 188.16],
  [100.11, 557.54, 175.66, -50.76, -4.72, 263.05, 175.37],
  [331.88, 557.54, 175.66, -5.97, -3.72, 188.16, 188.16],
  [888.22, 833.59, 175.66, -5.97, -3.83, 188.16, 188.16],
  [832.5, 559.29, 175.66, -5.97, -23.3, 188.16, 250.26],
  [147.19, 1466.33, 187.6, 0, 0, 188.16, 188.16],
  [909.87, 1278.96, 187.6, 0, 0, 188.16, 250.26],
  [665.06, 278.06, 187.6, 0, 0, 188.16, 188.16],
  [428.38, 1732.51, 175.66, -5.97, -3.72, 188.16, 188.16],
  [660.15, 1732.51, 175.66, -5.97, -17.35, 188.16, 232],
  [147.21, 1726.54, 187.6, 0, 0, 188.16, 188.16],
  [872.21, 297.83, 187.6, 0, 0, 188.16, 188.16],
  [-27, 833.59, 187.6, 0, 0, 188.16, 188.16],
  [616.1, 1492.7, 187.6, 0, 0, 188.16, 188.16],
  [146.25, 7.82, 185.44, -1.08, -0.67, 188.16, 188.16],
  [282.51, 1240.33, 187.6, 0, -10.03, 188.16, 197.29],
  [-18.53, 297.83, 187.6, -31.27, 0, 250.26, 188.16],
  [463.56, 816.64, 187.6, 0, 0, 188.16, 188.16],
  [188.62, 745.08, 187.6, 0, 0, 188.16, 188.16],
  [477.69, 1070.87, 187.6, 0, -19.49, 188.16, 250.26],
  [645.29, 761.09, 187.6, 0, -2.44, 188.16, 195.46],
  [74.69, 1107.59, 187.6, 0, -17.08, 188.16, 242.96],
  [679.81, 1009.29, 187.6, 0, 0, 188.16, 188.16],
  [679.81, 1253.32, 187.6, 0, 0, 188.16, 188.16],
  [276.19, 948.46, 187.6, -45.16, 0, 277.67, 188.16],
  [916.96, 1004.22, 187.6, 0, 0, 188.16, 188.16],
  [888.79, 1732.51, 175.66, -5.97, -22.18, 188.16, 246.61],
  [831.72, 1546.37, 175.66, -5.97, -2.55, 188.16, 184.5],
  [369.41, 265.82, 187.6, -9.85, 0, 206.42, 188.16],
  [491.81, 1294.97, 187.6, -37.39, 0, 263.05, 188.16],
];

const PHOTO_EXT: Record<number, string> = { 7: "jpg", 10: "jpg", 15: "jpg" };
const photoSrc = (n: number) => `/wrapped/exec-growth/exec-${String(n).padStart(2, "0")}.${PHOTO_EXT[n] ?? "png"}`;

// Headshot rain: the photos are scattered at random (seeded, so it's the
// same every play) over a tall sheet that drifts down through the frame and
// off the bottom (no floor), so every exec gets a few seconds on screen.
// A pure function of the slide clock.
const SCATTER_SEED = 2026;
/** Space between neighbouring photos — more than two opposite sways (2 x SWAY_PX), so faces never overlap. */
const SCATTER_GAP = 24;
/** Photos may hang this far off the side edges. */
const EDGE_BLEED = 30;
const SWAY_PX = 10;
const TILT_DEG = 5;
/** Leave the card's exit at the end of the slide with the last photo just clearing the frame. */
const CLEAR_BY_END_S = 0.4;

/** Small deterministic PRNG (LCG) so the scatter is identical on every play and in export. */
function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

/**
 * Random non-overlapping centers for every headshot on a sheet 1080 wide and
 * as tall as it needs to be: try random spots, and if one won't fit after
 * enough tries, make the sheet a little taller.
 */
function scatterHeadshots() {
  const rand = seededRandom(SCATTER_SEED);
  const radii = HEADSHOTS.map(([, , size]) => size / 2);
  let sheetHeight = 1800;
  for (;;) {
    const placed: Array<{ x: number; y: number; r: number }> = [];
    const fits = radii.every((r) => {
      for (let attempt = 0; attempt < 400; attempt++) {
        const x = r - EDGE_BLEED + rand() * (1080 - 2 * (r - EDGE_BLEED));
        const y = r + rand() * (sheetHeight - 2 * r);
        if (placed.every((p) => Math.hypot(p.x - x, p.y - y) >= p.r + r + SCATTER_GAP)) {
          placed.push({ x, y, r });
          return true;
        }
      }
      return false;
    });
    if (fits) return { centers: placed, sheetHeight };
    sheetHeight += 150;
  }
}

const SCATTER = scatterHeadshots();

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function Headshot({ n, dx, dy, w, h }: { n: number; dx: number; dy: number; w: number; h: number }) {
  return (
    <div style={{ position: "absolute", inset: 0, borderRadius: "50%", overflow: "hidden" }}>
      <img
        src={photoSrc(n)}
        alt=""
        draggable={false}
        style={{ position: "absolute", left: dx, top: dy, width: w, height: h, maxWidth: "none", objectFit: "cover" }}
      />
    </div>
  );
}

function FallingHeadshots({ durationMs }: { durationMs: number }) {
  const elapsedMs = useSlideClock(durationMs);
  const reduced = prefersReducedMotion();
  const t = elapsedMs / 1000;
  // The sheet starts just above the frame and travels until its top clears the
  // bottom edge by the end; speed comes from the slide length, so retiming the
  // slide keeps every photo passing through.
  const travel = SCATTER.sheetHeight + 1920;
  const sheetTop = -SCATTER.sheetHeight + (travel / Math.max(1, durationMs / 1000 - CLEAR_BY_END_S)) * t;

  return (
    <Layer>
      {HEADSHOTS.map(([fx, fy, size, dx, dy, w, h], i) => {
        const { x: cx, y: cy } = SCATTER.centers[i];
        const phase = i * 1.7;
        const x = reduced ? fx : cx - size / 2 + SWAY_PX * Math.sin(t * 1.3 + phase);
        const y = reduced ? fy : sheetTop + cy - size / 2;
        const tilt = reduced ? 0 : TILT_DEG * Math.sin(t * 0.9 + phase);
        if (y > 1920 || y < -size) return null;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: size,
              height: size,
              transform: `translate(${x}px, ${y}px) rotate(${tilt}deg)`,
              willChange: "transform",
            }}
          >
            <Headshot n={i + 1} dx={dx} dy={dy} w={w} h={h} />
          </div>
        );
      })}
    </Layer>
  );
}

const interBold: CSSProperties = { fontFamily: '"Inter", sans-serif', fontWeight: 700, fontSize: 32, lineHeight: 1.5 };

export function ExecGrowthSlide({ data, durationMs }: SlideProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const progress = useCountUp(durationMs);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (cardRef.current) applyEnterExit(tl, cardRef.current, duration, { enterMs: 900 });
    return tl;
  }, durationMs);

  return (
    <PixelBackground durationMs={durationMs}>
      <FallingHeadshots durationMs={durationMs} />

      <OnCard>
        <Layer ref={cardRef}>
          <CenteredText centerX={482} top={53} style={{ ...interBold, color: "#FFFFFF" }}>
            OUR TEAM ALSO GREW THIS YEAR
          </CenteredText>
          <CenteredText
            centerX={482}
            top={110}
            style={{ fontFamily: '"Joystix", monospace', fontSize: 96, lineHeight: 1.5, color: "#FFFFFF" }}
          >
            {`${countUpValue(data.execCount, progress)} EXECS`}
          </CenteredText>
          <CenteredText centerX={482} top={274} style={{ ...interBold, color: "#D5D4D4" }}>
            ON BOARD NOW
          </CenteredText>
        </Layer>
      </OnCard>
    </PixelBackground>
  );
}

ExecGrowthSlide.preload = HEADSHOTS.map((_, i) => photoSrc(i + 1));
