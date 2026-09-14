import { StatReveal } from "../components/StatReveal";
import type { SlideProps } from "../engine/SlideRegistry";

export function AttendeesSlide({ data, durationMs }: SlideProps) {
  return (
    <StatReveal
      durationMs={durationMs}
      label="And you guys loved it"
      caption="total attendees across every event this year"
      value={data.totalAttendeesAcrossEvents}
    />
  );
}
