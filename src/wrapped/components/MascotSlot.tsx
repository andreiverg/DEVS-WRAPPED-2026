import { forwardRef } from "react";
import type { ArchetypeId } from "../data/schema";

/** Placeholder asset paths — swap for the real sprites when provided. */
const MASCOT_PLACEHOLDER_SRC: Record<ArchetypeId, string> = {
  "ghost-member": "/mascots/ghost-member.png",
  "devs-star": "/mascots/devs-star.png",
  "locked-in": "/mascots/locked-in.png",
  competitor: "/mascots/competitor.png",
  "party-animal": "/mascots/party-animal.png",
  "all-rounder": "/mascots/all-rounder.png",
  wildcard: "/mascots/wildcard.png",
};

interface MascotSlotProps {
  archetype: ArchetypeId;
  size?: number;
}

export const MascotSlot = forwardRef<HTMLDivElement, MascotSlotProps>(function MascotSlot(
  { archetype, size = 420 },
  ref,
) {
  return (
    <div ref={ref} style={{ width: size, height: size, border: "1px solid #000000" }}>
      <img
        src={MASCOT_PLACEHOLDER_SRC[archetype]}
        alt={`${archetype} mascot`}
        width={size}
        height={size}
        style={{ display: "block" }}
        onError={(e) => {
          e.currentTarget.style.opacity = "0";
        }}
      />
    </div>
  );
});
