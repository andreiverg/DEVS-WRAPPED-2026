import type { EventCategory } from "./schema";

export const CATEGORY_LABEL: Record<EventCategory, string> = {
  tech: "Tech",
  industry: "Industry",
  competitions: "Competitions",
  social: "Social",
};

/** Short form for tight spots like the popular-category podium. */
export const CATEGORY_SHORT_LABEL: Record<EventCategory, string> = {
  tech: "Tech",
  industry: "Industry",
  competitions: "Comps",
  social: "Social",
};

/** Flavor line following a category reveal, e.g. "...you guys really wanted those internships huh." */
export const CATEGORY_QUIP: Record<EventCategory, string> = {
  tech: "clearly you can't get enough of building things.",
  industry: "you guys really wanted those internships huh.",
  competitions: "that competitive streak is real.",
  social: "turns out you just wanted an excuse to hang out.",
};
