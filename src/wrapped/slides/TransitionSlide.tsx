import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { PixelCardSurface } from "../components/PixelCard";
import { PlacedImage } from "../components/Placed";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

/**
 * Pivot point between the society-wide recap and the member's personal stats,
 * staged as an Undertale-style dialogue: the robot "says" the line into a text
 * box one letter at a time, flapping its mouth open and shut as it types.
 * Every frame is a pure function of the slide clock, so it renders
 * identically live or under the stepped export.
 */

const ASSETS = "/wrapped/transition";
const ROBOT_SRC = `${ASSETS}/robot-talk.png`;
const MONITOR_SRC = "/wrapped/intro/monitor-mascot.png";

const LINE = "Now let's talk about you";

// Dialogue box and text, canvas px from the Figma frame.
const BOX = { left: 107, top: 787, width: 866, height: 345 };
const TEXT_WIDTH = 768;

// Robot: a two-frame sprite sheet (mouth closed, mouth open), each frame the
// same box slid along the sheet. Crop percentages from the Figma "Talking sprites" group.
const ROBOT_BOX = { left: 16, top: 1114, width: 664, height: 849 };
const ROBOT_CROP_W = 255.62;
const MOUTH_CLOSED_X = -25.07;
const MOUTH_OPEN_X = -137.63;

// Typewriter pacing.
const TYPE_START_MS = 450;
const CHAR_MS = 55;
/** Extra beat after punctuation, like Undertale's pause on commas and full stops. */
const PUNCT_PAUSE_MS = 120;
/** The mouth toggles every this many typed letters. */
const LETTERS_PER_FLAP = 2;

/** When each character of LINE appears, ms into the slide. */
const CHAR_TIMES = (() => {
  const times: number[] = [];
  let t = TYPE_START_MS;
  for (const ch of LINE) {
    times.push(t);
    t += CHAR_MS + (/[.,!?]/.test(ch) ? PUNCT_PAUSE_MS : 0);
  }
  return times;
})();

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const lineStyle: CSSProperties = {
  fontFamily: '"Press Start 2P", monospace',
  fontSize: 46,
  lineHeight: 1.6,
  margin: 0,
  width: TEXT_WIDTH,
  color: "#FFFFFF",
  textAlign: "center",
  textShadow: "0 0 8px rgba(155,95,240,0.85), 0 0 20px rgba(74,95,217,0.5)",
};

export function TransitionSlide({ durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const boxRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (robotRef.current) applyEnterExit(tl, robotRef.current, duration, { enterMs: 400 });
    if (boxRef.current) applyEnterExit(tl, boxRef.current, duration, { enterMs: 300 });
    return tl;
  }, durationMs);

  // Reduced motion: the whole line at once, mouth shut.
  const reduced = prefersReducedMotion();
  const shown = reduced ? LINE.length : CHAR_TIMES.filter((t) => t <= elapsedMs).length;
  const typing = shown > 0 && shown < LINE.length;
  // Only letters flap the mouth; it rests shut on spaces and punctuation, and once the line is done.
  const lastChar = LINE[shown - 1] ?? " ";
  const mouthOpen = typing && /\w/.test(lastChar) && Math.floor((shown - 1) / LETTERS_PER_FLAP) % 2 === 0;

  return (
    <PixelBackground durationMs={durationMs}>
      <PlacedImage src={MONITOR_SRC} left={-391.37} top={1282.9} width={1016} height={1111} rotate={23.36} opacity={0.5} />
      <PlacedImage src={MONITOR_SRC} left={479.87} top={-401.73} width={1016} height={1111} rotate={-29.55} opacity={0.5} />

      <div ref={boxRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{ position: "absolute", ...BOX }}>
          <PixelCardSurface />
        </div>
        <div
          style={{
            position: "absolute",
            ...BOX,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Every letter is laid out from the start (unrevealed ones just
              invisible), so the text never reflows as it types. */}
          <p style={lineStyle} aria-label={LINE}>
            {[...LINE].map((ch, i) => (
              <span key={i} aria-hidden style={{ visibility: i < shown ? "visible" : "hidden" }}>
                {ch}
              </span>
            ))}
          </p>
        </div>
      </div>

      <div ref={robotRef} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <PlacedImage
          src={ROBOT_SRC}
          {...ROBOT_BOX}
          crop={{ left: mouthOpen ? MOUTH_OPEN_X : MOUTH_CLOSED_X, top: 0, width: ROBOT_CROP_W, height: 100 }}
        />
      </div>
    </PixelBackground>
  );
}

TransitionSlide.preload = [ROBOT_SRC, MONITOR_SRC];
