import { useRef } from "react";
import gsap from "gsap";
import { PixelBackground } from "../components/PixelBackground";
import { SocietyStatCard } from "../components/SocietyStatCard";
import { PlacedImage } from "../components/Placed";
import { PhysicsDrop, type DropBody } from "../components/PhysicsDrop";
import { getDropTrack } from "../components/dropSimulation";
import { countUpValue, useCountUp } from "../components/useCountUp";
import { applyEnterExit, useSlideTimeline } from "../engine/Timeline";
import type { SlideProps } from "../engine/SlideRegistry";

const ASSETS = "/wrapped/joint-events";

/** Partner society logos, dropped one after another from above the frame to pile up at the bottom. */
const LOGOS: DropBody[] = [
  {
    shape: "rect",
    width: 608.57,
    height: 147.43,
    x: 330,
    y: -200,
    angle: 17.22,
    content: (
      <PlacedImage
        src={`${ASSETS}/uoacs.png`}
        left={0}
        top={0}
        width={608.57}
        height={147.43}
        crop={{ left: -13.69, top: -48.19, width: 128.04, height: 196.52 }}
      />
    ),
  },
  {
    shape: "rect",
    width: 549,
    height: 165.01,
    x: 760,
    y: -650,
    angle: 29.3,
    content: (
      <PlacedImage
        src={`${ASSETS}/devs.png`}
        left={0}
        top={0}
        width={549}
        height={165.01}
        crop={{ left: -20.09, top: -125.71, width: 142.45, height: 355.45 }}
      />
    ),
  },
  {
    shape: "rect",
    width: 539.19,
    height: 311.3,
    x: 380,
    y: -1100,
    angle: -8,
    content: <PlacedImage src={`${ASSETS}/sesa.png`} left={0} top={0} width={539.19} height={311.3} />,
  },
  {
    shape: "rect",
    width: 496.46,
    height: 288.92,
    x: 720,
    y: -1550,
    angle: -22.6,
    content: (
      <PlacedImage
        src={`${ASSETS}/gdgc.png`}
        left={0}
        top={0}
        width={496.46}
        height={288.92}
        crop={{ left: -4.82, top: -45.42, width: 110.66, height: 190.14 }}
      />
    ),
  },
];

export function JointEventsSlide({ data, durationMs }: SlideProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const progress = useCountUp(durationMs);

  useSlideTimeline((duration) => {
    const tl = gsap.timeline();
    if (cardRef.current) applyEnterExit(tl, cardRef.current, duration, { enterMs: 900 });
    return tl;
  }, durationMs);

  return (
    <PixelBackground durationMs={durationMs}>
      <PhysicsDrop bodies={LOGOS} durationMs={durationMs} />

      <SocietyStatCard
        ref={cardRef}
        label="WE ALSO MADE NEW FRIENDS, HOSTING"
        value={countUpValue(data.jointEventsHeld, progress)}
        caption="joint events with other societies"
      />
    </PixelBackground>
  );
}

JointEventsSlide.preload = ["uoacs.png", "devs.png", "sesa.png", "gdgc.png"].map((f) => `${ASSETS}/${f}`);
JointEventsSlide.prepare = (durationMs: number) => {
  getDropTrack(LOGOS, durationMs);
};
