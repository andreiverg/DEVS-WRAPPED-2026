import { useEffect, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";
import { useSlideClock } from "../engine/Timeline";

/**
 * Shared pixel-art shell behind the "general" slides (intro, the "now let's
 * talk about you" pivot, recap, stat reveals, etc.) — a static twilight
 * gradient wash with a tilted, drifting checkerboard overlay on top. Same
 * low-res-buffer + `image-rendering: pixelated` technique and palette as
 * the mountain-climb percentile slide (`MountainProgressTracker.tsx`), so
 * both scenes read as one world. See MASTER.md "Design system" for the
 * source values.
 */

// ---------- low-res buffer, scaled up via CSS for the hard pixel look ----------
const W = 108;
const H = 192;

const TILE = 12;
const TILT_RAD = (18 * Math.PI) / 180;
const DRIFT_PX_PER_SEC = 6;

const BANDS: Array<{ stop: number; color: [number, number, number] }> = [
  { stop: 0.0, color: [13, 7, 20] }, // --ink
  { stop: 0.3, color: [42, 18, 69] }, // --deep-purple
  { stop: 0.55, color: [123, 63, 228] }, // --hero-purple
  { stop: 0.78, color: [155, 95, 240] }, // --glow-purple (brightest band)
  { stop: 1.0, color: [74, 95, 217] }, // --support-blue
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

function sampleBand(t: number): [number, number, number] {
  for (let i = 0; i < BANDS.length - 1; i++) {
    const a = BANDS[i];
    const b = BANDS[i + 1];
    if (t >= a.stop && t <= b.stop) {
      const lt = (t - a.stop) / (b.stop - a.stop);
      return [
        lerp(a.color[0], b.color[0], lt),
        lerp(a.color[1], b.color[1], lt),
        lerp(a.color[2], b.color[2], lt),
      ];
    }
  }
  return BANDS[BANDS.length - 1].color;
}

/** Built once and cached — the wash is static, only the checker on top drifts. */
let cachedWash: HTMLCanvasElement | null = null;
function getWashCanvas(): HTMLCanvasElement {
  if (cachedWash) return cachedWash;
  const wash = document.createElement("canvas");
  wash.width = W;
  wash.height = H;
  const wctx = wash.getContext("2d")!;
  const img = wctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const t = (x + y) / (W + H);
      const [r, g, b] = sampleBand(t);
      const i = (y * W + x) * 4;
      img.data[i] = r;
      img.data[i + 1] = g;
      img.data[i + 2] = b;
      img.data[i + 3] = 255;
    }
  }
  wctx.putImageData(img, 0, 0);
  cachedWash = wash;
  return wash;
}

// Overdraw radius (in tiles) needed so the tilted grid still fully covers
// the canvas corners — half the canvas diagonal, plus a tile of slack.
const TILE_PAD = Math.ceil(Math.sqrt(W * W + H * H) / 2 / TILE) + 2;
const CENTER_TX = Math.round(W / 2 / TILE);
const CENTER_TY = Math.round(H / 2 / TILE);

function drawFrame(ctx: CanvasRenderingContext2D, timeSec: number, reduced: boolean) {
  ctx.drawImage(getWashCanvas(), 0, 0);

  const drift = reduced ? 0 : (timeSec * DRIFT_PX_PER_SEC) % (TILE * 2);
  ctx.save();
  // Squares are drawn axis-aligned in a frame rotated around the canvas
  // center, so on screen the checker itself reads as tilted.
  ctx.translate(W / 2, H / 2);
  ctx.rotate(TILT_RAD);
  ctx.translate(-W / 2, -H / 2);
  for (let ty = CENTER_TY - TILE_PAD; ty <= CENTER_TY + TILE_PAD; ty++) {
    for (let tx = CENTER_TX - TILE_PAD; tx <= CENTER_TX + TILE_PAD; tx++) {
      const parity = ((tx + ty) % 2 + 2) % 2;
      const px = tx * TILE - drift;
      const py = ty * TILE - drift;
      ctx.fillStyle = parity === 1 ? "rgba(0,0,0,0.14)" : "rgba(255,255,255,0.05)";
      ctx.fillRect(px, py, TILE, TILE);
    }
  }
  ctx.restore();
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const wrapperStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  background: "#0D0714",
  overflow: "hidden",
};

const canvasStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  imageRendering: "pixelated",
  display: "block",
};

interface PixelBackgroundProps {
  durationMs: number;
  children?: ReactNode;
}

/** Twilight checker backdrop shared by the "general" slides. */
export function PixelBackground({ durationMs, children }: PixelBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedMs = useSlideClock(durationMs);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    drawFrame(ctx, elapsedMs / 1000, reduced);
  }, [elapsedMs, reduced]);

  return (
    <div style={wrapperStyle}>
      <canvas ref={canvasRef} width={W} height={H} style={canvasStyle} />
      {children}
    </div>
  );
}
