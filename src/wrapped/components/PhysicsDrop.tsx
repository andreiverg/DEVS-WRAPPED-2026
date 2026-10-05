import { useMemo } from "react";
import { useSlideClock } from "../engine/Timeline";
import { CANVAS_HEIGHT } from "./CanvasStage";
import { STEP_MS, dropFrameCount, getDropTrack } from "./dropSimulation";
import type { DropBody } from "./dropSimulation";

export type { DropBody };

function prefersReducedMotion(): boolean {
  return typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
}

interface PhysicsDropProps {
  bodies: DropBody[];
  durationMs: number;
  /** Canvas y of the floor the pile settles on. Defaults to the bottom edge. */
  floorY?: number;
}

/**
 * Things that fall in from above the canvas under gravity, bounce, and pile
 * up on the floor. The whole drop is simulated once, up front, at a fixed
 * 60fps step, and each render just looks up the frame for `elapsedMs` from
 * `useSlideClock` — never a live physics loop — so a given elapsedMs renders
 * identically live or under the stepped export clock (same contract as
 * MountainProgressTracker / EventCorkboard).
 */
export function PhysicsDrop({ bodies, durationMs, floorY = CANVAS_HEIGHT }: PhysicsDropProps) {
  const elapsedMs = useSlideClock(durationMs);
  const frames = dropFrameCount(durationMs);
  // Usually already simulated during the previous slide (see slide `prepare`).
  const track = useMemo(() => getDropTrack(bodies, durationMs, floorY), [bodies, durationMs, floorY]);

  // Reduced motion skips the fall and shows the settled pile.
  const frame = prefersReducedMotion() ? frames - 1 : Math.min(frames - 1, Math.max(0, Math.floor(elapsedMs / STEP_MS)));

  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
      {bodies.map((b, i) => {
        const o = (frame * bodies.length + i) * 3;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              width: b.width,
              height: b.height,
              transform: `translate(${track[o] - b.width / 2}px, ${track[o + 1] - b.height / 2}px) rotate(${track[o + 2]}rad)`,
              willChange: "transform",
            }}
          >
            {b.content}
          </div>
        );
      })}
    </div>
  );
}
