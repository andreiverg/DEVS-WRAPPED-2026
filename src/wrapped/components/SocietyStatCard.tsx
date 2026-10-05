import type { CSSProperties, Ref } from "react";
import { OnCard } from "./OnCard";
import { OutlinedText } from "./OutlinedText";
import { CenteredText, Layer } from "./Placed";

/** Horizontal center of the 866px-wide society stat card. */
const CARD_CENTER_X = 433;

const labelStyle: CSSProperties = {
  fontFamily: '"Inter", sans-serif',
  fontWeight: 700,
  fontSize: 32,
  lineHeight: 1.5,
  color: "#FFFFFF",
};

const captionStyle: CSSProperties = { ...labelStyle, fontWeight: 500 };

const valueStyle: CSSProperties = {
  fontFamily: '"Joystix", monospace',
  fontSize: 200,
  lineHeight: 1.5,
};

interface SocietyStatCardProps {
  label: string;
  value: string;
  caption: string;
  ref?: Ref<HTMLDivElement>;
}

/**
 * "Label / big outlined number / caption" text for the society-wide count
 * slides (events held, joint events), laid out on the shared stat card —
 * the card itself is drawn by StoryController so it carries over between
 * these slides while only the text changes.
 */
export function SocietyStatCard({ label, value, caption, ref }: SocietyStatCardProps) {
  return (
    <OnCard>
      <Layer ref={ref}>
        <CenteredText centerX={CARD_CENTER_X - 4} top={95} style={valueStyle}>
          <OutlinedText fill={["#FFFFFF", "#999999"]} stroke={{ width: 8, colors: ["#753EFF", "#A77FFF"] }}>
            {value}
          </OutlinedText>
        </CenteredText>
        <CenteredText centerX={CARD_CENTER_X} top={95} style={labelStyle}>
          {label}
        </CenteredText>
        <CenteredText centerX={CARD_CENTER_X} top={386} style={captionStyle}>
          {caption}
        </CenteredText>
      </Layer>
    </OnCard>
  );
}
