/**
 * Input contract for the Wrapped carousel.
 */

/** The four event categories events are tagged with at DEVS. */
export type EventCategory = "tech" | "industry" | "competitions" | "social";

/**
 * A member's DEVS archetype. NOT part of the input contract — derived
 * client-side in validate.ts from eventsByCategory, eventsAttended, and
 * attendancePercentile, so it's exported from here as shared domain
 * vocabulary rather than as a WrappedStats field.
 */
export type ArchetypeId =
  | "ghost-member"
  | "devs-star"
  | "locked-in"
  | "competitor"
  | "party-animal"
  | "all-rounder"
  | "wildcard";

export interface WrappedStats {
  /** Stable id for the member, used as part of the video cache key. */
  userId: string;

  /** Display name shown on Intro/Recap/Share slides. */
  displayName: string;

  /** Society/club name, shown on Intro/Share slides. */
  societyName: string;

  /** Academic year this recap covers, e.g. "2025/26". */
  yearLabel: string;

  // --- Personal stats ---

  /** Total events attended this year. Can be 0 (brand-new or inactive member). */
  eventsAttended: number;

  /** ISO 8601 date string, e.g. "2025-09-14". */
  signupDate: string;

  /**
   * Membership length in whole days as of generation time, pre-computed
   * upstream so the frontend never does date math. Can be 0 for a
   * same-day signup.
   */
  membershipDurationDays: number;

  /**
   * Calendar month name with the most events attended, e.g. "March".
   * Null when there is no event history to derive this from (0 events).
   */
  mostActiveMonth: string | null;

  /** Prizes won across competitions/events this year. Can be 0. */
  prizesWon: number;

  /**
   * This member's attended-event count per category — the basis for their
   * favourite team and DEVS archetype (see validate.ts).
   */
  eventsByCategory: Record<EventCategory, number>;

  /**
   * This member's attendance rank as a percentile, 1-100, where lower is
   * more elite (e.g. 10 means "top 10% of attendees").
   */
  attendancePercentile: number;

  // --- Society-wide stats (same value for every member this year) ---

  /** Total events the society held this year. */
  societyEventsHeld: number;

  /** Of those, how many were joint events with other societies. */
  jointEventsHeld: number;

  /** Sum of attendee counts across every event this year (not unique members). */
  totalAttendeesAcrossEvents: number;

  /** The category with the most total attendance this year. */
  mostPopularCategory: EventCategory;

  /** Number of exec team members this year. */
  execCount: number;

  /** Number of distinct K-pop dance choreographies taught this year. */
  kpopChoreosTaught: number;
}
