import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { OnCard } from "../components/OnCard";
import { PlacedImage } from "../components/Placed";
import { HANGING_DEVA_SRC, LOGO_ASSETS, WrappedLogo } from "../components/WrappedLogo";
import { applyEnterExit, useSlideClock, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

const MONITOR_SRC = `${LOGO_ASSETS}/monitor-mascot.png`;

export function IntroSlide({ data, durationMs }: SlideProps) {
  const elapsedMs = useSlideClock(durationMs);
  const titleRef = useRef<HTMLDivElement>(null);
  const yearRef = useRef<HTMLDivElement>(null);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (titleRef.current) applyEnterExit(tl, titleRef.current, duration);
    if (yearRef.current) applyEnterExit(tl, yearRef.current, duration, { enterMs: 900 });
    return tl;
  }, durationMs);

  return (
    <PixelBackground durationMs={durationMs}>
      <PlacedImage src={MONITOR_SRC} left={-391.37} top={1282.9} width={1016} height={1111} rotate={23.36} opacity={0.5} />

      {/* Card-relative (0, 0 = the intro card's top-left); the card itself is the shared StoryCard. */}
      <OnCard>
        <WrappedLogo
          societyName={data.societyName}
          yearLabel={data.yearLabel}
          elapsedMs={elapsedMs}
          titleRef={titleRef}
          yearRef={yearRef}
        />

        {/* The top-right monitor overlaps the card in the design, so it rides above it. */}
        <PlacedImage src={MONITOR_SRC} left={394.87} top={-1044.73} width={1016} height={1111} rotate={-29.55} opacity={0.5} />
      </OnCard>
    </PixelBackground>
  );
}

IntroSlide.preload = [MONITOR_SRC, HANGING_DEVA_SRC];
