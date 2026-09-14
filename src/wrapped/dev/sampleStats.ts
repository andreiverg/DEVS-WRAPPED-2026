import type { WrappedStats } from "../data/schema";

/** Dev-only sample payload for previewing the real slide sequence. */
export const SAMPLE_STATS: WrappedStats = {
  userId: "u_123",
  displayName: "Tyler",
  societyName: "DEVS",
  yearLabel: "2025/26",

  eventsAttended: 14,
  signupDate: "2025-09-20",
  membershipDurationDays: 359,
  mostActiveMonth: "March",
  prizesWon: 2,
  eventsByCategory: { tech: 3, industry: 7, competitions: 2, social: 2 },
  attendancePercentile: 8,

  societyEventsHeld: 42,
  jointEventsHeld: 18,
  totalAttendeesAcrossEvents: 3120,
  mostPopularCategory: "industry",
  execCount: 24,
  kpopChoreosTaught: 5,
};

/** Edge-case sample: 0 events, brand-new member, no prizes, bottom-half attendance. */
export const SAMPLE_STATS_NEW_MEMBER: WrappedStats = {
  userId: "u_456",
  displayName: "Alex",
  societyName: "DEVS",
  yearLabel: "2025/26",

  eventsAttended: 0,
  signupDate: "2026-09-01",
  membershipDurationDays: 13,
  mostActiveMonth: null,
  prizesWon: 0,
  eventsByCategory: { tech: 0, industry: 0, competitions: 0, social: 0 },
  attendancePercentile: 87,

  societyEventsHeld: 42,
  jointEventsHeld: 18,
  totalAttendeesAcrossEvents: 3120,
  mostPopularCategory: "industry",
  execCount: 24,
  kpopChoreosTaught: 5,
};

/** Edge-case sample: even spread across all four categories (All-Rounder archetype). */
export const SAMPLE_STATS_ALL_ROUNDER: WrappedStats = {
  ...SAMPLE_STATS,
  userId: "u_789",
  displayName: "Sam",
  eventsAttended: 12,
  eventsByCategory: { tech: 3, industry: 3, competitions: 3, social: 3 },
  attendancePercentile: 45,
};
