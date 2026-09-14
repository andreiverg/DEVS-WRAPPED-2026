import type { SlideConfig, SlideProps } from "../engine/SlideRegistry";

/**
 * Dev-only colored-box slides used to prove StoryController navigation and
 * timing end-to-end before real slide components exist (build step 3).
 * Delete once real slides (step 5) are wired into a real SlideRegistry.
 */
function makePlaceholder(label: string, color: string) {
  return function PlaceholderSlide({ durationMs }: SlideProps) {
    return (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: color,
          fontSize: 40,
          textAlign: "center",
          padding: 48,
        }}
      >
        <div>{label}</div>
        <div style={{ fontSize: 20, opacity: 0.7 }}>{durationMs}ms hold</div>
      </div>
    );
  };
}

export const PLACEHOLDER_SLIDES: SlideConfig[] = [
  { id: "a", durationMs: 3000, component: makePlaceholder("Slide A", "#6c2bd9") },
  { id: "b", durationMs: 4000, component: makePlaceholder("Slide B", "#2b4bd9") },
  { id: "c", durationMs: 2500, component: makePlaceholder("Slide C", "#9d5cff") },
  { id: "d", durationMs: 5000, component: makePlaceholder("Slide D", "#5c8cff") },
  { id: "e", durationMs: 3500, component: makePlaceholder("Slide E", "#050311") },
];
