import { StatReveal } from "../components/StatReveal";
import type { SlideProps } from "../engine/SlideRegistry";

export function ExecGrowthSlide({ data, durationMs }: SlideProps) {
  return (
    <StatReveal
      durationMs={durationMs}
      label="Our team also grew this year"
      caption="execs on board now"
      value={data.execCount}
      suffix=" execs"
    />
  );
}
