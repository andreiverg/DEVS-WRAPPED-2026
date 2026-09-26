import type { ArchetypeId, EventCategory, WrappedStats } from "./schema";

const EVENT_CATEGORIES: readonly EventCategory[] = ["tech", "industry", "competitions", "social"];

/** Fallback category when the input is missing or unrecognized. */
const DEFAULT_CATEGORY: EventCategory = "social";

/** Fully-defaulted stats shape every slide can render without null checks. */
export interface SafeWrappedStats {
  userId: string;
  displayName: string;
  societyName: string;
  yearLabel: string;

  eventsAttended: number;
  signupDate: string;
  membershipDurationDays: number;
  mostActiveMonth: string | null;
  isNewMember: boolean;
  hasAttendedEvents: boolean;
  attendedEvents: Array<{ photoUrl: string; name: string; date: string }>;

  prizesWon: number;
  eventsByCategory: Record<EventCategory, number>;
  favoriteCategory: EventCategory;
  attendancePercentile: number;
  archetype: ArchetypeId;

  societyEventsHeld: number;
  jointEventsHeld: number;
  totalAttendeesAcrossEvents: number;
  mostPopularCategory: EventCategory;
  execCount: number;
  kpopChoreosTaught: number;
}

function isKnownCategory(value: unknown): value is EventCategory {
  return typeof value === "string" && (EVENT_CATEGORIES as readonly string[]).includes(value);
}

function safeNonNegativeInt(value: unknown, fallback = 0): number {
  return Number.isFinite(value) ? Math.max(0, Math.trunc(value as number)) : fallback;
}

function safeEventsByCategory(
  raw: Partial<Record<EventCategory, number>> | undefined,
): Record<EventCategory, number> {
  const result = {} as Record<EventCategory, number>;
  for (const category of EVENT_CATEGORIES) {
    result[category] = safeNonNegativeInt(raw?.[category]);
  }
  return result;
}

function safeAttendedEvents(
  raw: WrappedStats["attendedEvents"],
): Array<{ photoUrl: string; name: string; date: string }> {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (e): e is { photoUrl: string; name: string; date: string } =>
      !!e && typeof e.photoUrl === "string" && e.photoUrl.length > 0,
  );
}

function computeFavoriteCategory(eventsByCategory: Record<EventCategory, number>): EventCategory {
  return EVENT_CATEGORIES.reduce((best, category) =>
    eventsByCategory[category] > eventsByCategory[best] ? category : best,
  );
}

/**
 * Archetype precedence (per product decision): the two "extreme" archetypes
 * — Ghost Member (barely showed up) and Devs Star (top-10% attendee) — are
 * checked first and override any category read. Only once neither applies
 * do we fall back to which category this member's attendance actually
 * skews toward.
 */
function computeArchetype(
  eventsAttended: number,
  eventsByCategory: Record<EventCategory, number>,
  attendancePercentile: number,
): ArchetypeId {
  if (eventsAttended < 2) return "ghost-member";
  if (attendancePercentile <= 10) return "devs-star";

  const total = EVENT_CATEGORIES.reduce((sum, category) => sum + eventsByCategory[category], 0);
  if (total === 0) return "wildcard";

  const favorite = computeFavoriteCategory(eventsByCategory);
  const favoriteShare = eventsByCategory[favorite] / total;
  const techIndustryShare = (eventsByCategory.tech + eventsByCategory.industry) / total;

  if (favoriteShare < 0.35) return "all-rounder";
  if (techIndustryShare >= 0.5) return "locked-in";
  if (favorite === "social") return "party-animal";
  if (favorite === "competitions") return "competitor";
  return "wildcard";
}

/**
 * Normalizes a raw (possibly incomplete) stats payload into a shape every
 * slide can render directly, with no NaN/undefined/null branches left for
 * slide components to handle themselves.
 */
export function validateWrappedStats(raw: Partial<WrappedStats>): SafeWrappedStats {
  const eventsAttended = safeNonNegativeInt(raw.eventsAttended);
  const membershipDurationDays = safeNonNegativeInt(raw.membershipDurationDays);
  const eventsByCategory = safeEventsByCategory(raw.eventsByCategory);
  const favoriteCategory = computeFavoriteCategory(eventsByCategory);

  const attendancePercentile = Number.isFinite(raw.attendancePercentile)
    ? Math.min(100, Math.max(1, Math.trunc(raw.attendancePercentile as number)))
    : 100;

  return {
    userId: raw.userId ?? "",
    displayName: raw.displayName?.trim() || "Member",
    societyName: raw.societyName?.trim() || "Your Society",
    yearLabel: raw.yearLabel?.trim() || "This Year",

    eventsAttended,
    signupDate: raw.signupDate ?? "",
    membershipDurationDays,
    // No events attended means no basis for a "most active month".
    mostActiveMonth: eventsAttended > 0 ? (raw.mostActiveMonth ?? null) : null,
    isNewMember: membershipDurationDays < 30,
    hasAttendedEvents: eventsAttended > 0,
    attendedEvents: safeAttendedEvents(raw.attendedEvents),

    prizesWon: safeNonNegativeInt(raw.prizesWon),
    eventsByCategory,
    favoriteCategory,
    attendancePercentile,
    archetype: computeArchetype(eventsAttended, eventsByCategory, attendancePercentile),

    societyEventsHeld: safeNonNegativeInt(raw.societyEventsHeld),
    jointEventsHeld: safeNonNegativeInt(raw.jointEventsHeld),
    totalAttendeesAcrossEvents: safeNonNegativeInt(raw.totalAttendeesAcrossEvents),
    mostPopularCategory: isKnownCategory(raw.mostPopularCategory) ? raw.mostPopularCategory : DEFAULT_CATEGORY,
    execCount: safeNonNegativeInt(raw.execCount),
    kpopChoreosTaught: safeNonNegativeInt(raw.kpopChoreosTaught),
  };
}
