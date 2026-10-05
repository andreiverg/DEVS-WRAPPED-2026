/**
 * Deterministic, cached physics for PhysicsDrop: a body set's whole fall is
 * simulated once at a fixed 60fps step and replayed by elapsed time. Lives
 * outside the component so slides can simulate ahead of time (`prepare`)
 * instead of stalling on mount.
 */
import type { ReactNode } from "react";
import Matter from "matter-js";
import { CANVAS_HEIGHT, CANVAS_WIDTH } from "./CanvasStage";

export interface DropBody {
  shape: "circle" | "rect";
  /** Body size in canvas px. For circles, width is the diameter. */
  width: number;
  height: number;
  /** Starting center, usually above the canvas (negative y). */
  x: number;
  y: number;
  /** Starting tilt, clockwise degrees. */
  angle?: number;
  /** What to draw, filling the body's width x height box. */
  content: ReactNode;
}

/** Fixed simulation step: 60fps. */
export const STEP_MS = 1000 / 60;
const WALL = 400;

/** Per frame, per body: x, y, angle (radians). */
function simulate(bodies: DropBody[], frames: number, floorY: number): Float32Array {
  const engine = Matter.Engine.create({ gravity: { x: 0, y: 1.8 } });
  const material = { restitution: 0.25, friction: 0.5, frictionAir: 0.008 };

  const bounds = [
    Matter.Bodies.rectangle(CANVAS_WIDTH / 2, floorY + WALL / 2, CANVAS_WIDTH + WALL * 2, WALL, { isStatic: true }),
    Matter.Bodies.rectangle(-WALL / 2, 0, WALL, CANVAS_HEIGHT * 6, { isStatic: true }),
    Matter.Bodies.rectangle(CANVAS_WIDTH + WALL / 2, 0, WALL, CANVAS_HEIGHT * 6, { isStatic: true }),
  ];
  const dynamic = bodies.map((b) => {
    const angle = ((b.angle ?? 0) * Math.PI) / 180;
    return b.shape === "circle"
      ? Matter.Bodies.circle(b.x, b.y, b.width / 2, { ...material, angle })
      : Matter.Bodies.rectangle(b.x, b.y, b.width, b.height, { ...material, angle, chamfer: { radius: 12 } });
  });
  Matter.Composite.add(engine.world, [...bounds, ...dynamic]);

  const out = new Float32Array(frames * bodies.length * 3);
  for (let f = 0; f < frames; f++) {
    dynamic.forEach((body, i) => {
      const o = (f * bodies.length + i) * 3;
      out[o] = body.position.x;
      out[o + 1] = body.position.y;
      out[o + 2] = body.angle;
    });
    Matter.Engine.update(engine, STEP_MS);
  }
  return out;
}

/** Simulations by body set, then by `${frames}:${floorY}` — each drop is only ever simulated once. */
const tracks = new WeakMap<DropBody[], Map<string, Float32Array>>();

/** The precomputed drop for these bodies; simulates on first request, cached after. */
export function getDropTrack(bodies: DropBody[], durationMs: number, floorY = CANVAS_HEIGHT): Float32Array {
  const frames = dropFrameCount(durationMs);
  const key = `${frames}:${floorY}`;
  let byKey = tracks.get(bodies);
  if (!byKey) tracks.set(bodies, (byKey = new Map()));
  let track = byKey.get(key);
  if (!track) byKey.set(key, (track = simulate(bodies, frames, floorY)));
  return track;
}

export function dropFrameCount(durationMs: number): number {
  return Math.ceil(durationMs / STEP_MS) + 1;
}
