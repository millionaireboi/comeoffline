import type { Event } from "@comeoffline/types";
import { SpotsBar } from "@/components/ui/SpotsBar";
import { GhostWatermark } from "./GhostWatermark";
import { ZonesSection } from "./ZonesSection";
import { IncludesSection } from "./IncludesSection";
import { DressCodeCard } from "./DressCodeCard";
import { VenueSection } from "./VenueSection";
import { PickupSection } from "./PickupSection";
import { ScheduleSection } from "./ScheduleSection";
import { OrganizerMessage } from "./OrganizerMessage";

interface OverviewTabProps {
  event: Event;
}

export function OverviewTab({ event }: OverviewTabProps) {
  const spotsLeft = event.total_spots - event.spots_taken;
  const isTicketed = event.ticketing?.enabled && !event.is_free;

  return (
    <div className="relative">
      {/* Ghost watermark */}
      <GhostWatermark
        text="offline"
        className="-top-[30px] -left-2.5 text-[200px] max-w-full overflow-hidden tracking-tighter"
      />

      {/* Description */}
      <p className="relative mb-7 font-sans text-[15px] leading-[1.75] text-warm-brown">
        {event.description}
      </p>

      {/* Zones — dark full-bleed section */}
      <ZonesSection
        zones={event.zones}
        accent={event.accent || "#D4A574"}
        accentDark={event.accent_dark || "#B8845A"}
      />

      {/* What's included */}
      <IncludesSection
        includes={event.includes}
        accent={event.accent || "#D4A574"}
        accentDark={event.accent_dark || "#B8845A"}
      />

      {/* Dress code */}
      <DressCodeCard
        dressCode={event.dress_code}
        accent={event.accent || "#D4A574"}
        accentDark={event.accent_dark || "#B8845A"}
      />

      {/* Venue */}
      <VenueSection
        venueName={event.venue_name}
        venueArea={event.venue_area}
        venueAddress={event.venue_address}
        venueRevealDate={event.venue_reveal_date}
        accent={event.accent || "#D4A574"}
        accentDark={event.accent_dark || "#B8845A"}
      />

      {/* Pickup points */}
      <PickupSection
        pickupPoints={event.pickup_points}
        accent={event.accent || "#D4A574"}
        accentDark={event.accent_dark || "#B8845A"}
      />

      {/* Refund policy */}
      {isTicketed && event.ticketing?.refund_policy && (
        <div className="mb-5 rounded-xl bg-sand/30 px-4 py-3 text-center">
          <p className="font-mono text-[10px] text-muted">
            📋 {event.ticketing.refund_policy}
          </p>
        </div>
      )}

      {/* Spots bar */}
      <div className="mb-2">
        <SpotsBar
          spotsLeft={spotsLeft}
          totalSpots={event.total_spots}
          accent={event.accent_dark || "#B8845A"}
        />
      </div>

      {/* Schedule sections (pre-booking teaser) */}
      {event.post_booking?.sections && (
        <div className="mt-5">
          <ScheduleSection
            sections={event.post_booking.sections}
            accent={event.accent || "#D4A574"}
            accentDark={event.accent_dark || "#B8845A"}
          />
        </div>
      )}

      {/* Organizer message */}
      {event.post_booking?.custom_message && (
        <OrganizerMessage
          message={event.post_booking.custom_message}
          accent={event.accent || "#D4A574"}
        />
      )}
    </div>
  );
}
