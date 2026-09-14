import type { ArchetypeId } from "./schema";

export const ARCHETYPE_LABEL: Record<ArchetypeId, string> = {
  "ghost-member": "Ghost Member",
  "devs-star": "Devs Star",
  "locked-in": "Locked In",
  competitor: "Competitor",
  "party-animal": "Party Animal",
  "all-rounder": "All-Rounder",
  wildcard: "Wildcard",
};

export const ARCHETYPE_BLURB: Record<ArchetypeId, string> = {
  "ghost-member": "We saw you... once. Maybe twice.",
  "devs-star": "Basically part of the exec team at this point.",
  "locked-in": "Tech + Industry pipeline, fully committed.",
  competitor: "You showed up to win, not to mingle.",
  "party-animal": "Socials > everything else, and we respect it.",
  "all-rounder": "A bit of everything — the balanced diet of DEVS members.",
  wildcard: "Unpredictable. Untameable. Iconic.",
};
