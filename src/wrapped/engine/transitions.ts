import type { CardBox } from "../components/PixelCard";
import type { SlideConfig, TransitionKind } from "./SlideRegistry";

export interface SlideTransition {
  kind: TransitionKind;
  /** 1 when moving forward through the story, -1 when going back. */
  direction: 1 | -1;
}

export const TRANSITION_MS: Record<TransitionKind, number> = {
  dissolve: 700,
  crt: 450,
  parallax: 650,
};

/** Where a shared element sits on a slide, canvas px. */
export type SharedBox = CardBox;

/**
 * A shared element's state at a slide: an element that several consecutive
 * slides have (the stat card, the spotlight truss) is drawn once by the
 * story and morphs between their boxes instead of each slide drawing its own.
 */
export interface SharedState {
  /** This slide's box, or undefined when it doesn't have the element. */
  box: SharedBox | undefined;
  /** The most recent box at or before this slide — where a hidden element sits. */
  lastBox: SharedBox | undefined;
  /** First slide of the run of consecutive slides `lastBox` belongs to. */
  runStart: number;
}

export type SharedElementId = keyof NonNullable<SlideConfig["shared"]>;

/** Derives a shared element's state for a slide index — pure, from the registry. */
export function sharedStateAt(slides: SlideConfig[], index: number, id: SharedElementId): SharedState {
  const boxAt = (i: number) => slides[i]?.shared?.[id];
  let last = index;
  while (last >= 0 && !boxAt(last)) last--;
  let runStart = last;
  while (runStart > 0 && boxAt(runStart - 1)) runStart--;
  return { box: boxAt(index), lastBox: last >= 0 ? boxAt(last) : undefined, runStart };
}
