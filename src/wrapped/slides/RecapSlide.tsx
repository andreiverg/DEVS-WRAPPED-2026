import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
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

  const rows: Array<[string, string]> = [
    ["Events attended", data.hasAttendedEvents ? String(data.eventsAttended) : "—"],
    ["Prizes won", data.prizesWon > 0 ? String(data.prizesWon) : "—"],
    ["Favourite team", CATEGORY_LABEL[data.favoriteCategory]],
    ["Top", `${data.attendancePercentile}%`],
    ["DEVS archetype", ARCHETYPE_LABEL[data.archetype]],
  ];

  return (
    <PixelBackground>
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
        <div data-recap-item style={{ fontSize: 32, marginBottom: 16 }}>
          {data.yearLabel} Recap
        </div>
        {rows.map(([label, value]) => (
          <div
            key={label}
            data-recap-item
            style={{ display: "flex", justifyContent: "space-between" }}
          >
            <span>{label}</span>
            <span>{value}</span>
          </div>
        ))}
      </div>
    </PixelBackground>
  );
}
