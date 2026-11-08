import { useRef } from "react";
import type { CSSProperties } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OnCard } from "../components/OnCard";
import { OutlinedText } from "../components/OutlinedText";
import { CenteredText, Layer, PlacedImage } from "../components/Placed";
import { STAT_VALUE_FILL } from "../components/StatCard";
import { ArchetypeBadge, ARCHETYPE_BADGES_SRC, fitJoystix } from "../components/PersonalArt";
import { LogoWord } from "../components/WrappedLogo";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import { ARCHETYPE_LABEL } from "../data/archetypeCopy";
import { CATEGORY_SHORT_LABEL } from "../data/categoryCopy";
import type { SlideProps } from "../engine/SlideRegistry";

const MONITOR_SRC = "/wrapped/intro/monitor-mascot.png";
const ROBOT_TALK_SRC = "/wrapped/transition/robot-talk.png";

/** Recap card, card-relative px (it's 909 wide — see RECAP_CARD in SlideRegistry). */
const CARD_W = 909;
const PAD_X = 70;
const ROWS_TOP = 330;
const ROW_STEP = 136;

const rowLabel: CSSProperties = {
  fontFamily: '"Inter", sans-serif',
  fontWeight: 700,
  fontSize: 28,
  letterSpacing: "0.04em",
  color: "#D5D4D4",
};

export function RecapSlide({ data, durationMs }: SlideProps) {
  const headerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<HTMLDivElement>(null);
  const robotRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (headerRef.current) applyEnterExit(tl, headerRef.current, duration, { enterMs: 700 });
    if (rowsRef.current) {
      const rows = rowsRef.current.querySelectorAll("[data-recap-row]");
      // fromTo with explicit endpoints — see applyEnterExit for why.
      tl.fromTo(rows, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.4, stagger: 0.16, ease: "back.out(1.6)" }, 0.5);
      applyEnterExit(tl, rowsRef.current, duration, { enterMs: 1 });
    }
    if (robotRef.current) applyEnterExit(tl, robotRef.current, duration, { enterMs: 600, delayMs: 1400 });
    return tl;
  }, durationMs);

  const months = Math.max(1, Math.floor(data.membershipDurationDays / 30));
  const memberFor = data.isNewMember
    ? `${data.membershipDurationDays} ${data.membershipDurationDays === 1 ? "DAY" : "DAYS"}`
    : `${months} ${months === 1 ? "MONTH" : "MONTHS"}`;
  const p = data.attendancePercentile;
  const hasFavourite = Object.values(data.eventsByCategory).some((n) => n > 0);

  const rows: Array<[label: string, value: string]> = [
    ["MEMBER FOR", memberFor],
    ["EVENTS ATTENDED", String(data.eventsAttended)],
    ["PRIZES WON", data.prizesWon > 0 ? String(data.prizesWon) : "—"],
    ["FAVOURITE TEAM", hasFavourite ? CATEGORY_SHORT_LABEL[data.favoriteCategory].toUpperCase() : "TBD"],
    ["ATTENDANCE", p <= 50 ? `TOP ${p}%` : `BEAT ${100 - p}%`],
    ["ARCHETYPE", ARCHETYPE_LABEL[data.archetype].toUpperCase()],
  ];

  const name = `${data.displayName.toUpperCase()}'S`;
  const nameSize = Math.min(120, Math.floor(700 / (name.length * 0.9)));

  return (
    <PixelBackground durationMs={durationMs}>
      <PlacedImage src={MONITOR_SRC} left={-391.37} top={1282.9} width={1016} height={1111} rotate={23.36} opacity={0.5} />
      <PlacedImage src={MONITOR_SRC} left={479.87} top={-401.73} width={1016} height={1111} rotate={-29.55} opacity={0.5} />

      <Layer ref={robotRef}>
        {/* The talking robot from the pivot slide, mouth shut, peeking up under the card. */}
        <PlacedImage
          src={ROBOT_TALK_SRC}
          left={640}
          top={1420}
          width={365}
          height={467}
          crop={{ left: -25.07, top: 0, width: 255.62, height: 100 }}
        />
      </Layer>

      <OnCard>
        <Layer ref={headerRef}>
          <LogoWord
            text={name}
            fontSize={nameSize}
            face={{ centerX: CARD_W / 2, top: 40 }}
            back={{ centerX: CARD_W / 2, top: 40 + nameSize * 0.07 }}
          />
          <CenteredText
            centerX={CARD_W / 2}
            top={60 + nameSize * 1.25}
            style={{ fontFamily: '"Joystix", monospace', fontSize: 40, color: "#D478FB", lineHeight: 1.2 }}
          >
            {`${data.yearLabel} WRAPPED`}
          </CenteredText>
          <ArchetypeBadge archetype={data.archetype} left={CARD_W - 150} top={-70} size={190} rotate={14} />
        </Layer>

        <Layer ref={rowsRef}>
          {rows.map(([label, value], i) => (
            <div
              key={label}
              data-recap-row
              style={{
                position: "absolute",
                left: PAD_X,
                top: ROWS_TOP + i * ROW_STEP,
                width: CARD_W - PAD_X * 2,
                height: ROW_STEP - 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                borderBottom: i < rows.length - 1 ? "4px dashed #3A3A39" : "none",
              }}
            >
              <span style={rowLabel}>{label}</span>
              <span style={{ fontFamily: '"Joystix", monospace', fontSize: fitJoystix(value, 470, 60), lineHeight: 1 }}>
                <OutlinedText fill={STAT_VALUE_FILL} stroke={{ width: 4, colors: ["#753EFF", "#A77FFF"] }}>
                  {value}
                </OutlinedText>
              </span>
            </div>
          ))}
        </Layer>
      </OnCard>
    </PixelBackground>
  );
}

RecapSlide.preload = [MONITOR_SRC, ROBOT_TALK_SRC, ARCHETYPE_BADGES_SRC];
