import { UpgradeDesk, type DeskTier } from "../components/UpgradeDesk";
import type { SlideProps } from "../engine/SlideRegistry";

const MEMBERSHIP_TIERS: DeskTier[] = [
  { threshold: 0, label: "Fresh Signup" },
  { threshold: 30, label: "Settling In" },
  { threshold: 90, label: "Regular" },
  { threshold: 180, label: "Veteran" },
  { threshold: 365, label: "OG Member" },
];

export function MembershipDurationSlide({ data, durationMs }: SlideProps) {
  const days = data.membershipDurationDays;
  const displayValue = data.isNewMember ? days : Math.max(1, Math.floor(days / 30));
  const displayUnit = data.isNewMember ? (displayValue === 1 ? "day" : "days") : displayValue === 1 ? "month" : "months";

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <UpgradeDesk
        membershipDuration={days}
        tiers={MEMBERSHIP_TIERS}
        durationMs={durationMs}
        displayValue={displayValue}
        displayUnit={displayUnit}
      />
    </div>
  );
}
