import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { CANVAS_HEIGHT, CANVAS_WIDTH, CanvasStage } from "../components/CanvasStage";

const CANVAS_ASPECT = CANVAS_WIDTH / CANVAS_HEIGHT;

function computeScale(viewportWidth: number, viewportHeight: number): number {
  const viewportAspect = viewportWidth / viewportHeight;
  return viewportAspect > CANVAS_ASPECT
    ? viewportHeight / CANVAS_HEIGHT
    : viewportWidth / CANVAS_WIDTH;
}

/**
 * Real interactive mounted experience. Measures its container and scales the
 * fixed 1080x1920 canvas to fit, letterboxing the remainder. This is purely a
 * live-DOM presentation concern — the canvas and slides underneath never know
 * they're being scaled.
 */
export function LiveDOM({ children }: { children: ReactNode }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setScale(computeScale(width, height));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        width: "100%",
        height: "100%",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#ffffff",
      }}
    >
      <div
        style={{
          width: CANVAS_WIDTH,
          height: CANVAS_HEIGHT,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        <CanvasStage>{children}</CanvasStage>
      </div>
    </div>
  );
}
