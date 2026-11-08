import type { CSSProperties, Ref } from "react";
import { OnCard } from "./OnCard";
import { OutlinedText } from "./OutlinedText";
import { CenteredText, Layer } from "./Placed";

/** Horizontal center of the 866px-wide stat card. */
const CARD_CENTER_X = 433;

const labelStyle: CSSProperties = {
  fontFamily: '"Inter", sans-serif',
  fontWeight: 700,
  fontSize: 32,
  lineHeight: 1.5,
  color: "#FFFFFF",
};

const captionStyle: CSSProperties = { ...labelStyle, fontWeight: 500 };

const VALUE_FONT_SIZE = 200;
const VALUE_TOP = 95;

export const STAT_VALUE_FILL = ["#FFFFFF", "#999999"] as const;
export const STAT_VALUE_STROKE = { width: 8, colors: ["#753EFF", "#A77FFF"] } as const;

interface StatCardProps {
  label: string;
  value: string;
  caption: string;
  /** Shrinks the big number for longer values; it stays centered where the 200px one sits. */
  valueFontSize?: number;
  /** Wraps the caption to this width instead of keeping it on one line. */
  captionWidth?: number;
  ref?: Ref<HTMLDivElement>;
}

/**
 * "Label / big outlined number / caption" text for the count slides (events
 * held, joint events, the member's own stats), laid out on the shared stat
 * card — the card itself is drawn by StoryController so it carries over
 * between these slides while only the text changes. Positions are for the
 * 866px-wide card.
 */
export function StatCard({ label, value, caption, valueFontSize = VALUE_FONT_SIZE, captionWidth, ref }: StatCardProps) {
  // Keep a smaller number's line box centered on the 200px one's.
  const valueTop = VALUE_TOP + ((VALUE_FONT_SIZE - valueFontSize) * 1.5) / 2;
  const strokeWidth = Math.max(4, Math.round((STAT_VALUE_STROKE.width * valueFontSize) / VALUE_FONT_SIZE));
  return (
    <OnCard>
      <Layer ref={ref}>
        <CenteredText centerX={CARD_CENTER_X - 4} top={valueTop} style={{ fontFamily: '"Joystix", monospace', fontSize: valueFontSize, lineHeight: 1.5 }}>
          <OutlinedText fill={STAT_VALUE_FILL} stroke={{ ...STAT_VALUE_STROKE, width: strokeWidth }}>
            {value}
          </OutlinedText>
        </CenteredText>
        <CenteredText centerX={CARD_CENTER_X} top={95} style={labelStyle}>
          {label}
        </CenteredText>
        <CenteredText centerX={CARD_CENTER_X} top={386} width={captionWidth} style={captionStyle}>
          {caption}
        </CenteredText>
      </Layer>
    </OnCard>
  );
}
