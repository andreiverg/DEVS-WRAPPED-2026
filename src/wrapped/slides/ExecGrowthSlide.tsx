import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OnCard } from "../components/OnCard";
import { CenteredText, Layer } from "../components/Placed";
import { PhysicsDrop, type DropBody } from "../components/PhysicsDrop";
import { getDropTrack } from "../components/dropSimulation";
import { countUpValue, useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

/**
 * Exec headshots. Each entry is the circle's Figma position and diameter
 * (x, y, size) plus where the photo sits inside that circle (dx, dy, w, h),
 * so off-center or non-square photos keep the framing chosen in Figma. Only
 * the diameter and framing are used now — the circles drop in under physics.
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

const DROP_COLUMNS = 5;

/**
 * Headshots start in staggered columns above the frame, each a little higher
 * than the last, so they rain down in sequence and pile up at the bottom.
 */
const HEADSHOT_BODIES: DropBody[] = HEADSHOTS.map(([, , size, dx, dy, w, h], i) => {
  const column = i % DROP_COLUMNS;
  const row = Math.floor(i / DROP_COLUMNS);
  const jitter = ((i * 37) % 60) - 30;
  return {
    shape: "circle",
    width: size,
    height: size,
    x: 110 + column * 215 + jitter,
    y: -150 - row * 230 - column * 45,
    content: (
      <div style={{ position: "relative", width: size, height: size, borderRadius: "50%", overflow: "hidden" }}>
        <img
          src={photoSrc(i + 1)}
          alt=""
          draggable={false}
          style={{ position: "absolute", left: dx, top: dy, width: w, height: h, maxWidth: "none", objectFit: "cover" }}
        />
      </div>
    ),
  };
});

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
      <PhysicsDrop bodies={HEADSHOT_BODIES} durationMs={durationMs} />

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
ExecGrowthSlide.prepare = (durationMs: number) => {
  getDropTrack(HEADSHOT_BODIES, durationMs);
};
