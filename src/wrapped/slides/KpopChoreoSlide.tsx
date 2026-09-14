import { StatReveal } from "../components/StatReveal";
import type { SlideProps } from "../engine/SlideRegistry";

export function KpopChoreoSlide({ data, durationMs }: SlideProps) {
  return (
    <StatReveal
      durationMs={durationMs}
      label="You learned"
      caption="K-pop choreos this year"
      value={data.kpopChoreosTaught}
    />
  );
}
