import { useEffect, useMemo, useRef } from "react";
import type { CSSProperties } from "react";
import { useSlideClock } from "../engine/Timeline";

/**
 * Pixel-art mountain climb visualizing "top X% of members" (lower is more
 * elite). Everything animated here is a pure function of `elapsedMs` from
 * `useSlideClock` — never its own rAF/Date.now — so a single frame renders
 * identically whether driven by the live clock or the stepped render clock
 * used by the Playwright/ffmpeg export pipeline.
 */

export interface MountainCheckpoint {
  /** Climb position, 0-100 (0 = ground, 100 = summit). */
  percent: number;
  label: string;
}

interface MountainProgressTrackerProps {
  /** Attendance percentile, 1-100, lower = more elite (8 = top 8%). */
  percentile: number;
  durationMs: number;
  checkpoints?: MountainCheckpoint[];
}

// ---------- low-res buffer: rendered small on purpose, then scaled up via
// CSS `image-rendering: pixelated` for the hard pixel-stepping look. ----------
const W = 216;
const H = 384;

const DRAW_ON_MS = 1200;
const CROWN_FADE_MS = 400;

// ---------- geometry data (percent-based, 0-100 over W/H) — wide enough
// that the base runs past both canvas edges. ----------
const MOUNTAIN = { apex: { x: 50, y: 11 }, baseLeft: { x: -12, y: 88 }, baseRight: { x: 112, y: 88 } };
const SNOW_CAP_FRACTION = 0.22;
const GROUND_TOP_PCT = 88;
const GROUND_BOTTOM_PCT = 100;

// Shorter, darker ranges behind the main peak — flat silhouettes for depth.
const BACK_RANGES: Array<{ color: string; ridge: Array<{ x: number; y: number }> }> = [
  {
    color: "#170E29",
    ridge: [
      { x: -12, y: 55 }, { x: 8, y: 42 }, { x: 24, y: 52 },
      { x: 42, y: 38 }, { x: 60, y: 50 }, { x: 78, y: 40 },
      { x: 96, y: 53 }, { x: 112, y: 44 },
    ],
  },
  {
    color: "#100A1D",
    ridge: [
      { x: -12, y: 66 }, { x: 14, y: 56 }, { x: 34, y: 63 },
      { x: 52, y: 52 }, { x: 70, y: 62 }, { x: 90, y: 54 },
      { x: 112, y: 64 },
    ],
  },
];

// Amplitude tapers as the path nears the apex — the mountain narrows a lot
// faster than a naive fixed zigzag width, so late waypoints kept close to
// the ground-level swing (e.g. x:60 at y:19) end up outside the silhouette.
const PATH_WAYPOINTS = [
  { x: 50, y: 97 },
  { x: 78, y: 79 },
  { x: 32, y: 63 },
  { x: 70, y: 47 },
  { x: 40, y: 33 },
  { x: 56, y: 23 },
  { x: 48, y: 17 },
  { x: 50, y: 11 },
];

const DEFAULT_CHECKPOINTS: MountainCheckpoint[] = [
  { percent: 15, label: "Base camp" },
  { percent: 35, label: "Ridge" },
  { percent: 55, label: "Traverse" },
  { percent: 75, label: "Upper face" },
  { percent: 100, label: "Summit" },
];

const STAR_COUNT = 50;
const STARS = (() => {
  let s = 1337;
  const rnd = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
  return Array.from({ length: STAR_COUNT }, () => ({
    x: rnd() * 100,
    y: rnd() * 58,
    phase: rnd() * Math.PI * 2,
    speed: 0.5 + rnd() * 1.0,
  }));
})();

interface CloudLayer {
  speedPctPerSec: number;
  alpha: number;
  y: number;
  blocks: Array<[number, number, number, number]>;
}

const CLOUD_LAYERS: CloudLayer[] = [
  { speedPctPerSec: 1.6, alpha: 0.16, y: 14, blocks: [[0, 0, 10, 3], [3, -2, 6, 2], [10, 1, 8, 2]] },
  { speedPctPerSec: 1.6, alpha: 0.16, y: 30, blocks: [[0, 0, 12, 3], [4, -2, 7, 2]] },
  { speedPctPerSec: 3.2, alpha: 0.24, y: 22, blocks: [[0, 0, 8, 2], [2, -2, 5, 2]] },
  { speedPctPerSec: 3.2, alpha: 0.24, y: 42, blocks: [[0, 0, 10, 3], [5, -1, 6, 2], [-3, 1, 5, 2]] },
];

const CLOUDS = [
  { layer: 0, baseX: 5 },
  { layer: 1, baseX: 55 },
  { layer: 2, baseX: 30 },
  { layer: 3, baseX: 75 },
];

// ---------- twilight sky (4x4 Bayer dithering), master palette ----------
const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16));

const SKY_BANDS: Array<{ stop: number; color: [number, number, number] }> = [
  { stop: 0.0, color: [13, 7, 20] }, // near-black #0D0714
  { stop: 0.3, color: [42, 18, 69] }, // deep purple #2A1245
  { stop: 0.55, color: [123, 63, 228] }, // hero purple #7B3FE4
  { stop: 0.78, color: [155, 95, 240] }, // glow purple #9B5FF0 (brightest band)
  { stop: 1.0, color: [74, 95, 217] }, // support blue #4A5FD9
];

const COLORS = {
  mountainBody: "#2A1245",
  mountainLine: "#170E29",
  snow: "#FFFFFF",
  snowShade: "#C9BEDD",
  rock: "#170E29",
  ground: "#0D0714",
  groundTop: "#2A1245",
  pathDim: "rgba(201,190,221,0.25)",
  pathGlow: "#7B3FE4",
  pathGlowCore: "#FFFFFF",
  flagLocked: "#3A2E52",
  flagCompleted: "#4A5FD9",
  flagCurrent: "#7B3FE4",
  flagPole: "#0D0714",
} as const;

const CROWN_HEIGHTS = [1, 3, 1, 0, 4, 0, 1, 3, 1];
const CROWN_BAND_H = 3;
const CROWN_MAX_H = 4;
const CROWN_W = CROWN_HEIGHTS.length;
const CROWN_JEWEL_COLS = [1, 4, 7];
const CROWN_GAP = 5;
const SUMMIT_FLAG_SIZE = 1.5;
const SUMMIT_POLE_H = 10 * SUMMIT_FLAG_SIZE;

// ---------- pure geometry helpers ----------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const px = (pct: number, dim: number) => (pct / 100) * dim;

function sampleBand(t: number): [number, number, number] {
  for (let i = 0; i < SKY_BANDS.length - 1; i++) {
    const a = SKY_BANDS[i];
    const b = SKY_BANDS[i + 1];
    if (t >= a.stop && t <= b.stop) {
      const lt = (t - a.stop) / (b.stop - a.stop);
      return [
        lerp(a.color[0], b.color[0], lt),
        lerp(a.color[1], b.color[1], lt),
        lerp(a.color[2], b.color[2], lt),
      ];
    }
  }
  return SKY_BANDS[SKY_BANDS.length - 1].color;
}

const SKY_H = Math.round(H * (GROUND_TOP_PCT / 100));

/** Built once and cached — the sky doesn't animate, only stars/clouds atop it do. */
let cachedSky: HTMLCanvasElement | null = null;
function getSkyCanvas(): HTMLCanvasElement {
  if (cachedSky) return cachedSky;
  const sky = document.createElement("canvas");
  sky.width = W;
  sky.height = SKY_H;
  const sctx = sky.getContext("2d")!;
  const img = sctx.createImageData(W, SKY_H);
  const LEVELS = 10;
  for (let y = 0; y < SKY_H; y++) {
    const t = y / (SKY_H - 1);
    for (let x = 0; x < W; x++) {
      const threshold = BAYER4[y % 4][x % 4];
      const stepped = Math.floor(t * LEVELS + threshold - 0.5) / LEVELS;
      const [r, g, b] = sampleBand(Math.min(1, Math.max(0, stepped)));
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  sctx.putImageData(img, 0, 0);
  cachedSky = sky;
  return sky;
}

const wp = PATH_WAYPOINTS.map((p) => ({ x: px(p.x, W), y: px(p.y, H) }));
const segLens: number[] = [];
let totalLen = 0;
for (let i = 0; i < wp.length - 1; i++) {
  const d = Math.hypot(wp[i + 1].x - wp[i].x, wp[i + 1].y - wp[i].y);
  segLens.push(d);
  totalLen += d;
}

function pointAtLength(len: number) {
  let remaining = Math.max(0, Math.min(len, totalLen));
  for (let i = 0; i < segLens.length; i++) {
    if (remaining <= segLens[i] || i === segLens.length - 1) {
      const t = segLens[i] === 0 ? 0 : remaining / segLens[i];
      return {
        x: lerp(wp[i].x, wp[i + 1].x, Math.min(1, t)),
        y: lerp(wp[i].y, wp[i + 1].y, Math.min(1, t)),
      };
    }
    remaining -= segLens[i];
  }
  return wp[wp.length - 1];
}

const lengthAtPercent = (pct: number) => (pct / 100) * totalLen;

const snowCapY = MOUNTAIN.apex.y + (MOUNTAIN.baseLeft.y - MOUNTAIN.apex.y) * SNOW_CAP_FRACTION;
const leftAtY = (y: number) =>
  lerp(MOUNTAIN.apex.x, MOUNTAIN.baseLeft.x, (y - MOUNTAIN.apex.y) / (MOUNTAIN.baseLeft.y - MOUNTAIN.apex.y));
const rightAtY = (y: number) =>
  lerp(MOUNTAIN.apex.x, MOUNTAIN.baseRight.x, (y - MOUNTAIN.apex.y) / (MOUNTAIN.baseRight.y - MOUNTAIN.apex.y));

let jagSeed = 99;
const nextJagRnd = () => {
  jagSeed = (jagSeed * 48271) % 0x7fffffff;
  return jagSeed / 0x7fffffff;
};

const jaggedPoints = (() => {
  const steps = 16;
  const pts: Array<{ x: number; y: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const xL = leftAtY(snowCapY);
    const xR = rightAtY(snowCapY);
    const x = lerp(xL, xR, t);
    const jitter = (nextJagRnd() - 0.5) * 4.5;
    pts.push({ x, y: snowCapY + jitter });
  }
  return pts;
})();

const snowDetails = (() => {
  const spurs: Array<{ x: number; yTop: number; yBottom: number; w: number }> = [];
  for (let i = 1; i < jaggedPoints.length - 1; i += 3) {
    const p = jaggedPoints[i];
    const h = 3 + nextJagRnd() * 7;
    spurs.push({ x: p.x, yTop: p.y - h, yBottom: p.y + 1, w: 1.5 + nextJagRnd() });
  }
  const patches: Array<{ x: number; y: number; w: number; h: number }> = [];
  for (let i = 0; i < 5; i++) {
    const y = snowCapY - 2 - nextJagRnd() * (snowCapY - MOUNTAIN.apex.y - 4);
    const xL = leftAtY(y);
    const xR = rightAtY(y);
    patches.push({
      x: lerp(xL, xR, 0.2 + nextJagRnd() * 0.6),
      y,
      w: 2 + nextJagRnd() * 2,
      h: 1 + nextJagRnd(),
    });
  }
  return { spurs, patches };
})();

function drawMountainMask(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(px(MOUNTAIN.baseLeft.x, W), px(MOUNTAIN.baseLeft.y, H));
  ctx.lineTo(px(MOUNTAIN.apex.x, W), px(MOUNTAIN.apex.y, H));
  ctx.lineTo(px(MOUNTAIN.baseRight.x, W), px(MOUNTAIN.baseRight.y, H));
  ctx.closePath();
}

function drawCrown(ctx: CanvasRenderingContext2D, apexPx: { x: number; y: number }, appear: number, timeSec: number, reduced: boolean) {
  if (appear <= 0.01) return;
  const scale = 0.55 + 0.45 * appear;
  const bob = reduced ? 0 : Math.sin(timeSec * 3) * 1;
  const totalH = CROWN_MAX_H + CROWN_BAND_H;
  const flagBannerTop = apexPx.y - SUMMIT_POLE_H;

  ctx.save();
  ctx.globalAlpha = appear;
  ctx.translate(apexPx.x, flagBannerTop - CROWN_GAP - totalH * scale + bob);
  ctx.scale(scale, scale);
  for (let col = 0; col < CROWN_W; col++) {
    const dx = col - CROWN_W / 2;
    const h = CROWN_HEIGHTS[col];
    ctx.fillStyle = COLORS.snow;
    for (let by = 0; by < CROWN_BAND_H; by++) {
      ctx.fillRect(Math.round(dx), CROWN_MAX_H + by, 1, 1);
    }
    for (let sy = 0; sy < h; sy++) {
      ctx.fillRect(Math.round(dx), CROWN_MAX_H - 1 - sy, 1, 1);
    }
  }
  ctx.fillStyle = COLORS.pathGlow;
  for (const col of CROWN_JEWEL_COLS) {
    const dx = col - CROWN_W / 2;
    const h = CROWN_HEIGHTS[col];
    ctx.fillRect(Math.round(dx), CROWN_MAX_H - h, 1, 1);
  }
  ctx.restore();
}

interface FrameParams {
  drawnLen: number;
  timeSec: number;
  climbPercent: number;
  checkpointPoints: Array<MountainCheckpoint & { pt: { x: number; y: number } }>;
  crownAppear: number;
  reduced: boolean;
}

function drawFrame(ctx: CanvasRenderingContext2D, p: FrameParams) {
  const { drawnLen, timeSec, climbPercent, checkpointPoints, crownAppear, reduced } = p;

  ctx.drawImage(getSkyCanvas(), 0, 0);

  // stars
  ctx.save();
  for (const star of STARS) {
    const twinkle = reduced ? 0.85 : 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(timeSec * star.speed + star.phase));
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(Math.round(px(star.x, W)), Math.round(px(star.y, H)), 1, 1);
  }
  ctx.restore();

  // clouds — position is a pure function of timeSec, never accumulated state
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, SKY_H);
  ctx.clip();
  for (const cloud of CLOUDS) {
    const layer = CLOUD_LAYERS[cloud.layer];
    const t = reduced ? 0 : timeSec;
    const x = (cloud.baseX + layer.speedPctPerSec * t) % 130;
    const baseX = px(x - 15, W);
    const baseY = px(layer.y, H);
    ctx.fillStyle = `rgba(230,225,240,${layer.alpha})`;
    for (const [bx, by, bw, bh] of layer.blocks) {
      ctx.fillRect(Math.round(baseX + px(bx, W)), Math.round(baseY + px(by, H)), Math.round(px(bw, W)), Math.round(px(bh, H)));
      ctx.fillRect(Math.round(baseX + px(bx + 30, W)), Math.round(baseY + px(by, H)), Math.round(px(bw, W)), Math.round(px(bh, H)));
    }
  }
  ctx.restore();

  // back mountain ranges
  for (const range of BACK_RANGES) {
    ctx.beginPath();
    ctx.moveTo(px(range.ridge[0].x, W), px(GROUND_TOP_PCT, H));
    for (const rp of range.ridge) ctx.lineTo(px(rp.x, W), px(rp.y, H));
    ctx.lineTo(px(range.ridge[range.ridge.length - 1].x, W), px(GROUND_TOP_PCT, H));
    ctx.closePath();
    ctx.fillStyle = range.color;
    ctx.fill();
  }

  // ground
  ctx.fillStyle = COLORS.groundTop;
  ctx.fillRect(0, Math.round(px(GROUND_TOP_PCT, H)), W, 2);
  ctx.fillStyle = COLORS.ground;
  ctx.fillRect(0, Math.round(px(GROUND_TOP_PCT, H)) + 2, W, Math.round(px(GROUND_BOTTOM_PCT - GROUND_TOP_PCT, H)));

  // mountain body + snow cap + detail
  ctx.save();
  drawMountainMask(ctx);
  ctx.clip();
  ctx.fillStyle = COLORS.mountainBody;
  ctx.fillRect(0, 0, W, H);

  ctx.beginPath();
  ctx.moveTo(jaggedPoints[0].x, 0);
  ctx.lineTo(jaggedPoints[0].x, jaggedPoints[0].y);
  for (const jp of jaggedPoints) ctx.lineTo(jp.x, jp.y);
  ctx.lineTo(jaggedPoints[jaggedPoints.length - 1].x, 0);
  ctx.closePath();
  ctx.fillStyle = COLORS.snow;
  ctx.fill();

  ctx.fillStyle = COLORS.rock;
  for (const spur of snowDetails.spurs) {
    ctx.fillRect(Math.round(spur.x - spur.w / 2), Math.round(spur.yTop), Math.round(spur.w), Math.round(spur.yBottom - spur.yTop));
  }
  ctx.fillStyle = COLORS.snowShade;
  for (const patch of snowDetails.patches) {
    ctx.fillRect(Math.round(patch.x), Math.round(patch.y), Math.round(patch.w), Math.round(patch.h));
  }
  ctx.restore();

  ctx.strokeStyle = COLORS.mountainLine;
  ctx.lineWidth = 1;
  drawMountainMask(ctx);
  ctx.stroke();

  // dim full path
  ctx.beginPath();
  ctx.moveTo(wp[0].x, wp[0].y);
  for (let i = 1; i < wp.length; i++) ctx.lineTo(wp[i].x, wp[i].y);
  ctx.setLineDash([2, 2]);
  ctx.strokeStyle = COLORS.pathDim;
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.setLineDash([]);

  // lit progress line, truncated to drawnLen
  if (drawnLen > 0.5) {
    const litPts = [wp[0]];
    let acc = 0;
    for (let i = 0; i < segLens.length; i++) {
      if (acc + segLens[i] <= drawnLen) {
        litPts.push(wp[i + 1]);
        acc += segLens[i];
      } else {
        litPts.push(pointAtLength(drawnLen));
        break;
      }
    }
    ctx.beginPath();
    ctx.moveTo(litPts[0].x, litPts[0].y);
    for (let i = 1; i < litPts.length; i++) ctx.lineTo(litPts[i].x, litPts[i].y);
    ctx.strokeStyle = COLORS.pathGlow;
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.strokeStyle = COLORS.pathGlowCore;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  // flags
  for (const cp of checkpointPoints) {
    const isCurrent = cp.percent <= climbPercent && !checkpointPoints.some((o) => o.percent > cp.percent && o.percent <= climbPercent);
    const isCompleted = cp.percent <= climbPercent;
    const isSummit = cp.percent === 100;
    const size = isSummit ? SUMMIT_FLAG_SIZE : 1;

    const pulse = reduced ? 1 : isCurrent ? 0.75 + 0.25 * Math.sin(timeSec * 4) : isCompleted ? 0.9 + 0.1 * Math.sin(timeSec * 1.6) : 1;
    const color = isCurrent ? COLORS.flagCurrent : isCompleted ? COLORS.flagCompleted : COLORS.flagLocked;

    const poleH = 10 * size;
    const fx = Math.round(cp.pt.x);
    const fy = Math.round(cp.pt.y);

    ctx.globalAlpha = isCurrent || isCompleted ? pulse : 0.7;
    ctx.fillStyle = COLORS.flagPole;
    ctx.fillRect(fx, fy - poleH, 1, poleH);
    ctx.fillStyle = color;
    ctx.fillRect(fx + 1, fy - poleH, Math.round(6 * size), Math.round(4 * size));
    if (isCurrent) {
      const glowCx = fx + 3 * size;
      const glowCy = fy - poleH / 2;
      const glowR = poleH / 2 + 5 * size;
      ctx.globalAlpha = 0.25 * pulse;
      ctx.beginPath();
      ctx.arc(glowCx, glowCy, glowR, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  const summitPx = { x: px(MOUNTAIN.apex.x, W), y: px(MOUNTAIN.apex.y, H) };
  drawCrown(ctx, summitPx, crownAppear, timeSec, reduced);
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const overlayStyle: CSSProperties = {
  position: "absolute",
  top: "5%",
  left: "6%",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 2,
  pointerEvents: "none",
};

const pctStyle: CSSProperties = {
  fontFamily: '"Jersey 10", monospace',
  fontSize: "clamp(32px, 7vw, 56px)",
  color: "#FFFFFF",
  textShadow: "0 0 6px rgba(155,95,240,0.9), 0 0 16px rgba(123,63,228,0.6)",
  fontVariantNumeric: "tabular-nums",
};

const captionStyle: CSSProperties = {
  fontFamily: '"Space Grotesk", sans-serif',
  fontWeight: 700,
  fontSize: "clamp(11px, 1.8vw, 16px)",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#C9BEDD",
};

export function MountainProgressTracker({ percentile, durationMs, checkpoints = DEFAULT_CHECKPOINTS }: MountainProgressTrackerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedMs = useSlideClock(durationMs);

  // 1% is the display floor — "top 0%" isn't a real ranking.
  const topPercent = Math.max(1, Math.min(100, Math.round(percentile)));
  const climbPercent = Math.max(0, Math.min(100, 100 - topPercent));

  const checkpointPoints = useMemo(
    () => checkpoints.map((cp) => ({ ...cp, pt: pointAtLength(lengthAtPercent(cp.percent)) })),
    [checkpoints],
  );

  // Computed once per tick and shared by the canvas draw and the readout
  // below, so the displayed number always matches exactly how far the line
  // has drawn — not a second timer that could drift out of sync with it.
  const reduced = prefersReducedMotion();
  const targetLen = lengthAtPercent(climbPercent);
  const drawT = reduced ? 1 : Math.min(1, elapsedMs / DRAW_ON_MS);
  const eased = 1 - Math.pow(1 - drawT, 3);
  const drawnLen = targetLen * eased;
  const displayedTopPercent = Math.round(100 - (drawnLen / totalLen) * 100);

  const showsCrown = topPercent <= 1;
  const crownAppear = !showsCrown ? 0 : reduced ? 1 : Math.min(1, Math.max(0, (elapsedMs - DRAW_ON_MS) / CROWN_FADE_MS));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;

    drawFrame(ctx, {
      drawnLen,
      timeSec: elapsedMs / 1000,
      climbPercent,
      checkpointPoints,
      crownAppear,
      reduced,
    });
  }, [elapsedMs, drawnLen, climbPercent, checkpointPoints, crownAppear, reduced]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
      />
      <div style={overlayStyle}>
        <span style={captionStyle}>top</span>
        <span style={pctStyle}>{displayedTopPercent}%</span>
        <span style={captionStyle}>of members</span>
      </div>
    </div>
  );
}
