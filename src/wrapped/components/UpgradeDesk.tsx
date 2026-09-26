import { useEffect, useMemo, useRef } from "react";
import { useSlideClock } from "../engine/Timeline";

/**
 * Pixel-art desk/computer setup that upgrades through discrete tiers as
 * membership duration grows. Same contract as MountainProgressTracker /
 * EventCorkboard: everything drawn is a pure function of `elapsedMs` from
 * `useSlideClock` — never its own rAF/Date.now — so a frame renders
 * identically live or under the stepped export clock. The one addition here
 * is that the *current tier* is a function of the `membershipDuration` prop,
 * which can change while mounted (e.g. a live preview scrubber); a tier
 * change is detected via ref + the clock's own elapsedMs, not a separate
 * timer, so it stays deterministic under the stepped clock too.
 */

export interface DeskTier {
  threshold: number;
  label: string;
}

interface UpgradeDeskProps {
  membershipDuration: number;
  tiers: DeskTier[];
  durationMs: number;
  /** Headline count-up value + unit, e.g. 359 + "days". Falls back to
   * `membershipDuration` + "days" when omitted. */
  displayValue?: number;
  displayUnit?: string;
}

// ---------- low-res buffer: rendered small on purpose, then scaled up via
// CSS `image-rendering: pixelated` — same technique as mountain/corkboard. ----------
const W = 216;
const H = 384;

// Same master palette family as MountainProgressTracker/EventCorkboard
// (near-black #0D0714 -> deep purple #2A1245 -> hero purple #7B3FE4 -> glow
// purple #9B5FF0 -> support blue #4A5FD9 -> light lavender #C9BEDD/#A79BC0),
// reused here for the daylight scene instead of introducing a second,
// distinct-per-item hue set. Every accent color is one of the same four
// tones (hero purple / glow purple / support blue / light lavender) so nothing
// on the desk reads as its own separate color identity.
const COLORS = {
  wallTop: [198, 190, 220] as [number, number, number],
  wallBottom: [167, 155, 192] as [number, number, number],
  wallTrim: "#5A5270",
  windowFrame: "#3A2E52",
  windowFrameLight: "#7D7295",
  skyTop: [196, 206, 236] as [number, number, number],
  skyBottom: [232, 232, 244] as [number, number, number],
  sun: "#9B5FF0",
  sunCore: "#FFFFFF",
  cloud: "rgba(255,255,255,0.85)",
  clockFace: "#EDE4D3",
  clockRim: "#3A2E52",
  clockHand: "#170E29",
  shelf: "#5A5270",
  shelfBook: ["#7B3FE4", "#4A5FD9", "#9B5FF0", "#3A2E52"],
  deskTop: "#6B5A82",
  deskEdge: "#4A3D5A",
  deskFront: "#3A2E52",
  deskLegDark: "#170E29",
  floor: "#C9BEDD",
  monitorFrame: "#170E29",
  monitorFrameLight: "#3A2E52",
  crtBody: "#A79BC0",
  crtBodyShade: "#7D7295",
  screenOff: "#0D0714",
  screenGlowCyan: "#8FC7F0",
  screenGlowBlue: "#7B3FE4",
  keyboardBody: "#170E29",
  keyboardKeys: "#3A2E52",
  mouseBody: "#170E29",
  towerBody: "#0D0714",
  towerPanel: "#170E29",
  headphoneStand: "#3A2E52",
  headphoneCup: "#170E29",
  plantPot: "#3A2E52",
  plantLeaf: "#7B3FE4",
  plantLeafDark: "#3A2E52",
  lampArm: "#3A2E52",
  lampShade: "#9B5FF0",
  chairBasic: "#3A2E52",
  chairPremiumBody: "#170E29",
  chairPremiumTrim: "#7B3FE4",
  stickerColors: ["#7B3FE4", "#4A5FD9", "#9B5FF0", "#5A5270"],
} as const;

const RGB_CYCLE = ["#7B3FE4", "#9B5FF0", "#4A5FD9", "#C9BEDD"];
const RGB_STEP_MS = 550;

// ---------- geometry (percent-based over W/H, same technique as mountain's MOUNTAIN table) ----------
const WALL_BOTTOM_PCT = 58;
const DESK_TOP_PCT = 58;
const DESK_FRONT_TOP_PCT = 68;
const DESK_BOTTOM_PCT = 100;
const DESK_LEFT_X = 1;
const DESK_RIGHT_X = 99;
const DESK_FRONT_LEFT_X = -5;
const DESK_FRONT_RIGHT_X = 105;

const WINDOW = { x: 60, y: 6, w: 34, h: 30 };
const CLOCK = { cx: 20, cy: 16, r: 7 };
const SHELF = { x: 8, y: 40, w: 26, h: 3 };

// ---------- stage table: five discrete visual stages, data-driven ----------
interface StageConfig {
  monitorCount: 1 | 2 | 3;
  monitorType: "crt" | "flat";
  tower: boolean;
  towerGlow: boolean;
  rgbPeripherals: boolean;
  lamp: boolean;
  plant: boolean;
  headphones: boolean;
  chair: "basic" | "premium";
  clutterCount: number;
}

const STAGES: StageConfig[] = [
  { monitorCount: 1, monitorType: "crt", tower: false, towerGlow: false, rgbPeripherals: false, lamp: false, plant: false, headphones: false, chair: "basic", clutterCount: 0 },
  { monitorCount: 1, monitorType: "flat", tower: false, towerGlow: false, rgbPeripherals: false, lamp: false, plant: false, headphones: false, chair: "basic", clutterCount: 0 },
  { monitorCount: 2, monitorType: "flat", tower: false, towerGlow: false, rgbPeripherals: true, lamp: true, plant: true, headphones: false, chair: "basic", clutterCount: 1 },
  { monitorCount: 3, monitorType: "flat", tower: true, towerGlow: true, rgbPeripherals: true, lamp: true, plant: true, headphones: true, chair: "basic", clutterCount: 3 },
  { monitorCount: 3, monitorType: "flat", tower: true, towerGlow: true, rgbPeripherals: true, lamp: true, plant: true, headphones: true, chair: "premium", clutterCount: 5 },
];

/** Maps a tiers-index (from the caller's own tiers array, any length) onto
 * the fixed STAGES table proportionally, so a 3-tier or a 12-tier caller
 * both land on a sensible discrete visual stage. */
function stageIndexFor(tierIndex: number, tierCount: number): number {
  if (tierCount <= 1) return STAGES.length - 1;
  const t = tierIndex / (tierCount - 1);
  return Math.round(t * (STAGES.length - 1));
}

function currentTierIndex(membershipDuration: number, tiers: DeskTier[]): number {
  let idx = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (membershipDuration >= tiers[i].threshold) idx = i;
  }
  return idx;
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const x = t - 1;
  return 1 + c3 * x * x * x + c1 * x * x;
};

// ---------- pure geometry helpers ----------
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const px = (pct: number, dim: number) => (pct / 100) * dim;

// ---------- deterministic per-index PRNG (LCG, same family as sibling components) ----------
function rngFor(seed: number) {
  let s = (seed * 2654435761 + 1013904223) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16));

/** Sky+wall background, static geometry — built once and cached, same
 * technique as the mountain's dithered sky canvas. */
let cachedBackground: HTMLCanvasElement | null = null;
function getBackgroundCanvas(): HTMLCanvasElement {
  if (cachedBackground) return cachedBackground;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const ctx = c.getContext("2d")!;

  const wallBottomPx = Math.round(px(WALL_BOTTOM_PCT, H));
  const LEVELS = 6;
  for (let y = 0; y < wallBottomPx; y++) {
    const t = y / Math.max(1, wallBottomPx - 1);
    for (let x = 0; x < W; x++) {
      const threshold = BAYER4[y % 4][x % 4];
      const stepped = Math.floor(t * LEVELS + threshold - 0.5) / LEVELS;
      const st = Math.min(1, Math.max(0, stepped));
      const r = Math.round(lerp(COLORS.wallTop[0], COLORS.wallBottom[0], st));
      const g = Math.round(lerp(COLORS.wallTop[1], COLORS.wallBottom[1], st));
      const b = Math.round(lerp(COLORS.wallTop[2], COLORS.wallBottom[2], st));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  ctx.fillStyle = COLORS.wallTrim;
  ctx.fillRect(0, wallBottomPx - 2, W, 2);

  // floor strip below the wall, above the desk
  ctx.fillStyle = COLORS.floor;
  ctx.fillRect(0, wallBottomPx, W, H - wallBottomPx);

  // window
  const wx = px(WINDOW.x, W);
  const wy = px(WINDOW.y, H);
  const ww = px(WINDOW.w, W);
  const wh = px(WINDOW.h, H);
  ctx.fillStyle = COLORS.windowFrame;
  ctx.fillRect(wx - 3, wy - 3, ww + 6, wh + 6);
  ctx.fillStyle = COLORS.windowFrameLight;
  ctx.fillRect(wx - 3, wy - 3, ww + 6, 2);
  ctx.fillRect(wx - 3, wy - 3, 2, wh + 6);

  for (let y = 0; y < wh; y++) {
    const t = y / Math.max(1, wh - 1);
    for (let x = 0; x < ww; x++) {
      const threshold = BAYER4[y % 4][x % 4];
      const stepped = Math.floor(t * LEVELS + threshold - 0.5) / LEVELS;
      const st = Math.min(1, Math.max(0, stepped));
      const r = Math.round(lerp(COLORS.skyTop[0], COLORS.skyBottom[0], st));
      const g = Math.round(lerp(COLORS.skyTop[1], COLORS.skyBottom[1], st));
      const b = Math.round(lerp(COLORS.skyTop[2], COLORS.skyBottom[2], st));
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(Math.round(wx + x), Math.round(wy + y), 1, 1);
    }
  }
  // sun
  const sunCx = wx + ww * 0.28;
  const sunCy = wy + wh * 0.3;
  ctx.fillStyle = COLORS.sun;
  ctx.beginPath();
  ctx.arc(sunCx, sunCy, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.sunCore;
  ctx.beginPath();
  ctx.arc(sunCx, sunCy, 2.5, 0, Math.PI * 2);
  ctx.fill();
  // clouds
  ctx.fillStyle = COLORS.cloud;
  ctx.fillRect(Math.round(wx + ww * 0.45), Math.round(wy + wh * 0.55), 10, 3);
  ctx.fillRect(Math.round(wx + ww * 0.5), Math.round(wy + wh * 0.5), 6, 3);
  ctx.fillRect(Math.round(wx + ww * 0.15), Math.round(wy + wh * 0.75), 8, 2);
  // panes
  ctx.strokeStyle = COLORS.windowFrame;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(wx + ww / 2, wy);
  ctx.lineTo(wx + ww / 2, wy + wh);
  ctx.moveTo(wx, wy + wh / 2);
  ctx.lineTo(wx + ww, wy + wh / 2);
  ctx.stroke();

  // wall clock
  const ccx = px(CLOCK.cx, W);
  const ccy = px(CLOCK.cy, H);
  const cr = px(CLOCK.r, Math.min(W, H));
  ctx.fillStyle = COLORS.clockRim;
  ctx.beginPath();
  ctx.arc(ccx, ccy, cr, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.clockFace;
  ctx.beginPath();
  ctx.arc(ccx, ccy, cr - 1.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = COLORS.clockHand;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(ccx, ccy);
  ctx.lineTo(ccx, ccy - cr * 0.55);
  ctx.moveTo(ccx, ccy);
  ctx.lineTo(ccx + cr * 0.4, ccy + cr * 0.15);
  ctx.stroke();

  // shelf with a few books, static set-dressing
  const shx = px(SHELF.x, W);
  const shy = px(SHELF.y, H);
  const shw = px(SHELF.w, W);
  const shh = px(SHELF.h, H);
  ctx.fillStyle = COLORS.shelf;
  ctx.fillRect(shx, shy, shw, shh);
  let bookX = shx + 2;
  const rnd = rngFor(77);
  for (let i = 0; i < 6 && bookX < shx + shw - 2; i++) {
    const bw = 2 + Math.round(rnd() * 2);
    const bh = 6 + Math.round(rnd() * 4);
    ctx.fillStyle = COLORS.shelfBook[i % COLORS.shelfBook.length];
    ctx.fillRect(bookX, shy - bh, bw, bh);
    bookX += bw + 1;
  }

  cachedBackground = c;
  return c;
}

function drawDesk(ctx: CanvasRenderingContext2D) {
  const topY = px(DESK_TOP_PCT, H);
  const frontTopY = px(DESK_FRONT_TOP_PCT, H);
  const botY = px(DESK_BOTTOM_PCT, H);

  // desktop surface — trapezoid with slight perspective, matching the
  // mountain silhouette's stair-step-free flat-fill + outline technique.
  ctx.beginPath();
  ctx.moveTo(px(DESK_LEFT_X, W), topY);
  ctx.lineTo(px(DESK_RIGHT_X, W), topY);
  ctx.lineTo(px(DESK_FRONT_RIGHT_X, W), frontTopY);
  ctx.lineTo(px(DESK_FRONT_LEFT_X, W), frontTopY);
  ctx.closePath();
  ctx.fillStyle = COLORS.deskTop;
  ctx.fill();
  ctx.strokeStyle = COLORS.deskEdge;
  ctx.lineWidth = 1;
  ctx.stroke();

  // front panel + legs
  ctx.fillStyle = COLORS.deskFront;
  ctx.fillRect(px(DESK_FRONT_LEFT_X, W), frontTopY, px(DESK_FRONT_RIGHT_X - DESK_FRONT_LEFT_X, W), botY - frontTopY);
  ctx.fillStyle = COLORS.deskLegDark;
  ctx.fillRect(px(DESK_FRONT_LEFT_X + 2, W), frontTopY, 3, botY - frontTopY);
  ctx.fillRect(px(DESK_FRONT_RIGHT_X - 5, W), frontTopY, 3, botY - frontTopY);
}

interface ChairParams {
  cx: number;
  y: number;
  premium: boolean;
}
function drawChair(ctx: CanvasRenderingContext2D, p: ChairParams) {
  const w = p.premium ? 34 : 26;
  const h = p.premium ? 40 : 30;
  const body = p.premium ? COLORS.chairPremiumBody : COLORS.chairBasic;
  ctx.fillStyle = body;
  ctx.fillRect(Math.round(p.cx - w / 2), Math.round(p.y - h), w, h);
  if (p.premium) {
    ctx.fillStyle = COLORS.chairPremiumTrim;
    ctx.fillRect(Math.round(p.cx - w / 2), Math.round(p.y - h), w, 3);
    ctx.fillRect(Math.round(p.cx - w / 2), Math.round(p.y - h), 3, h);
    ctx.fillRect(Math.round(p.cx + w / 2 - 3), Math.round(p.y - h), 3, h);
  }
}

function drawMonitor(
  ctx: CanvasRenderingContext2D,
  cx: number,
  baseY: number,
  w: number,
  h: number,
  type: "crt" | "flat",
  screenGlow: number,
  cursorOn: boolean,
  glowColor: string,
) {
  const x = Math.round(cx - w / 2);
  const neckH = type === "crt" ? 6 : 9;
  const bodyH = type === "crt" ? h * 1.25 : h * 0.92;
  const y = Math.round(baseY - neckH - bodyH);

  if (type === "crt") {
    // boxy CRT built from stacked, narrowing layers — a hard-edge taper
    // instead of a single flat rect, so the silhouette actually reads "CRT".
    const capInset = Math.round(w * 0.12);
    const capH = Math.round(bodyH * 0.14);
    ctx.fillStyle = COLORS.crtBodyShade;
    ctx.fillRect(x + capInset, y, w - capInset * 2, capH);
    ctx.fillStyle = COLORS.monitorFrame;
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(Math.round(x + capInset + 3 + i * (w - capInset * 2 - 6) / 3), y + 2, 2, 2);
    }
    ctx.fillStyle = COLORS.crtBody;
    ctx.fillRect(x, y + capH, w, bodyH - capH);

    const bezel = Math.max(3, Math.round(w * 0.09));
    const sx = x + bezel;
    const sy = y + capH + bezel;
    const sw = w - bezel * 2;
    const sh = bodyH - capH - bezel * 2 - 5;
    ctx.fillStyle = COLORS.monitorFrame;
    ctx.fillRect(sx - 1, sy - 1, sw + 2, sh + 2);
    ctx.fillStyle = COLORS.screenOff;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = screenGlow;
    ctx.fillStyle = glowColor;
    ctx.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
    ctx.globalAlpha = 1;

    // chin with a power dot
    ctx.fillStyle = COLORS.crtBodyShade;
    ctx.fillRect(x, y + bodyH - 4, w, 4);
    ctx.fillStyle = glowColor;
    ctx.fillRect(Math.round(cx - 1), y + bodyH - 3, 2, 2);
  } else {
    // flat panel: outer frame, a darker inset bezel ring, thin highlight
    // along the top+left edge, and a chin notch — layered instead of one rect.
    ctx.fillStyle = COLORS.monitorFrame;
    ctx.fillRect(x, y, w, bodyH);
    ctx.fillStyle = COLORS.monitorFrameLight;
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, bodyH);

    const bezel = 3;
    const sx = x + bezel;
    const sy = y + bezel;
    const sw = w - bezel * 2;
    const sh = bodyH - bezel * 2 - 4;
    ctx.fillStyle = COLORS.screenOff;
    ctx.fillRect(sx, sy, sw, sh);
    ctx.globalAlpha = screenGlow;
    ctx.fillStyle = glowColor;
    ctx.fillRect(sx + 1, sy + 1, sw - 2, sh - 2);
    ctx.globalAlpha = 1;

    ctx.fillStyle = COLORS.monitorFrameLight;
    ctx.fillRect(Math.round(cx - 1), y + bodyH - 2, 2, 1);
  }

  // two-tier stand: neck rising from a wider foot plate, plate wider than
  // the neck so the base actually reads as furniture rather than a stick.
  const plateW = Math.round(w * 0.42);
  ctx.fillStyle = type === "crt" ? COLORS.crtBodyShade : COLORS.monitorFrame;
  ctx.fillRect(Math.round(cx - 2), y + bodyH, 4, neckH - 2);
  ctx.fillStyle = COLORS.monitorFrameLight;
  ctx.fillRect(Math.round(cx - plateW / 2), Math.round(baseY - 2), plateW, 1);
  ctx.fillStyle = type === "crt" ? COLORS.crtBodyShade : COLORS.monitorFrame;
  ctx.fillRect(Math.round(cx - plateW / 2), Math.round(baseY - 1), plateW, 1);

  if (cursorOn) {
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(Math.round(x + w * 0.3), Math.round(y + bodyH * 0.55), 2, 5);
  }
}

function drawKeyboard(ctx: CanvasRenderingContext2D, cx: number, y: number, rgb: boolean, rgbColor: string) {
  const w = 42;
  const h = 10;
  const x = Math.round(cx - w / 2);
  ctx.fillStyle = COLORS.keyboardBody;
  ctx.fillRect(x, Math.round(y), w, h);
  ctx.fillStyle = COLORS.monitorFrameLight;
  ctx.fillRect(x, Math.round(y), w, 1);

  const keyColor = rgb ? rgbColor : COLORS.keyboardKeys;
  ctx.fillStyle = keyColor;
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(x + 2 + i * 3.6, Math.round(y) + 1.5, 2.6, 2.4);
  }
  for (let i = 0; i < 10; i++) {
    ctx.fillRect(x + 2 + i * 3.6, Math.round(y) + 4.5, 2.6, 2.4);
  }
  // detached numpad block — reads as a more deliberate layout, not one strip
  ctx.fillStyle = keyColor;
  ctx.fillRect(x + w - 6, Math.round(y) + 1.5, 3, 5.4);
}

function drawMouse(ctx: CanvasRenderingContext2D, x: number, y: number, rgb: boolean, rgbColor: string) {
  ctx.fillStyle = COLORS.mouseBody;
  ctx.fillRect(Math.round(x), Math.round(y), 7, 10);
  ctx.fillStyle = COLORS.monitorFrameLight;
  ctx.fillRect(Math.round(x), Math.round(y), 7, 1);
  ctx.fillStyle = COLORS.monitorFrame;
  ctx.fillRect(Math.round(x + 3), Math.round(y + 1), 1, 4);
  if (rgb) {
    ctx.fillStyle = rgbColor;
    ctx.fillRect(Math.round(x + 2), Math.round(y + 3), 3, 1);
  }
}

function drawTower(ctx: CanvasRenderingContext2D, x: number, baseY: number, glow: boolean, glowColor: string) {
  const w = 18;
  const h = 48;
  const y = Math.round(baseY - h);
  ctx.fillStyle = COLORS.towerBody;
  ctx.fillRect(Math.round(x), y, w, h);
  ctx.fillStyle = COLORS.towerPanel;
  ctx.fillRect(Math.round(x + 2), y + 2, w - 4, h - 4);

  // segmented front: vent grille up top, a logo/RGB strip mid-body, vent
  // grille at the bottom — reads as a case, not a plain block.
  ctx.fillStyle = COLORS.towerBody;
  for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(x + 3), y + 4 + i * 3, w - 6, 1);
  for (let i = 0; i < 3; i++) ctx.fillRect(Math.round(x + 3), y + h - 14 + i * 3, w - 6, 1);
  ctx.fillStyle = COLORS.monitorFrameLight;
  ctx.fillRect(Math.round(x + 2), y + h - 18, w - 4, 1);

  if (glow) {
    ctx.fillStyle = glowColor;
    ctx.fillRect(Math.round(x + 3), y + Math.round(h * 0.42), w - 6, 3);
    ctx.fillRect(Math.round(x + 2), y + 2, 1, h - 4);
    ctx.fillRect(Math.round(x + w - 3), y + 2, 1, h - 4);
  }
}

function drawLamp(ctx: CanvasRenderingContext2D, x: number, baseY: number, timeSec: number, reduced: boolean) {
  const armH = 24;
  ctx.fillStyle = COLORS.lampArm;
  ctx.fillRect(Math.round(x), Math.round(baseY - armH), 2, armH);
  ctx.fillStyle = COLORS.lampShade;
  ctx.fillRect(Math.round(x - 5), Math.round(baseY - armH - 4), 12, 5);

  const flicker = reduced ? 0.7 : 0.55 + 0.25 * (0.5 + 0.5 * Math.sin(timeSec * 1.3));
  ctx.globalAlpha = flicker * 0.35;
  ctx.fillStyle = COLORS.lampShade;
  const blocks: Array<[number, number, number, number]> = [
    [-6, 1, 16, 3],
    [-4, 4, 12, 3],
    [-2, 7, 8, 2],
  ];
  for (const [bx, by, bw, bh] of blocks) {
    ctx.fillRect(Math.round(x - 5 + bx), Math.round(baseY - armH - 4 + by), bw, bh);
  }
  ctx.globalAlpha = 1;
}

function drawPlant(ctx: CanvasRenderingContext2D, x: number, baseY: number) {
  ctx.fillStyle = COLORS.plantPot;
  ctx.fillRect(Math.round(x - 4), Math.round(baseY - 6), 8, 6);
  ctx.fillStyle = COLORS.plantLeafDark;
  ctx.fillRect(Math.round(x - 5), Math.round(baseY - 12), 4, 7);
  ctx.fillRect(Math.round(x + 1), Math.round(baseY - 14), 4, 8);
  ctx.fillStyle = COLORS.plantLeaf;
  ctx.fillRect(Math.round(x - 2), Math.round(baseY - 16), 4, 8);
}

function drawHeadphoneStand(ctx: CanvasRenderingContext2D, x: number, baseY: number) {
  ctx.fillStyle = COLORS.headphoneStand;
  ctx.fillRect(Math.round(x), Math.round(baseY - 16), 2, 16);
  ctx.fillRect(Math.round(x - 3), Math.round(baseY - 18), 8, 2);
  ctx.fillStyle = COLORS.headphoneCup;
  ctx.fillRect(Math.round(x - 4), Math.round(baseY - 14), 3, 5);
  ctx.fillRect(Math.round(x + 3), Math.round(baseY - 14), 3, 5);
}

function drawClutter(ctx: CanvasRenderingContext2D, cx: number, y: number, count: number) {
  for (let i = 0; i < count; i++) {
    const rnd = rngFor(500 + i);
    const jx = (rnd() - 0.5) * 30;
    const jy = rnd() * 3;
    const color = COLORS.stickerColors[i % COLORS.stickerColors.length];
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(cx + jx), Math.round(y - jy - 3), 3, 3);
  }
}

interface FrameParams {
  fromStage: StageConfig | null;
  toStage: StageConfig;
  swapT: number; // 0..1, 1 = fully on toStage, only <1 during a live transition
  timeSec: number;
  reduced: boolean;
}

function monitorSlotX(count: number, i: number, deskCx: number, spread: number): number {
  if (count === 1) return deskCx;
  const start = deskCx - spread / 2;
  return start + (spread / (count - 1)) * i;
}

function drawStage(ctx: CanvasRenderingContext2D, stage: StageConfig, alpha: number, scale: number, timeSec: number, reduced: boolean) {
  if (alpha <= 0.01) return;
  ctx.save();
  ctx.globalAlpha = alpha;

  const deskCx = px((DESK_LEFT_X + DESK_RIGHT_X) / 2, W);
  const deskSurfaceY = px(DESK_TOP_PCT, H) + 2;
  const rgbColor = reduced ? RGB_CYCLE[0] : RGB_CYCLE[Math.floor(timeSec / (RGB_STEP_MS / 1000)) % RGB_CYCLE.length];

  ctx.translate(deskCx, deskSurfaceY);
  ctx.scale(scale, scale);
  ctx.translate(-deskCx, -deskSurfaceY);

  // chair, behind everything
  drawChair(ctx, { cx: deskCx - px(34, W), y: px(DESK_BOTTOM_PCT, H) - 4, premium: stage.chair === "premium" });

  const glowCycle = reduced ? 0.85 : 0.55 + 0.35 * (0.5 + 0.5 * Math.sin(timeSec * (2 * Math.PI) / 3));
  const cursorOn = reduced ? true : Math.floor(timeSec * 1.6) % 2 === 0;
  // Sized to fill most of the desk surface, not just sit on it — the whole
  // reason the setup should read as an upgrade at a glance.
  const monitorSpread = stage.monitorCount === 1 ? 0 : stage.monitorCount === 2 ? 64 : 88;
  const glowColor = stage.monitorCount >= 2 ? COLORS.screenGlowBlue : COLORS.screenGlowCyan;
  const monitorW = stage.monitorCount === 3 ? 44 : stage.monitorCount === 2 ? 54 : 76;
  const monitorH = 34;

  if (stage.tower) {
    drawTower(ctx, deskCx + px(80, W), deskSurfaceY, stage.towerGlow, rgbColor);
  }
  if (stage.plant) {
    drawPlant(ctx, deskCx - px(94, W), deskSurfaceY);
  }
  if (stage.lamp) {
    drawLamp(ctx, deskCx + px(94, W), deskSurfaceY, timeSec, reduced);
  }
  if (stage.headphones) {
    drawHeadphoneStand(ctx, deskCx - px(80, W), deskSurfaceY);
  }

  for (let i = 0; i < stage.monitorCount; i++) {
    const mx = monitorSlotX(stage.monitorCount, i, deskCx, monitorSpread);
    drawMonitor(ctx, mx, deskSurfaceY, monitorW, monitorH, stage.monitorType, glowCycle, cursorOn && i === Math.floor(stage.monitorCount / 2), glowColor);
  }

  drawKeyboard(ctx, deskCx, deskSurfaceY - 3, stage.rgbPeripherals, rgbColor);
  drawMouse(ctx, deskCx + 28, deskSurfaceY - 8, stage.rgbPeripherals, rgbColor);

  if (stage.clutterCount > 0) {
    drawClutter(ctx, deskCx, deskSurfaceY, stage.clutterCount);
  }

  ctx.restore();
}

function drawFrame(ctx: CanvasRenderingContext2D, p: FrameParams) {
  ctx.drawImage(getBackgroundCanvas(), 0, 0);
  drawDesk(ctx);

  if (p.swapT >= 1 || !p.fromStage) {
    drawStage(ctx, p.toStage, 1, 1, p.timeSec, p.reduced);
    return;
  }

  // upgrade transition: old stage pops out (scale-down + flash), new stage
  // pops in (scale-up, ease-out-back), matching the mountain/corkboard
  // enter-choreography vocabulary already used in this codebase.
  const outT = Math.min(1, p.swapT / 0.4);
  const inT = Math.max(0, Math.min(1, (p.swapT - 0.35) / 0.65));

  const outAlpha = 1 - outT;
  const outScale = 1 - 0.3 * outT;
  drawStage(ctx, p.fromStage, outAlpha, outScale, p.timeSec, p.reduced);

  if (outT >= 0.9 && outT < 1) {
    ctx.save();
    ctx.globalAlpha = (1 - outT) * 4 * 0.5;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, Math.round(px(DESK_TOP_PCT, H)), W, H - Math.round(px(DESK_TOP_PCT, H)));
    ctx.restore();
  }

  const inAlpha = Math.min(1, inT * 1.4);
  const inScale = 0.5 + 0.5 * easeOutBack(inT);
  drawStage(ctx, p.toStage, inAlpha, inScale, p.timeSec, p.reduced);
}

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const overlayStyle = {
  position: "absolute" as const,
  top: "5%",
  left: "6%",
  display: "flex",
  flexDirection: "column" as const,
  alignItems: "flex-start" as const,
  gap: 2,
  pointerEvents: "none" as const,
};

const captionStyle = {
  fontFamily: '"Space Grotesk", sans-serif',
  fontWeight: 700,
  fontSize: "clamp(11px, 1.8vw, 16px)",
  letterSpacing: "0.08em",
  textTransform: "uppercase" as const,
  color: "#3A2E52",
};

const countStyle = {
  fontFamily: '"Jersey 10", monospace',
  fontSize: "clamp(30px, 7vw, 56px)",
  color: "#170E29",
  textShadow: "0 1px 0 rgba(255,255,255,0.5)",
  fontVariantNumeric: "tabular-nums" as const,
};

const tierOverlayStyle = {
  position: "absolute" as const,
  bottom: "3.5%",
  right: "5%",
  pointerEvents: "none" as const,
  textAlign: "right" as const,
};

const labelStyle = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: "clamp(11px, 2.4vw, 16px)",
  color: "#170E29",
  textShadow: "0 1px 0 rgba(255,255,255,0.4)",
};

// Climb pacing: the desk plays through every stage from 0 up to the current
// tier's stage, one pop-transition per STEP_MS, so the upgrade is *seen*
// rather than landed on. Both are elapsedMs-driven — computed straight from
// the slide clock, no refs/timers — so a mid-climb frame renders identically
// live or under the stepped export clock, and re-mounting always replays the
// same climb (there is nothing to "already be past").
const STEP_MS = 900;
const SWAP_MS = 650;
const COUNT_MS = 900;

export function UpgradeDesk({ membershipDuration, tiers, durationMs, displayValue, displayUnit }: UpgradeDeskProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const elapsedMs = useSlideClock(durationMs);
  const reduced = prefersReducedMotion();

  const tierIndex = useMemo(() => currentTierIndex(membershipDuration, tiers), [membershipDuration, tiers]);
  const stageIndex = useMemo(() => stageIndexFor(tierIndex, tiers.length), [tierIndex, tiers.length]);
  const targetStageIndex = Math.max(0, Math.min(STAGES.length - 1, stageIndex));

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.imageSmoothingEnabled = false;

    let fromStage: StageConfig | null = null;
    let toStage = STAGES[targetStageIndex];
    let swapT = 1;

    if (!reduced && targetStageIndex > 0) {
      const bucket = Math.min(Math.floor(elapsedMs / STEP_MS), targetStageIndex);
      if (bucket > 0) {
        const localT = elapsedMs - bucket * STEP_MS;
        fromStage = STAGES[bucket - 1];
        toStage = STAGES[bucket];
        swapT = Math.min(1, localT / SWAP_MS);
      } else {
        toStage = STAGES[0];
      }
    }

    drawFrame(ctx, {
      fromStage,
      toStage,
      swapT,
      timeSec: elapsedMs / 1000,
      reduced,
    });
  }, [elapsedMs, targetStageIndex, reduced]);

  const currentLabel = tiers[tierIndex]?.label ?? "";
  const countTarget = displayValue ?? membershipDuration;
  const countUnit = displayUnit ?? (countTarget === 1 ? "day" : "days");

  // Count-up is a pure function of elapsedMs (same eased-cubic shape as
  // MountainProgressTracker's percent readout), not an owned timer.
  const countT = reduced ? 1 : Math.min(1, elapsedMs / COUNT_MS);
  const countEased = 1 - Math.pow(1 - countT, 3);
  const displayedCount = Math.round(countTarget * countEased);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        aria-label={`Member for ${countTarget} ${countUnit}, desk setup at tier: ${currentLabel}`}
        style={{ width: "100%", height: "100%", display: "block", imageRendering: "pixelated" }}
      />
      <div style={overlayStyle}>
        <span style={captionStyle}>member for</span>
        <span style={countStyle}>{displayedCount.toLocaleString()}</span>
        <span style={captionStyle}>{countUnit}</span>
      </div>
      <div style={tierOverlayStyle}>
        <span style={captionStyle}>your setup</span>
        <span style={labelStyle}>{currentLabel}</span>
      </div>
    </div>
  );
}
