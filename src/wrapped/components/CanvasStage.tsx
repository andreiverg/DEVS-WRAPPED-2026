import type { CSSProperties, ReactNode } from "react";

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;

const stageStyle: CSSProperties = {
  position: "relative",
  width: CANVAS_WIDTH,
  height: CANVAS_HEIGHT,
  overflow: "hidden",
  background: "#ffffff",
  color: "#000000",
};

/**
 * The fixed 1080x1920 virtual canvas every slide renders into. Intentionally
 * NOT responsive — desktop scaling/letterboxing is a concern of the caller
 * (see LiveDOM), never of the canvas or the slides themselves.
 */
export function CanvasStage({ children }: { children: ReactNode }) {
  return (
    <div
      className="wrapped-canvas-stage"
      style={stageStyle}
      data-canvas-width={CANVAS_WIDTH}
      data-canvas-height={CANVAS_HEIGHT}
    >
      {children}
    </div>
  );
}

export { CANVAS_WIDTH, CANVAS_HEIGHT };
