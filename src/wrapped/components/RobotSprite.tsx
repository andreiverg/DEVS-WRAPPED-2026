import type { CSSProperties } from "react";

/**
 * The DEVS robot from the K-pop slide's 5-pose sprite sheet (2172x724),
 * cropped to one pose. At scale 1 it fills the same 423x434 box as on that
 * slide; `scale` sizes the box and the sheet together so the pixels stay
 * aligned.
 */
export const ROBOT_SRC = "/wrapped/kpop-choreos/robot.png";

const BOX = { width: 423, height: 434 };
const SHEET = { width: 2172, height: 724, top: -182 };
/** Each pose's horizontal offset into the sheet, px (same as KpopChoreoSlide). */
const POSE_X = [40, 441.5, 857.5, 1273, 1723.5];

export const ROBOT_POSE_COUNT = POSE_X.length;
export const ROBOT_BOX = BOX;

interface RobotSpriteProps {
  pose: number;
  left: number;
  top: number;
  scale?: number;
  style?: CSSProperties;
}

export function RobotSprite({ pose, left, top, scale = 1, style }: RobotSpriteProps) {
  const x = POSE_X[((pose % POSE_X.length) + POSE_X.length) % POSE_X.length];
  return (
    <div
      style={{
        position: "absolute",
        left,
        top,
        width: BOX.width * scale,
        height: BOX.height * scale,
        overflow: "hidden",
        pointerEvents: "none",
        ...style,
      }}
    >
      <img
        src={ROBOT_SRC}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: -x * scale,
          top: SHEET.top * scale,
          width: SHEET.width * scale,
          height: SHEET.height * scale,
          maxWidth: "none",
        }}
      />
    </div>
  );
}
