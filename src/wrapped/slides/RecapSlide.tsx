import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { GlitchText } from "../components/GlitchText";
import { Caption } from "../components/Caption";
import { useSlideTimeline } from "../engine/Timeline";
import { ARCHETYPE_LABEL } from "../data/archetypeCopy";
import { CATEGORY_LABEL } from "../data/categoryCopy";
import type { SlideProps } from "../engine/SlideRegistry";

export function RecapSlide({ data, durationMs }: SlideProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (rootRef.current) {
      const items = rootRef.current.querySelectorAll("[data-recap-item]");
      // fromTo with explicit endpoints — see applyEnterExit's comment for why
      // .from()/.to() (implicit endpoints) break across StrictMode's dev-mode
      // double-mount of this effect.
      tl.fromTo(
        items,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.12, ease: "power2.out" },
        0,
      );
      tl.fromTo(
        rootRef.current,
        { opacity: 1 },
        { opacity: 0, duration: 0.6, ease: "power2.in" },
        Math.max(1.5, duration / 1000 - 0.6),
      );
    }
    return tl;
  }, durationMs);

  const rows: Array<[label: string, value: string, isNumeric: boolean]> = [
    ["Events attended", data.hasAttendedEvents ? String(data.eventsAttended) : "—", true],
    ["Prizes won", data.prizesWon > 0 ? String(data.prizesWon) : "—", true],
    ["Favourite team", CATEGORY_LABEL[data.favoriteCategory], false],
    ["Top", `${data.attendancePercentile}%`, true],
    ["DEVS archetype", ARCHETYPE_LABEL[data.archetype], false],
  ];

  return (
    <PixelBackground durationMs={durationMs}>
      <div
        ref={rootRef}
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          gap: 24,
          padding: 64,
        }}
      >
        <div data-recap-item style={{ marginBottom: 16 }}>
          <GlitchText durationMs={durationMs} fontSize={36}>{`${data.yearLabel} Recap`}</GlitchText>
        </div>
        {rows.map(([label, value, isNumeric]) => (
          <div
            key={label}
            data-recap-item
            style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}
          >
            <Caption>{label}</Caption>
            <span
              style={
                isNumeric
                  ? {
                      fontFamily: '"Jersey 10", monospace',
                      fontSize: 34,
                      color: "#FFFFFF",
                      textShadow: "0 0 10px rgba(123,63,228,0.8)",
                    }
                  : {
                      fontFamily: '"Space Grotesk", sans-serif',
                      fontWeight: 700,
                      fontSize: 28,
                      color: "#FFFFFF",
                    }
              }
            >
              {value}
            </span>
          </div>
        ))}
      </div>
    </PixelBackground>
  );
}
