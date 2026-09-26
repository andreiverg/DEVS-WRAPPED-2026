import { MountainProgressTracker } from "../components/MountainProgressTracker";
import type { SlideProps } from "../engine/SlideRegistry";

export function PercentileSlide({ data, durationMs }: SlideProps) {
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <MountainProgressTracker percentile={data.attendancePercentile} durationMs={durationMs} />
    </div>
  );
}
