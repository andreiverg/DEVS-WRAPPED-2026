import { createContext, useContext } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { CardBox } from "./PixelCard";

interface CardLayerValue {
  /** Layer stacked above the shared StoryCard, owned by StoryController. */
  target: HTMLElement;
  /** This slide's card box (SlideConfig.card). */
  box: CardBox;
}

const CardLayerContext = createContext<CardLayerValue | null>(null);

export function CardLayerProvider({ value, children }: { value: CardLayerValue | null; children: ReactNode }) {
  return <CardLayerContext.Provider value={value}>{children}</CardLayerContext.Provider>;
}

/**
 * Content that sits on this slide's stat card. The card itself is one
 * shared element drawn by StoryController (so it can morph between slides
 * instead of vanishing and reappearing); this portals the slide's text up
 * above it, positioned in the card's own coordinates — (0, 0) is the card's
 * top-left corner, matching the Figma card frame.
 */
export function OnCard({ children }: { children: ReactNode }) {
  const layer = useContext(CardLayerContext);
  if (!layer) return null;
  const { target, box } = layer;
  return createPortal(
    <div style={{ position: "absolute", left: box.left, top: box.top, width: box.width, height: box.height }}>
      {children}
    </div>,
    target,
  );
}
