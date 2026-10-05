import type { ComponentType } from "react";
import type { SafeWrappedStats } from "../data/validate";
import type { CardBox } from "../components/PixelCard";
import { IntroSlide } from "../slides/IntroSlide";
import { SocietyEventsSlide } from "../slides/SocietyEventsSlide";
import { JointEventsSlide } from "../slides/JointEventsSlide";
import { AttendeesSlide } from "../slides/AttendeesSlide";
import { PopularCategorySlide } from "../slides/PopularCategorySlide";
import { ExecGrowthSlide } from "../slides/ExecGrowthSlide";
import { KpopChoreoSlide } from "../slides/KpopChoreoSlide";
import { TransitionSlide } from "../slides/TransitionSlide";
import { MembershipDurationSlide } from "../slides/MembershipDurationSlide";
import { EventCorkboardSlide } from "../slides/EventCorkboardSlide";
import { PrizesWonSlide } from "../slides/PrizesWonSlide";
import { FavoriteTeamSlide } from "../slides/FavoriteTeamSlide";
import { ArchetypeSlide } from "../slides/ArchetypeSlide";
import { PercentileSlide } from "../slides/PercentileSlide";
import { RecapSlide } from "../slides/RecapSlide";
import { ShareSlide } from "../slides/ShareSlide";

export interface SlideProps {
  data: SafeWrappedStats;
  durationMs: number;
}

/** See MASTER.md "Transitions — mixed by section". */
export type TransitionKind = "dissolve" | "crt" | "parallax";

/**
 * A slide component, plus optional warm-up hooks the story runs while the
 * slide before it is still playing, so its own transition never stalls:
 *  - `preload`: images it shows, fetched and decoded ahead (engine/preload).
 *  - `prepare`: any other expensive up-front work, e.g. simulating a physics drop.
 */
export type SlideComponent = ComponentType<SlideProps> & {
  preload?: readonly string[];
  prepare?: (durationMs: number) => void;
};

export interface SlideConfig {
  id: string;
  durationMs: number;
  component: SlideComponent;
  /** How this slide enters, coming from the previous one. Omitted on the very first slide. */
  transitionIn?: TransitionKind;
  /**
   * Elements this slide shares with its neighbours, and where they sit. Each
   * is drawn once by the story (engine/SharedElements) and morphs between
   * consecutive slides' boxes instead of vanishing and reappearing.
   *  - `card`: the stat card; slides put their text on it with <OnCard>.
   *  - `truss`: the spotlight truss rig over the stage scenes.
   */
  shared?: { card?: CardBox; truss?: CardBox };
}

// Card boxes, canvas px, from the Figma frames.
const INTRO_CARD: CardBox = { left: 85, top: 643, width: 909, height: 579 };
const SOCIETY_EVENTS_CARD: CardBox = { left: 107, top: 695, width: 866, height: 541 };
const JOINT_EVENTS_CARD: CardBox = { left: 107, top: 689.5, width: 866, height: 541 };
const EXEC_GROWTH_CARD: CardBox = { left: 58, top: 768, width: 964, height: 364 };

// Spotlight truss: the same rig over the concert stage, then pulled back and
// scaled up over the podium (same aspect ratio, so it's a pure move + scale).
const ATTENDEES_TRUSS: CardBox = { left: -14, top: -32, width: 1107, height: 919 };
const POPULAR_CATEGORY_TRUSS: CardBox = { left: -306, top: -162, width: 1692, height: 1405 };

/** IG Stories caps each segment at 15s; slides may hold shorter. */
export const MAX_SLIDE_DURATION_MS = 15_000;

export function clampSlideDuration(durationMs: number): number {
  return Math.min(MAX_SLIDE_DURATION_MS, Math.max(1000, durationMs));
}

/**
 * The fixed, ordered sequence of real slides shown for every member: a
 * society-wide recap first, a "now let's talk about you" pivot, then this
 * member's personal stats. SignupDateSlide/MostActiveMonthSlide exist but
 * aren't in this default sequence — the current narrative script doesn't
 * call for them, but they're left in `../slides` to drop back in if wanted.
 */
export function buildSlideRegistry(): SlideConfig[] {
  const slides: Array<
    Omit<SlideConfig, "durationMs"> & { durationMs: number }
  > = [
    { id: "intro", durationMs: 4000, component: IntroSlide, shared: { card: INTRO_CARD } },

    // Society-wide recap — crossfade carries every boundary, with the shared
    // stat card morphing between the slides that have one
    // 6500ms (up from 5000ms) — the calendar peel-reveal needs room for its
    // own multi-phase sequence before the count-up + hold.
    {
      id: "society-events",
      durationMs: 6500,
      component: SocietyEventsSlide,
      transitionIn: "dissolve",
      shared: { card: SOCIETY_EVENTS_CARD },
    },
    {
      id: "joint-events",
      durationMs: 5000,
      component: JointEventsSlide,
      transitionIn: "dissolve",
      shared: { card: JOINT_EVENTS_CARD },
    },
    {
      id: "attendees",
      durationMs: 5000,
      component: AttendeesSlide,
      transitionIn: "dissolve",
      shared: { truss: ATTENDEES_TRUSS },
    },
    {
      id: "popular-category",
      durationMs: 6000,
      component: PopularCategorySlide,
      transitionIn: "dissolve",
      shared: { truss: POPULAR_CATEGORY_TRUSS },
    },
    {
      id: "exec-growth",
      durationMs: 5000,
      component: ExecGrowthSlide,
      transitionIn: "dissolve",
      shared: { card: EXEC_GROWTH_CARD },
    },
    {
      id: "kpop-choreos",
      durationMs: 5000,
      component: KpopChoreoSlide,
      transitionIn: "dissolve",
    },

    // The one CRT snap: "recap complete" -> "now let's talk about you"
    {
      id: "transition",
      durationMs: 3000,
      component: TransitionSlide,
      transitionIn: "crt",
    },

    // Personal — two-speed parallax push carries every boundary
    {
      id: "membership-duration",
      durationMs: 6000,
      component: MembershipDurationSlide,
      transitionIn: "parallax",
    },
    {
      id: "event-corkboard",
      durationMs: 6500,
      component: EventCorkboardSlide,
      transitionIn: "parallax",
    },
    {
      id: "favorite-team",
      durationMs: 6000,
      component: FavoriteTeamSlide,
      transitionIn: "parallax",
    },
    {
      id: "percentile",
      durationMs: 5000,
      component: PercentileSlide,
      transitionIn: "parallax",
    },
    {
      id: "archetype",
      durationMs: 7000,
      component: ArchetypeSlide,
      transitionIn: "parallax",
    },
    {
      id: "recap",
      durationMs: 8000,
      component: RecapSlide,
      transitionIn: "parallax",
    },
    {
      id: "share",
      durationMs: 8000,
      component: ShareSlide,
      transitionIn: "parallax",
    },
  ];

  return slides.map((s) => ({
    ...s,
    durationMs: clampSlideDuration(s.durationMs),
  }));
}
