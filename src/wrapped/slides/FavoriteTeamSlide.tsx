import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OutlinedText } from "../components/OutlinedText";
import { CenteredText, Layer } from "../components/Placed";
import { RobotSprite, ROBOT_BOX, ROBOT_SRC } from "../components/RobotSprite";
import { STAT_VALUE_FILL, STAT_VALUE_STROKE } from "../components/StatCard";
import { PILLAR_SRC, fitJoystix, prefersReducedMotion } from "../components/PersonalArt";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import { CATEGORY_LABEL, CATEGORY_QUIP, CATEGORY_SHORT_LABEL } from "../data/categoryCopy";
import type { EventCategory } from "../data/schema";
import type { SlideProps } from "../engine/SlideRegistry";

const inter: CSSProperties = { fontFamily: '"Inter", sans-serif', fontWeight: 700, lineHeight: 1.5, color: "#FFFFFF" };

const CATEGORIES: readonly EventCategory[] = ["tech", "industry", "competitions", "social"];

// Four pillars (the podium art, re-sliced into one tall column) across the
// bottom of the frame, each as tall as this member's count for that team.
const COLUMN_CENTERS = [138, 404, 676, 942];
const PILLAR_W = 240;
/** pillar.png is 422x2000; drawn at PILLAR_W it runs well past the bottom edge. */
const PILLAR_H = (2000 * PILLAR_W) / 422;
const TOP_MOST = 1330;
const TOP_LEAST = 1720;

const RISE_S = 0.8;
const RISE_STAGGER_S = 0.3;
const FIRST_RISE_S = 0.5;
const EXIT_S = 0.7;

const ROBOT_SCALE = 0.62;

export function FavoriteTeamSlide({ data, durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const headingRef = useRef<HTMLDivElement>(null);
  const barsRef = useRef<HTMLDivElement>(null);
  const pillarRefs = useRef<Array<HTMLDivElement | null>>([]);

  const counts = CATEGORIES.map((c) => data.eventsByCategory[c]);
  const max = Math.max(...counts);
  const hasFavourite = max > 0;
  const favourite = data.favoriteCategory;
  const tops = counts.map((n) => TOP_LEAST - (max > 0 ? n / max : 0) * (TOP_LEAST - TOP_MOST));
  // Rise from the smallest pillar to the favourite, so the winner lands last.
  const isFav = (i: number) => Number(CATEGORIES[i] === favourite);
  const riseOrder = CATEGORIES.map((_, i) => i).sort((a, b) => counts[a] - counts[b] || isFav(a) - isFav(b));

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (headingRef.current) applyEnterExit(tl, headingRef.current, duration);
    riseOrder.forEach((col, order) => {
      const el = pillarRefs.current[col];
      if (!el) return;
      tl.fromTo(
        el,
        { y: 1920 - tops[col] + 40 },
        { y: 0, duration: RISE_S, ease: "back.out(1.1)" },
        FIRST_RISE_S + order * RISE_STAGGER_S,
      );
    });
    if (barsRef.current) {
      tl.fromTo(
        barsRef.current,
        { opacity: 1 },
        { opacity: 0, duration: EXIT_S, ease: "power2.in", immediateRender: false },
        duration / 1000 - EXIT_S,
      );
    }
    return tl;
  }, durationMs);

  const name = hasFavourite ? CATEGORY_LABEL[favourite].toUpperCase() : "TBD";
  const quip = hasFavourite ? CATEGORY_QUIP[favourite].replace(/\.$/, "") : "come along to an event and pick a side";

  // The robot hops on top of the winning pillar once it's landed.
  const landedS = FIRST_RISE_S + (CATEGORIES.length - 1) * RISE_STAGGER_S + RISE_S;
  const t = prefersReducedMotion() ? landedS : elapsedMs / 1000;
  const sinceLand = Math.max(0, t - landedS);
  const hop = t >= landedS ? Math.abs(Math.sin(sinceLand * Math.PI * 1.6)) * 40 : 0;
  const robotPose = t >= landedS ? 1 + (Math.floor(sinceLand * 1.6) % 4) : 0;
  const robotW = ROBOT_BOX.width * ROBOT_SCALE;
  const robotH = ROBOT_BOX.height * ROBOT_SCALE;

  return (
    <PixelBackground durationMs={durationMs}>
      {/* The spotlight truss is the shared StoryTruss. */}
      <Layer ref={headingRef}>
        <CenteredText centerX={540} top={690} style={{ ...inter, fontSize: 32 }}>
          {hasFavourite ? "YOUR FAVOURITE TEAM WAS" : "YOUR FAVOURITE TEAM IS"}
        </CenteredText>
        <CenteredText centerX={540} top={735} style={{ fontFamily: '"Joystix", monospace', fontSize: fitJoystix(name, 900, 120), lineHeight: 1.5 }}>
          <OutlinedText fill={STAT_VALUE_FILL} stroke={{ ...STAT_VALUE_STROKE, width: 6 }}>
            {name}
          </OutlinedText>
        </CenteredText>
        <CenteredText centerX={540} top={925} width={900} style={{ ...inter, fontWeight: 500, fontSize: 28 }}>
          {quip}
        </CenteredText>
      </Layer>

      <Layer ref={barsRef}>
        {CATEGORIES.map((category, i) => {
          const isFavourite = hasFavourite && category === favourite;
          const left = COLUMN_CENTERS[i] - PILLAR_W / 2;
          return (
            <div
              key={category}
              ref={(el) => {
                pillarRefs.current[i] = el;
              }}
              style={{ position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              {isFavourite ? (
                <RobotSprite
                  pose={robotPose}
                  left={COLUMN_CENTERS[i] - robotW / 2}
                  top={tops[i] - robotH + 22 - hop}
                  scale={ROBOT_SCALE}
                />
              ) : null}
              <img
                src={PILLAR_SRC}
                alt=""
                draggable={false}
                style={{
                  position: "absolute",
                  left,
                  top: tops[i],
                  width: PILLAR_W,
                  height: PILLAR_H,
                  maxWidth: "none",
                  filter: isFavourite
                    ? "drop-shadow(0 0 28px rgba(212,120,251,0.9))"
                    : hasFavourite
                      ? "brightness(0.7) saturate(0.7)"
                      : undefined,
                }}
              />
              <CenteredText
                centerX={COLUMN_CENTERS[i]}
                top={tops[i] + 70}
                style={{ fontFamily: '"Joystix", monospace', fontSize: 72, lineHeight: 1.2, color: isFavourite ? "#FFFFFF" : "#BDB3D1" }}
              >
                {String(counts[i])}
              </CenteredText>
              <CenteredText
                centerX={COLUMN_CENTERS[i]}
                top={tops[i] + 160}
                style={{ ...inter, fontSize: 24, color: isFavourite ? "#FFFFFF" : "#BDB3D1" }}
              >
                {CATEGORY_SHORT_LABEL[category].toUpperCase()}
              </CenteredText>
            </div>
          );
        })}
      </Layer>
    </PixelBackground>
  );
}

FavoriteTeamSlide.preload = [PILLAR_SRC, ROBOT_SRC, "/wrapped/shared/spotlight-truss.png"];
