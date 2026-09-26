import type { WrappedStats } from "../data/schema";

/** Dev-only sample payload for previewing the real slide sequence. */
export const SAMPLE_STATS: WrappedStats = {
  userId: "u_123",
  displayName: "Tyler",
  societyName: "DEVS",
  yearLabel: "2026",

  eventsAttended: 14,
  signupDate: "2025-09-20",
  membershipDurationDays: 359,
  mostActiveMonth: "March",
  prizesWon: 2,
  eventsByCategory: { tech: 3, industry: 7, competitions: 2, social: 2 },
  attendancePercentile: 8,
  attendedEvents: [
    { photoUrl: "https://picsum.photos/seed/devs-01/400/300", name: "Founders Demo Night", date: "09.28" },
    { photoUrl: "https://picsum.photos/seed/devs-02/400/300", name: "Rooftop Mixer", date: "10.14" },
    { photoUrl: "https://picsum.photos/seed/devs-03/400/300", name: "Hack the Night", date: "11.02" },
    { photoUrl: "https://picsum.photos/seed/devs-04/400/300", name: "Career Fair Prep", date: "11.19" },
    { photoUrl: "https://picsum.photos/seed/devs-05/400/300", name: "Alumni Panel", date: "12.03" },
    { photoUrl: "https://picsum.photos/seed/devs-06/400/300", name: "Winter Social", date: "12.15" },
    { photoUrl: "https://picsum.photos/seed/devs-07/400/300", name: "Case Comp Finals", date: "01.22" },
    { photoUrl: "https://picsum.photos/seed/devs-08/400/300", name: "Spring Kickoff", date: "02.05" },
    { photoUrl: "https://picsum.photos/seed/devs-09/400/300", name: "K-pop Workshop", date: "02.20" },
    { photoUrl: "https://picsum.photos/seed/devs-10/400/300", name: "Industry Night", date: "03.08" },
    { photoUrl: "https://picsum.photos/seed/devs-11/400/300", name: "Games Tournament", date: "03.21" },
    { photoUrl: "https://picsum.photos/seed/devs-12/400/300", name: "Exec Panel", date: "04.02" },
    { photoUrl: "https://picsum.photos/seed/devs-13/400/300", name: "Hackathon Finals", date: "04.18" },
    { photoUrl: "https://picsum.photos/seed/devs-14/400/300", name: "Year-End Bash", date: "05.09" },
  ],

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
  yearLabel: "2026",

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
