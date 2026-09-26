import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";

/**
 * Generic pixel-art share screen — no scene-specific content, just the
 * chrome: a stair-cornered card (same fine-grid stepped-corner technique as
 * EventCorkboard/UpgradeDesk's canvas panels), a dithered ambient backdrop,
 * and a row of share buttons with procedurally drawn icons. Entrance uses
 * GSAP's back-eased bounce (this project's dominant animation library);
 * button state changes are instant flat-color swaps with a small scale pop,
 * matching the flat-fill / no-blur pixel aesthetic used elsewhere.
 */

export interface ShareCardStat {
  label: string;
  value: string;
}

export interface ShareCard {
  title: string;
  subtitle?: string;
  imageUrl?: string;
  stats?: ShareCardStat[];
}

export interface ShareOption {
  id: string;
  label: string;
}

interface PixelShareScreenProps {
  shareCard: ShareCard;
  shareOptions: ShareOption[];
  onShare: (optionId: string) => void;
  onClose: () => void;
}

// Same master palette family as MountainProgressTracker/EventCorkboard/UpgradeDesk
// (near-black #0D0714 -> deep purple #2A1245 -> hero purple #7B3FE4 -> glow
// purple #9B5FF0 -> support blue #4A5FD9 -> light lavender #C9BEDD/#A79BC0),
// reused here so the share screen reads as the same chrome, not a new skin.
const COLORS = {
  ink: "#0D0714",
  void: "#170E29",
  plum: "#2A1245",
  plumHi: "#3A2E52",
  iris: "#7B3FE4",
  glow: "#9B5FF0",
  signal: "#4A5FD9",
  mist: "#C9BEDD",
  mistDim: "#A79BC0",
  parchment: "#EDE4D3",
  parchmentShadow: "#B9A98D",
  mint: "#3FB88C",
} as const;

const STAT_ICONS = ["flag", "rank", "spark"] as const;
type StatIconKind = (typeof STAT_ICONS)[number];

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
].map((row) => row.map((v) => v / 16));

function prefersReducedMotion(): boolean {
  return (
    typeof matchMedia === "function" &&
    matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(prefersReducedMotion);
  useEffect(() => {
    if (typeof matchMedia !== "function") return;
    const mq = matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);
  return reduced;
}

// ---------- stepped-corner panel path — the fine-grid stair-step border used
// throughout this project's pixel-UI chrome, generalized to any w/h. ----------
function stairPanelPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  unit: number,
  steps: number,
) {
  const cut = unit * steps;
  ctx.beginPath();
  ctx.moveTo(x + cut, y);
  ctx.lineTo(x + w - cut, y);
  let cx = x + w - cut;
  let cy = y;
  for (let i = 0; i < steps; i++) {
    ctx.lineTo(cx + unit, cy);
    cx += unit;
    ctx.lineTo(cx, cy + unit);
    cy += unit;
  }
  ctx.lineTo(x + w, y + h - cut);
  cx = x + w;
  cy = y + h - cut;
  for (let i = 0; i < steps; i++) {
    ctx.lineTo(cx, cy + unit);
    cy += unit;
    ctx.lineTo(cx - unit, cy);
    cx -= unit;
  }
  ctx.lineTo(x + cut, y + h);
  cx = x + cut;
  cy = y + h;
  for (let i = 0; i < steps; i++) {
    ctx.lineTo(cx - unit, cy);
    cx -= unit;
    ctx.lineTo(cx, cy - unit);
    cy -= unit;
  }
  ctx.lineTo(x, y + cut);
  cx = x;
  cy = y + cut;
  for (let i = 0; i < steps; i++) {
    ctx.lineTo(cx, cy - unit);
    cy -= unit;
    ctx.lineTo(cx + unit, cy);
    cx += unit;
  }
  ctx.closePath();
}

interface StairPanelColors {
  fill: string;
  borderDark: string;
  borderLight: string;
  unit: number;
  steps: number;
}

function drawStairPanel(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  { fill, borderDark, borderLight, unit, steps }: StairPanelColors,
) {
  ctx.clearRect(0, 0, w, h);
  stairPanelPath(ctx, 0, 0, w, h, unit, steps);
  ctx.fillStyle = borderDark;
  ctx.fill();
  stairPanelPath(ctx, unit * 1.4, unit * 1.4, w - unit * 2.8, h - unit * 2.8, unit, steps);
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.save();
  stairPanelPath(ctx, unit * 1.4, unit * 1.4, w - unit * 2.8, h - unit * 2.8, unit, steps);
  ctx.clip();
  ctx.strokeStyle = borderLight;
  ctx.lineWidth = unit * 0.9;
  ctx.beginPath();
  ctx.moveTo(unit, h);
  ctx.lineTo(unit, unit);
  ctx.lineTo(w, unit);
  ctx.stroke();
  ctx.restore();
}

/** Sizes a canvas's backing buffer from its rendered box — `scale` CSS px per internal px. */
function setupPixelCanvas(canvas: HTMLCanvasElement, scale: number) {
  const rect = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(rect.width / scale));
  const h = Math.max(1, Math.round(rect.height / scale));
  if (canvas.width !== w) canvas.width = w;
  if (canvas.height !== h) canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = false;
  return { ctx, w, h };
}

// ---------- procedural icons — flat-fill geometric constructions only ----------
function drawX(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = COLORS.mist;
  const t = Math.max(1, Math.round(s / 8));
  for (let i = 0; i < s; i++) {
    ctx.fillRect(i, i - t / 2, t, t);
    ctx.fillRect(s - i - t, i - t / 2, t, t);
  }
}

function drawLink(ctx: CanvasRenderingContext2D, s: number, active: boolean) {
  ctx.fillStyle = active ? COLORS.parchment : COLORS.glow;
  ctx.fillRect(2, s / 2 - 2, s * 0.4, 4);
  ctx.fillRect(s * 0.55, s / 2 - 2, s * 0.4, 4);
  ctx.fillStyle = active ? COLORS.glow : COLORS.signal;
  ctx.fillRect(1, s / 2 - 4, 6, 8);
  ctx.fillRect(s - 7, s / 2 - 4, 6, 8);
}

function drawDownload(ctx: CanvasRenderingContext2D, s: number, active: boolean) {
  ctx.fillStyle = active ? COLORS.parchment : COLORS.glow;
  ctx.fillRect(s / 2 - 2, 2, 4, s * 0.45);
  ctx.fillRect(s / 2 - 6, s * 0.4, 12, 4);
  ctx.fillRect(s / 2 - 4, s * 0.48, 8, 4);
  ctx.fillRect(s / 2 - 2, s * 0.56, 4, 4);
  ctx.fillStyle = COLORS.mist;
  ctx.fillRect(3, s - 6, s - 6, 4);
}

function drawShare(ctx: CanvasRenderingContext2D, s: number, active: boolean) {
  ctx.fillStyle = active ? COLORS.parchment : COLORS.glow;
  ctx.fillRect(2, s / 2 - 2, s - 10, 4);
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(s - 10 + i, s / 2 - 2 - i, 4, 4);
    ctx.fillRect(s - 10 + i, s / 2 - 2 + i, 4, 4);
  }
}

const GENERIC_ICONS = [drawLink, drawDownload, drawShare];

function drawCheck(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = COLORS.mint;
  ctx.beginPath();
  ctx.arc(s / 2, s / 2, s / 2 - 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = COLORS.parchment;
  for (let i = 0; i < 3; i++) ctx.fillRect(s * 0.28 + i * 2, s * 0.52 + i * 2, 3, 3);
  for (let i = 0; i < 5; i++) ctx.fillRect(s * 0.4 + i * 2, s * 0.6 - i * 2, 3, 3);
}

function drawStatIcon(ctx: CanvasRenderingContext2D, s: number, kind: StatIconKind) {
  ctx.fillStyle = kind === "flag" ? COLORS.iris : COLORS.mint;
  if (kind === "flag") {
    ctx.fillRect(s * 0.2, 1, 2, s - 2);
    ctx.fillRect(s * 0.2 + 2, 2, s * 0.5, 5);
  } else if (kind === "rank") {
    ctx.fillRect(2, s - 6, 3, 5);
    ctx.fillRect(6, s - 9, 3, 8);
    ctx.fillRect(10, s - 12, 3, 11);
  } else {
    ctx.fillRect(s / 2 - 5, 3, 10, 8);
    ctx.fillRect(s / 2 - 3, 11, 6, 3);
    ctx.fillRect(s / 2 - 4, 14, 8, 2);
  }
}

function drawBadgePlaceholder(ctx: CanvasRenderingContext2D, s: number) {
  ctx.fillStyle = "rgba(255,196,140,0.18)";
  ctx.fillRect(0, 0, s, s);
  const cx = s / 2;
  const cy = s / 2 - 1;
  ctx.fillStyle = COLORS.glow;
  const pts: [number, number][] = [];
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? s * 0.42 : s * 0.18;
    const a = (Math.PI / 5) * i - Math.PI / 2;
    pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  ctx.closePath();
  ctx.fill();
  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - cx, y - cy) / (s * 0.62);
      const threshold = BAYER4[y % 4][x % 4];
      if (d > 0.72 + threshold * 0.08) {
        ctx.fillStyle = "rgba(13,7,20,0.4)";
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }
}

function processShareImage(img: HTMLImageElement, s: number): HTMLCanvasElement {
  const tiny = document.createElement("canvas");
  tiny.width = s;
  tiny.height = s;
  const tctx = tiny.getContext("2d")!;
  tctx.imageSmoothingEnabled = false;

  const srcAspect = img.naturalWidth / img.naturalHeight;
  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (srcAspect > 1) {
    sw = img.naturalHeight;
    sx = (img.naturalWidth - sw) / 2;
  } else {
    sh = img.naturalWidth;
    sy = (img.naturalHeight - sh) / 2;
  }
  tctx.filter = "saturate(0.85) contrast(1.12) sepia(0.18)";
  tctx.drawImage(img, sx, sy, sw, sh, 0, 0, s, s);
  tctx.filter = "none";

  tctx.globalCompositeOperation = "multiply";
  tctx.fillStyle = "rgba(255,196,140,0.22)";
  tctx.fillRect(0, 0, s, s);
  tctx.globalCompositeOperation = "source-over";

  for (let y = 0; y < s; y++) {
    for (let x = 0; x < s; x++) {
      const d = Math.hypot(x - s / 2, y - s / 2) / (s * 0.62);
      const threshold = BAYER4[y % 4][x % 4];
      if (d > 0.72 + threshold * 0.08) {
        tctx.fillStyle = "rgba(13,7,20,0.4)";
        tctx.fillRect(x, y, 1, 1);
      }
    }
  }
  return tiny;
}

// ---------- small building blocks ----------

function PixelIcon({
  draw,
  size,
  style,
}: {
  draw: (ctx: CanvasRenderingContext2D, size: number) => void;
  size: number;
  style?: CSSProperties;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;
    draw(ctx, size);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ width: size, height: size, imageRendering: "pixelated", display: "block", ...style }}
    />
  );
}

function StairPanelCanvas({ colors, style }: { colors: StairPanelColors; style?: CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const draw = () => {
      const { ctx, w, h } = setupPixelCanvas(canvas, colors.unit >= 2 ? 3 : 2);
      drawStairPanel(ctx, w, h, colors);
    };
    draw();
    const ro = new ResizeObserver(draw);
    ro.observe(canvas);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colors.fill, colors.borderDark, colors.borderLight, colors.unit, colors.steps]);
  return (
    <canvas
      ref={ref}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated", ...style }}
    />
  );
}

/** Full-bleed dithered backdrop with a slow, low-amplitude shimmer on a handful of cells. */
function DitherBackdrop({ reduced }: { reduced: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let raf = 0;
    let base: HTMLCanvasElement | null = null;
    let cells: { x: number; y: number; phase: number; speed: number }[] = [];
    let ctx: CanvasRenderingContext2D;
    let w = 0;
    let h = 0;

    const buildBase = () => {
      const r = setupPixelCanvas(canvas, 4);
      ctx = r.ctx;
      w = r.w;
      h = r.h;
      base = document.createElement("canvas");
      base.width = w;
      base.height = h;
      const bctx = base.getContext("2d")!;
      bctx.fillStyle = COLORS.ink;
      bctx.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const threshold = BAYER4[y % 4][x % 4];
          if (((x * 13 + y * 7) % 17) / 17 < 0.05 + threshold * 0.02) {
            bctx.fillStyle = COLORS.void;
            bctx.fillRect(x, y, 1, 1);
          }
        }
      }
      cells = Array.from({ length: 18 }, () => ({
        x: Math.floor(Math.random() * w),
        y: Math.floor(Math.random() * h),
        phase: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.3,
      }));
      ctx.drawImage(base, 0, 0);
    };

    const tick = (now: number) => {
      if (base) {
        ctx.drawImage(base, 0, 0);
        const t = now / 1000;
        for (const cell of cells) {
          const a = 0.15 + 0.15 * (0.5 + 0.5 * Math.sin(t * cell.speed + cell.phase));
          ctx.fillStyle = `rgba(155,95,240,${a.toFixed(3)})`;
          ctx.fillRect(cell.x, cell.y, 1, 1);
        }
      }
      raf = requestAnimationFrame(tick);
    };

    buildBase();
    const ro = new ResizeObserver(buildBase);
    ro.observe(canvas);
    if (!reduced) raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [reduced]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", imageRendering: "pixelated" }}
    />
  );
}

const CARD_BORDER: StairPanelColors = {
  fill: COLORS.plum,
  borderDark: COLORS.void,
  borderLight: COLORS.plumHi,
  unit: 2,
  steps: 3,
};

const BTN_BORDER: StairPanelColors = {
  fill: COLORS.plumHi,
  borderDark: COLORS.void,
  borderLight: COLORS.mistDim,
  unit: 1,
  steps: 2,
};

function ShareButton({
  option,
  icon,
  reduced,
  confirming,
  onActivate,
}: {
  option: ShareOption;
  icon: (ctx: CanvasRenderingContext2D, size: number, active: boolean) => void;
  reduced: boolean;
  confirming: boolean;
  onActivate: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const innerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLDivElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!confirming) return;
    if (badgeRef.current) {
      if (reduced) {
        gsap.set(badgeRef.current, { scale: 1 });
      } else {
        gsap.fromTo(badgeRef.current, { scale: 0 }, { scale: 1, duration: 0.26, ease: "back.out(2.2)" });
      }
    }
    if (flashRef.current) {
      gsap.fromTo(flashRef.current, { opacity: 0.35 }, { opacity: 0, duration: reduced ? 0.15 : 0.4, ease: "power1.out" });
    }
  }, [confirming, reduced]);

  const press = (down: boolean) => {
    if (reduced || !innerRef.current) return;
    gsap.to(innerRef.current, {
      scale: down ? 0.88 : 1,
      duration: down ? 0.06 : 0.14,
      ease: down ? "power1.out" : "back.out(2.4)",
    });
  };

  return (
    <button
      type="button"
      onClick={onActivate}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => {
        setHovered(false);
        press(false);
      }}
      onPointerDown={() => press(true)}
      onPointerUp={() => press(false)}
      style={{
        position: "relative",
        flex: 1,
        maxWidth: 120,
        background: "none",
        border: "none",
        padding: 0,
        cursor: "pointer",
        font: "inherit",
        color: "inherit",
      }}
    >
      <StairPanelCanvas colors={BTN_BORDER} />
      <div
        ref={innerRef}
        style={{
          position: "relative",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 4,
          padding: "10px 6px 9px",
        }}
      >
        <PixelIcon draw={(ctx, s) => icon(ctx, s, hovered)} size={20} />
        <span
          style={{
            fontSize: 10,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            fontFamily: '"Pixelify Sans", monospace',
            color: hovered ? COLORS.parchment : COLORS.mist,
          }}
        >
          {option.label}
        </span>
        <div
          ref={flashRef}
          style={{ position: "absolute", inset: -3, background: COLORS.mint, opacity: 0, pointerEvents: "none" }}
        />
        {confirming && (
          <div
            ref={badgeRef}
            style={{ position: "absolute", top: -14, right: -6, width: 26, height: 26, pointerEvents: "none" }}
          >
            <PixelIcon draw={drawCheck} size={26} />
          </div>
        )}
      </div>
    </button>
  );
}

export function PixelShareScreen({ shareCard, shareOptions, onShare, onClose }: PixelShareScreenProps) {
  const reduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [confirmingId, setConfirmingId] = useState<string | null>(null);
  const confirmTimeout = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;
    if (reduced) {
      gsap.set(card, { opacity: 1, scale: 1, y: 0 });
      return;
    }
    gsap.fromTo(
      card,
      { opacity: 0, scale: 0.4, y: 28 },
      { opacity: 1, scale: 1, y: 0, duration: 0.52, ease: "back.out(1.7)" },
    );
  }, [reduced]);

  useEffect(() => () => clearTimeout(confirmTimeout.current), []);

  useEffect(() => {
    const canvas = previewRef.current;
    if (!canvas) return;
    const size = 96;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingEnabled = false;

    if (!shareCard.imageUrl) {
      drawBadgePlaceholder(ctx, size);
      return;
    }
    let cancelled = false;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      if (cancelled) return;
      try {
        ctx.drawImage(processShareImage(img, size), 0, 0);
      } catch {
        drawBadgePlaceholder(ctx, size);
      }
    };
    img.onerror = () => {
      if (!cancelled) drawBadgePlaceholder(ctx, size);
    };
    img.src = shareCard.imageUrl;
    return () => {
      cancelled = true;
    };
  }, [shareCard.imageUrl]);

  const handleClose = () => {
    const card = cardRef.current;
    if (!card || reduced) {
      onClose();
      return;
    }
    gsap.to(card, {
      opacity: 0,
      scale: 0.85,
      y: 12,
      duration: 0.22,
      ease: "power2.in",
      onComplete: onClose,
    });
  };

  const handleActivate = (optionId: string) => {
    onShare(optionId);
    clearTimeout(confirmTimeout.current);
    setConfirmingId(optionId);
    confirmTimeout.current = setTimeout(() => setConfirmingId(null), 1500);
  };

  const statIcons = useMemo<StatIconKind[]>(
    () => (shareCard.stats ?? []).map((_, i) => STAT_ICONS[i % STAT_ICONS.length]),
    [shareCard.stats],
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Share"
      style={{
        position: "fixed",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: COLORS.ink,
        color: COLORS.parchment,
        fontFamily: '"Pixelify Sans", monospace',
      }}
    >
      <DitherBackdrop reduced={reduced} />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "min(92vw, 380px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        <div ref={cardRef} style={{ position: "relative", width: "100%", aspectRatio: "5 / 6" }}>
          <StairPanelCanvas colors={CARD_BORDER} />

          <div
            style={{
              position: "absolute",
              inset: 0,
              padding: "8% 9% 7%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              textAlign: "center",
              gap: "3%",
            }}
          >
            <button
              type="button"
              onClick={handleClose}
              aria-label="Close"
              style={{
                position: "absolute",
                top: "5%",
                right: "6%",
                width: 28,
                height: 28,
                background: "none",
                border: "none",
                padding: 0,
                cursor: "pointer",
              }}
            >
              <PixelIcon draw={drawX} size={28} />
            </button>

            <h1
              style={{
                fontFamily: '"Press Start 2P", monospace',
                fontSize: "clamp(13px, 4vw, 17px)",
                lineHeight: 1.5,
                color: COLORS.parchment,
                textShadow: `2px 2px 0 ${COLORS.void}`,
                margin: "6px 0 0",
              }}
            >
              {shareCard.title}
            </h1>

            {shareCard.subtitle && (
              <p
                style={{
                  fontFamily: '"VT323", monospace',
                  fontSize: "clamp(15px, 4.2vw, 19px)",
                  letterSpacing: "0.03em",
                  color: COLORS.mist,
                  margin: 0,
                }}
              >
                {shareCard.subtitle}
              </p>
            )}

            <div style={{ width: "44%", aspectRatio: "5 / 6", marginTop: "2%" }}>
              <canvas
                ref={previewRef}
                aria-hidden
                style={{
                  width: "100%",
                  height: "100%",
                  imageRendering: "pixelated",
                  border: `3px solid ${COLORS.parchment}`,
                  boxShadow: `0 0 0 1px ${COLORS.parchmentShadow}`,
                }}
              />
            </div>

            {shareCard.stats && shareCard.stats.length > 0 && (
              <div style={{ display: "flex", gap: "6%", marginTop: "auto", width: "100%", justifyContent: "center" }}>
                {shareCard.stats.map((stat, i) => (
                  <div key={stat.label} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                    <PixelIcon draw={(ctx, s) => drawStatIcon(ctx, s, statIcons[i])} size={18} />
                    <span
                      style={{
                        fontFamily: '"VT323", monospace',
                        fontSize: 22,
                        color: COLORS.glow,
                        lineHeight: 1,
                        fontVariantNumeric: "tabular-nums",
                      }}
                    >
                      {stat.value}
                    </span>
                    <span
                      style={{
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: COLORS.mistDim,
                      }}
                    >
                      {stat.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "center" }}>
          {shareOptions.map((option, i) => (
            <ShareButton
              key={option.id}
              option={option}
              icon={GENERIC_ICONS[i % GENERIC_ICONS.length]}
              reduced={reduced}
              confirming={confirmingId === option.id}
              onActivate={() => handleActivate(option.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
