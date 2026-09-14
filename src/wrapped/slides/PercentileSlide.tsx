import { StatReveal } from "../components/StatReveal";
import type { SlideProps } from "../engine/SlideRegistry";

export function PercentileSlide({ data, durationMs }: SlideProps) {
  return (
    <StatReveal
      durationMs={durationMs}
      label="You were in the top"
      caption="of attendees this year"
      value={data.attendancePercentile}
      suffix="%"
    />
  );
}
