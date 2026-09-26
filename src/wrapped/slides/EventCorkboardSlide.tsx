import { PixelBackground } from "../components/PixelBackground";
import { EventCorkboard } from "../components/EventCorkboard";
import { GlitchText } from "../components/GlitchText";
import type { SlideProps } from "../engine/SlideRegistry";

/**
 * Pinned-photo corkboard of this member's attended events. Falls back to
 * plain text when there's no per-event photo data to pin (upstream hasn't
 * sent `attendedEvents`, or the member has 0 events) — same fallback shape
 * as EventsAttendedSlide.
 */
export function EventCorkboardSlide({ data, durationMs }: SlideProps) {
  const events = data.attendedEvents;

  if (events.length === 0) {
    return (
      <PixelBackground durationMs={durationMs}>
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 64,
            textAlign: "center",
          }}
        >
          <GlitchText durationMs={durationMs} fontSize={38}>
            {data.hasAttendedEvents ? "Your events, pinned up" : "Not yet — next year's your year"}
          </GlitchText>
        </div>
      </PixelBackground>
    );
  }

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <EventCorkboard events={events} durationMs={durationMs} />
    </div>
  );
}
