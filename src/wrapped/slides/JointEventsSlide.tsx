import { StatReveal } from "../components/StatReveal";
import type { SlideProps } from "../engine/SlideRegistry";

export function JointEventsSlide({ data, durationMs }: SlideProps) {
  return (
    <StatReveal
      durationMs={durationMs}
      label="We also made new friends, hosting"
      caption="joint events with other societies"
      value={data.jointEventsHeld}
    />
  );
}
