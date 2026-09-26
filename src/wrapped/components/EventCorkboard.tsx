import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { useSlideClock } from "../engine/Timeline";

/**
 * Pixel-art event corkboard — one pinned photo per attended event.
 * Everything animated here is a pure function of `elapsedMs` from
 * `useSlideClock` — never its own rAF/Date.now — so a single frame renders
 * identically whether driven by the live clock or the stepped render clock
 * used by the Playwright/ffmpeg export pipeline (same contract as
 * MountainProgressTracker).
 */

export interface CorkboardEvent {
  photoUrl: string;
  name: string;
  date: string;
}

interface EventCorkboardProps {
  events: CorkboardEvent[];
  durationMs: number;
}

// ---------- low-res buffer: rendered small on purpose, then scaled up via
// CSS `image-rendering: pixelated` — same technique as the mountain. ----------
const W = 216;
const H = 384;

const COLORS = {
  frameDark: "#5A5270",
  frameMid: "#7D7295",
  frameHighlight: "#A79BC0",
  corkBase: [96, 60, 58] as [number, number, number], // dusky rose-brown, twilight-tinted
  corkFleckDark: [58, 32, 40] as [number, number, number],
  corkFleckLight: [138, 92, 84] as [number, number, number],
  paperCream: "#EDE4D3",
  paperShadow: "#B9A98D",
  captionInk: "#3A2E2A",
  stamp: "#E8622C",
  glow: "#9B5FF0",
} as const;

const PIN_COLORS = ["#E8622C", "#4A5FD9", "#7B3FE4", "#D94A6A", "#3FB88C"];

const FRAME_T = 9;
const BOARD = {
  x: FRAME_T,
  y: FRAME_T,
  w: W - FRAME_T * 2,
  h: H - FRAME_T * 2,
};

// Fixed-size photo slots — count never shrinks the photo, extra events stack.
const PHOTO_W = 50;
const PHOTO_H = 60;
const BORDER_SIDE = 3;
const BORDER_TOP = 3;
const CAPTION_H = 10;
const IMG_W = PHOTO_W - BORDER_SIDE * 2;
const IMG_H = PHOTO_H - BORDER_TOP - CAPTION_H;
const PIXEL_W = 22; // internal render resolution of each photo (pre-upscale)
const PIXEL_H = Math.round(PIXEL_W * (IMG_H / IMG_W));

const GRID_COLS = 4;
const GRID_ROWS = 4;
const SLOTS = GRID_COLS * GRID_ROWS;

// Bottom-right corner of the board is kept clear for the attended-count
// readout — photo slots that would land under it get pushed up instead.
const RESERVED = { x: BOARD.w - 120, y: BOARD.h - 104, w: 120, h: 104 };

const DROP_MS = 420;
const PIN_DELAY_MS = 130;
const STAGGER_MS = 90;
const SWAY_FADE_MS = 500;
const COUNT_MS = 900;

// ---------- deterministic per-index PRNG (LCG, same family as mountain's jagSeed) ----------
function rngFor(seed: number) {
  let s = (seed * 2654435761 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
};

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16));

/** Cork texture — seeded speckle, built once and cached (never re-randomized). */
let cachedCork: HTMLCanvasElement | null = null;
function getCorkCanvas(): HTMLCanvasElement {
  if (cachedCork) return cachedCork;
  const c = document.createElement("canvas");
  c.width = BOARD.w;
  c.height = BOARD.h;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = `rgb(${COLORS.corkBase.join(",")})`;
  ctx.fillRect(0, 0, c.width, c.height);
  const rnd = rngFor(4242);
  for (let y = 0; y < c.height; y++) {
    for (let x = 0; x < c.width; x++) {
      const threshold = BAYER4[y % 4][x % 4];
      const r = rnd();
      if (r < 0.09 + threshold * 0.03) {
        const dark = r < 0.045;
        ctx.fillStyle = `rgb(${(dark ? COLORS.corkFleckDark : COLORS.corkFleckLight).join(",")})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  cachedCork = c;
  return c;
}

/** Corner vignette overlay, dithered hard-edge darkening — built once, reused for every photo. */
let cachedVignette: HTMLCanvasElement | null = null;
function getVignetteCanvas(): HTMLCanvasElement {
  if (cachedVignette) return cachedVignette;
  const c = document.createElement("canvas");
  c.width = PIXEL_W;
  c.height = PIXEL_H;
  const ctx = c.getContext("2d")!;
  const cx = PIXEL_W / 2;
  const cy = PIXEL_H / 2;
  const maxD = Math.hypot(cx, cy);
  for (let y = 0; y < PIXEL_H; y++) {
    for (let x = 0; x < PIXEL_W; x++) {
      const d = Math.hypot(x - cx, y - cy) / maxD;
      const threshold = BAYER4[y % 4][x % 4];
      const stepped = Math.floor(d * 5 + threshold - 0.5) / 5;
      const alpha = Math.max(0, Math.min(0.55, stepped - 0.35));
      if (alpha > 0) {
        ctx.fillStyle = `rgba(20,10,15,${alpha})`;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
  cachedVignette = c;
  return c;
}

interface Slot {
  x: number;
  y: number;
  rot: number;
  pinColor: string;
  pinCorner: "left" | "right";
  swayPhase: number;
  swaySpeed: number;
}

function slotFor(index: number): Slot {
  const cell = index % SLOTS;
  const wrapPass = Math.floor(index / SLOTS);
  const col = cell % GRID_COLS;
  const row = Math.floor(cell / GRID_COLS);
  const cellW = BOARD.w / GRID_COLS;
  const cellH = BOARD.h / GRID_ROWS;

  const rnd = rngFor(cell * 97 + 11);
  const jitterX = (rnd() - 0.5) * (cellW - PHOTO_W) * 0.8;
  const jitterY = (rnd() - 0.5) * (cellH - PHOTO_H) * 0.8;
  const baseRot = (rnd() - 0.5) * 16;

  const wrapRnd = rngFor(index * 733 + 5);
  const wrapOffset = wrapPass * 8;
  const wrapJitterX = wrapPass > 0 ? (wrapRnd() - 0.5) * 6 : 0;
  const wrapJitterY = wrapPass > 0 ? (wrapRnd() - 0.5) * 6 : 0;

  let x =
    col * cellW + cellW / 2 - PHOTO_W / 2 + jitterX + wrapOffset + wrapJitterX;
  let y =
    row * cellH + cellH / 2 - PHOTO_H / 2 + jitterY + wrapOffset + wrapJitterY;

  // Keep the reserved corner photo-free — push straight up above it.
  if (x + PHOTO_W > RESERVED.x && y + PHOTO_H > RESERVED.y) {
    y = RESERVED.y - PHOTO_H - 3;
  }

  const pinColor = PIN_COLORS[index % PIN_COLORS.length];
  const pinCorner = rnd() > 0.5 ? "right" : "left";
  const swayPhase = rnd() * Math.PI * 2;
  const swaySpeed = 0.4 + rnd() * 0.4;

  return {
    x: Math.max(2, Math.min(BOARD.w - PHOTO_W - 2, x)),
    y: Math.max(2, Math.min(BOARD.h - PHOTO_H - 2, y)),
    rot: baseRot,
    pinColor,
    pinCorner,
    swayPhase,
    swaySpeed,
  };
}

interface ProcessedPhoto {
  canvas: HTMLCanvasElement;
  ready: boolean;
}

function processPhoto(img: HTMLImageElement): HTMLCanvasElement {
  // Pixelation: downscale with smoothing off, never getImageData (avoids
  // CORS-taint on cross-origin user photos entirely).
  const tiny = document.createElement("canvas");
  tiny.width = PIXEL_W;
  tiny.height = PIXEL_H;
  const tctx = tiny.getContext("2d")!;
  tctx.imageSmoothingEnabled = false;

  const srcAspect = img.naturalWidth / img.naturalHeight;
  const dstAspect = PIXEL_W / PIXEL_H;
  let sx = 0,
    sy = 0,
    sw = img.naturalWidth,
    sh = img.naturalHeight;
  if (srcAspect > dstAspect) {
    sw = img.naturalHeight * dstAspect;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth / dstAspect;
    sy = (img.naturalHeight - sh) / 2;
  }
  tctx.filter = "saturate(0.85) contrast(1.12) sepia(0.18)";
  tctx.drawImage(img, sx, sy, sw, sh, 0, 0, PIXEL_W, PIXEL_H);
  tctx.filter = "none";

  // Warm disposable-camera cast.
  tctx.globalCompositeOperation = "multiply";
  tctx.fillStyle = "rgba(255,196,140,0.22)";
  tctx.fillRect(0, 0, PIXEL_W, PIXEL_H);
  tctx.globalCompositeOperation = "source-over";

  // Dithered corner vignette, hard-edged.
  tctx.drawImage(getVignetteCanvas(), 0, 0);

  return tiny;
}

function drawPin(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
) {
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(x - 1, y, 1, 1);
  ctx.fillRect(x, y + 1, 1, 1);

  ctx.fillStyle = color;
  ctx.fillRect(x - 1, y - 2, 3, 3);
  ctx.fillRect(x, y - 3, 1, 1);
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.fillRect(x - 1, y - 2, 1, 1);
}

function drawPhotoCaption(
  ctx: CanvasRenderingContext2D,
  name: string,
  date: string,
) {
  ctx.fillStyle = COLORS.captionInk;
  ctx.font = "5px monospace";
  ctx.textBaseline = "top";
  const label = name.length > 11 ? `${name.slice(0, 10)}…` : name;
  ctx.fillText(label, 2, 0);
  ctx.fillStyle = COLORS.paperShadow;
  ctx.font = "4px monospace";
  ctx.fillText(date, 2, 6);
}

function drawTimestampStamp(ctx: CanvasRenderingContext2D, date: string) {
  ctx.fillStyle = COLORS.stamp;
  ctx.font = "4px monospace";
  ctx.textBaseline = "alphabetic";
  ctx.fillText(date, IMG_W - date.length * 2.6 - 2, IMG_H - 3);
}

interface DrawParams {
  ctx: CanvasRenderingContext2D;
  photos: Map<string, ProcessedPhoto>;
  events: CorkboardEvent[];
  elapsedMs: number;
  reduced: boolean;
}

function drawBoard(p: DrawParams) {
  const { ctx, photos, events, elapsedMs, reduced } = p;
  const n = events.length;
  const timeSec = elapsedMs / 1000;

  // frame
  ctx.fillStyle = COLORS.frameMid;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = COLORS.frameHighlight;
  ctx.lineWidth = 1;
  ctx.strokeRect(1.5, 1.5, W - 3, H - 3);
  ctx.strokeStyle = COLORS.frameDark;
  ctx.strokeRect(0.5, 0.5, W - 1, H - 1);

  // cork board
  ctx.drawImage(getCorkCanvas(), BOARD.x, BOARD.y);
  ctx.strokeStyle = COLORS.frameDark;
  ctx.lineWidth = 1;
  ctx.strokeRect(BOARD.x + 0.5, BOARD.y + 0.5, BOARD.w - 1, BOARD.h - 1);

  ctx.save();
  ctx.beginPath();
  ctx.rect(BOARD.x, BOARD.y, BOARD.w, BOARD.h);
  ctx.clip();
  ctx.translate(BOARD.x, BOARD.y);

  for (let i = 0; i < n; i++) {
    const ev = events[i];
    const slot = slotFor(i);
    const startDelay = i * STAGGER_MS;
    const localT = reduced
      ? 1
      : Math.max(0, Math.min(1, (elapsedMs - startDelay) / DROP_MS));
    if (localT <= 0) continue;

    const eased = easeOutBack(localT);
    const scale = reduced ? 1 : 0.35 + 0.65 * eased;
    const dropY = reduced ? 0 : (1 - Math.min(1, localT / 0.7)) * -14;
    const alpha = reduced ? 1 : Math.min(1, localT / 0.35);

    const landedMs = elapsedMs - startDelay - DROP_MS;
    const swayFade = reduced
      ? 0
      : Math.max(0, Math.min(1, landedMs / SWAY_FADE_MS));
    const sway = reduced
      ? 0
      : Math.sin(timeSec * slot.swaySpeed + slot.swayPhase) * 0.8 * swayFade;
    const rot = ((slot.rot + (reduced ? 0 : sway)) * Math.PI) / 180;

    const cx = slot.x + PHOTO_W / 2;
    const cy = slot.y + PHOTO_H / 2 + dropY;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(cx, cy);
    ctx.rotate(rot);
    ctx.scale(scale, scale);
    ctx.translate(-PHOTO_W / 2, -PHOTO_H / 2);

    // hard-edge drop shadow of the whole card onto the board
    ctx.fillStyle = "rgba(10,5,8,0.35)";
    ctx.fillRect(1, 2, PHOTO_W, PHOTO_H);

    // paper frame
    ctx.fillStyle = COLORS.paperCream;
    ctx.fillRect(0, 0, PHOTO_W, PHOTO_H);
    ctx.strokeStyle = COLORS.paperShadow;
    ctx.strokeRect(0.5, 0.5, PHOTO_W - 1, PHOTO_H - 1);

    const processed = photos.get(ev.photoUrl);
    if (processed?.ready) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(processed.canvas, BORDER_SIDE, BORDER_TOP, IMG_W, IMG_H);
    } else {
      ctx.fillStyle = "#8A7A68";
      ctx.fillRect(BORDER_SIDE, BORDER_TOP, IMG_W, IMG_H);
    }

    ctx.save();
    ctx.translate(BORDER_SIDE, BORDER_TOP);
    ctx.beginPath();
    ctx.rect(0, 0, IMG_W, IMG_H);
    ctx.clip();
    drawTimestampStamp(ctx, ev.date);
    ctx.restore();

    ctx.save();
    ctx.translate(0, PHOTO_H - CAPTION_H);
    drawPhotoCaption(ctx, ev.name, ev.date);
    ctx.restore();

    // pin — appears slightly after the photo lands, small pop-in
    const pinLocalT = reduced
      ? 1
      : Math.max(0, Math.min(1, (localT * DROP_MS - PIN_DELAY_MS) / 160));
    if (pinLocalT > 0) {
      const pinScale = 0.4 + 0.6 * easeOutBack(pinLocalT);
      const px = slot.pinCorner === "left" ? 6 : PHOTO_W - 6;
      ctx.save();
      ctx.globalAlpha = Math.min(1, pinLocalT * 1.4);
      ctx.translate(px, 2);
      ctx.scale(pinScale, pinScale);
      ctx.translate(-px, -2);
      drawPin(ctx, px, 2, slot.pinColor);
      ctx.restore();
    }

    ctx.restore();
  }

  ctx.restore();
}

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

const overlayStyle: CSSProperties = {
  position: "absolute",
  bottom: "6%",
  right: "8%",
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-end",
  gap: 2,
  pointerEvents: "none",
  textAlign: "right",
};

const overlayCaptionStyle: CSSProperties = {
  fontFamily: '"Space Grotesk", sans-serif',
  fontWeight: 700,
  fontSize: "clamp(11px, 2.4vw, 19px)",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#EDE4D3",
  textShadow: "0 1px 0 rgba(0,0,0,0.4)",
};

// Sized to read at roughly the scale of one pinned photo, not a small readout.
const overlayCountStyle: CSSProperties = {
  fontFamily: '"Jersey 10", monospace',
  fontSize: "clamp(38px, 11vw, 72px)",
  color: "#FFFFFF",
  textShadow: "0 0 6px rgba(155,95,240,0.85), 0 0 14px rgba(123,63,228,0.55)",
  fontVariantNumeric: "tabular-nums",
  lineHeight: 1.1,
};

export function EventCorkboard({ events, durationMs }: EventCorkboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedMs = useSlideClock(durationMs);
  const eventsAttended = events.length;

  const photosRef = useRef<Map<string, ProcessedPhoto>>(new Map());
  const [loadedVersion, setLoadedVersion] = useState(0);

  const urls = useMemo(() => events.map((e) => e.photoUrl), [events]);

  useEffect(() => {
    for (const url of urls) {
      if (photosRef.current.has(url)) continue;
      const entry: ProcessedPhoto = {
        canvas: document.createElement("canvas"),
        ready: false,
      };
      photosRef.current.set(url, entry);
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        try {
          entry.canvas = processPhoto(img);
          entry.ready = true;
        } catch {
          entry.ready = false;
        }
        setLoadedVersion((v) => v + 1);
      };
      img.onerror = () => {
        setLoadedVersion((v) => v + 1);
      };
      img.src = url;
    }
  }, [urls]);

  const reduced = prefersReducedMotion();

  // Computed once per tick from elapsedMs — same pure-function contract as
  // the rest of the board, no owned timer.
  const countT = reduced ? 1 : Math.min(1, elapsedMs / COUNT_MS);
  const countEased = 1 - Math.pow(1 - countT, 3);
  const displayedCount = Math.round(eventsAttended * countEased);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;
    drawBoard({ ctx, photos: photosRef.current, events, elapsedMs, reduced });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsedMs, events, reduced, loadedVersion]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-label={`Corkboard of ${eventsAttended} attended events`}
        style={{
          width: "100%",
          height: "100%",
          display: "block",
          imageRendering: "pixelated",
        }}
      />
      <div style={overlayStyle}>
        <span style={overlayCaptionStyle}>you went to</span>
        <span style={overlayCountStyle}>{displayedCount}</span>
        <span style={overlayCaptionStyle}>
          {displayedCount === 1 ? "event" : "events"}
        </span>
      </div>
    </div>
  );
}
