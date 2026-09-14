import { StatReveal } from "../components/StatReveal";
import type { SlideProps } from "../engine/SlideRegistry";

export function SocietyEventsSlide({ data, durationMs }: SlideProps) {
  return (
    <StatReveal
      durationMs={durationMs}
      label="This year we held"
      caption="events across the whole society"
      value={data.societyEventsHeld}
    />
  );
}
