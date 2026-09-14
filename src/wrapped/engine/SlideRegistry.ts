import type { ComponentType } from "react";
import type { SafeWrappedStats } from "../data/validate";
import { IntroSlide } from "../slides/IntroSlide";
import { SocietyEventsSlide } from "../slides/SocietyEventsSlide";
import { JointEventsSlide } from "../slides/JointEventsSlide";
import { AttendeesSlide } from "../slides/AttendeesSlide";
import { PopularCategorySlide } from "../slides/PopularCategorySlide";
import { ExecGrowthSlide } from "../slides/ExecGrowthSlide";
import { KpopChoreoSlide } from "../slides/KpopChoreoSlide";
import { TransitionSlide } from "../slides/TransitionSlide";
import { EventsAttendedSlide } from "../slides/EventsAttendedSlide";
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

export interface SlideConfig {
  id: string;
  durationMs: number;
  component: ComponentType<SlideProps>;
  /** How this slide enters, coming from the previous one. Omitted on the very first slide. */
  transitionIn?: TransitionKind;
}

/** IG Stories caps each segment at 15s; slides may hold shorter. */
export const MAX_SLIDE_DURATION_MS = 15_000;

export function clampSlideDuration(durationMs: number): number {
  return Math.min(MAX_SLIDE_DURATION_MS, Math.max(1000, durationMs));
}

/**
 * The fixed, ordered sequence of real slides shown for every member: a
 * society-wide recap first, a "now let's talk about you" pivot, then this
 * member's personal stats. SignupDateSlide/MembershipDurationSlide/
 * MostActiveMonthSlide exist but aren't in this default sequence — the
 * current narrative script doesn't call for them, but they're left in
 * `../slides` to drop back in if wanted.
 */
export function buildSlideRegistry(): SlideConfig[] {
  const slides: Array<Omit<SlideConfig, "durationMs"> & { durationMs: number }> = [
    { id: "intro", durationMs: 4000, component: IntroSlide },

    // Society-wide recap — pixel-mosaic dissolve carries every boundary
    // 6500ms (up from 5000ms) — the calendar peel-reveal needs room for its
    // own multi-phase sequence before the count-up + hold.
    { id: "society-events", durationMs: 6500, component: SocietyEventsSlide, transitionIn: "dissolve" },
    { id: "joint-events", durationMs: 5000, component: JointEventsSlide, transitionIn: "dissolve" },
    { id: "attendees", durationMs: 5000, component: AttendeesSlide, transitionIn: "dissolve" },
    { id: "popular-category", durationMs: 6000, component: PopularCategorySlide, transitionIn: "dissolve" },
    { id: "exec-growth", durationMs: 5000, component: ExecGrowthSlide, transitionIn: "dissolve" },
    { id: "kpop-choreos", durationMs: 5000, component: KpopChoreoSlide, transitionIn: "dissolve" },

    // The one CRT snap: "recap complete" -> "now let's talk about you"
    { id: "transition", durationMs: 3000, component: TransitionSlide, transitionIn: "crt" },

    // Personal — two-speed parallax push carries every boundary
    { id: "events-attended", durationMs: 6000, component: EventsAttendedSlide, transitionIn: "parallax" },
    { id: "prizes-won", durationMs: 5000, component: PrizesWonSlide, transitionIn: "parallax" },
    { id: "favorite-team", durationMs: 6000, component: FavoriteTeamSlide, transitionIn: "parallax" },
    { id: "archetype", durationMs: 7000, component: ArchetypeSlide, transitionIn: "parallax" },
    { id: "percentile", durationMs: 5000, component: PercentileSlide, transitionIn: "parallax" },

    { id: "recap", durationMs: 8000, component: RecapSlide, transitionIn: "parallax" },
    { id: "share", durationMs: 8000, component: ShareSlide, transitionIn: "parallax" },
  ];

  return slides.map((s) => ({ ...s, durationMs: clampSlideDuration(s.durationMs) }));
}
