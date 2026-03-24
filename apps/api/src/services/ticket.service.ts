import { getDb } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import QRCode from "qrcode";
import crypto from "crypto";
import { env } from "../config/env";

/** Sign QR payload with HMAC-SHA256 to prevent forgery */
export function signQrPayload(payload: { ticket_id: string; event_id: string }): string {
  const data = `${payload.ticket_id}:${payload.event_id}`;
  return crypto.createHmac("sha256", env.qrSigningSecret).update(data).digest("hex");
}

/** Verify a QR signature */
export function verifyQrSignature(ticketId: string, eventId: string, signature: string): boolean {
  const expected = signQrPayload({ ticket_id: ticketId, event_id: eventId });
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

interface CreateTicketResult {
  success: boolean;
  ticket?: Record<string, unknown>;
  error?: string;
}

/**
 * Create a ticket (with QR code).
 * Admin controls all ticketing config per event: tier types, time slots, pricing.
 * For paid events, status starts as pending_payment (mock: auto-confirmed).
 */
export async function createTicket(
  userId: string,
  eventId: string,
  tierId: string,
  pickupPoint?: string,
  timeSlotId?: string,
  addOns?: Array<{ addon_id: string; name: string; quantity: number; price: number; spot_id?: string; spot_name?: string; spot_seat_id?: string; spot_seat_label?: string }>,
  seatId?: string,
  sectionId?: string,
  spotSeatId?: string,
): Promise<CreateTicketResult> {
  const db = await getDb();
  return db.runTransaction(async (tx) => {
    const eventRef = db.collection("events").doc(eventId);
    const eventDoc = await tx.get(eventRef);

    if (!eventDoc.exists) {
      return { success: false, error: "Event not found" };
    }

    const event = eventDoc.data()!;

    if (event.status === "announced") {
      return { success: false, error: "Event is collecting interest — join the waitlist" };
    }
    if (!["upcoming", "listed", "live"].includes(event.status)) {
      return { success: false, error: "Event is not accepting tickets" };
    }

    const ticketing = event.ticketing || { enabled: false, tiers: [], time_slots_enabled: false, max_per_user: 1 };

    // Check for existing tickets — also expire stale pending_payment tickets (15-min timeout)
    // Use tx.get() so this query is part of the transaction's read set,
    // preventing race conditions where two concurrent purchases both pass this check
    const existingQuery = db
      .collection("tickets")
      .where("user_id", "==", userId)
      .where("event_id", "==", eventId)
      .where("status", "in", ["pending_payment", "confirmed", "partially_checked_in"]);
    const existingSnap = await tx.get(existingQuery);

    const PAYMENT_TIMEOUT_MS = 16 * 60 * 1000; // 16 minutes — aligned with Razorpay payment link expiry
    const HOLD_DURATION_MS = 16 * 60 * 1000; // 16 minutes — aligned with payment link expiry
    let existingCount = 0;
    // Track stale holds to release from seating data
    const staleHolds: Array<{ spot_id?: string; spot_seat_id?: string; seat_id?: string }> = [];
    const staleAddonHolds: Array<{ addon_id: string; spot_id: string; spot_seat_id?: string }> = [];
    for (const doc of existingSnap.docs) {
      const t = doc.data();
      // Auto-expire stale pending_payment tickets
      if (t.status === "pending_payment") {
        const purchasedAt = new Date(t.purchased_at).getTime();
        if (Date.now() - purchasedAt > PAYMENT_TIMEOUT_MS) {
          tx.update(doc.ref, { status: "cancelled", cancelled_reason: "payment_timeout" });
          // Release reserved capacity
          tx.update(eventRef, { spots_held: FieldValue.increment(-(t.quantity || 1)) });
          // Collect seat holds to release
          if (t.spot_id || t.seat_id) {
            staleHolds.push({ spot_id: t.spot_id, spot_seat_id: t.spot_seat_id, seat_id: t.seat_id });
          }
          // Collect addon seat holds to release
          if (t.add_ons) {
            for (const a of t.add_ons) {
              if (a.spot_id) {
                staleAddonHolds.push({ addon_id: a.addon_id, spot_id: a.spot_id, spot_seat_id: a.spot_seat_id });
              }
            }
          }
          continue;
        }
      }
      existingCount += t.quantity || 1;
    }
    if (existingCount >= (ticketing.max_per_user || 1)) {
      return { success: false, error: "You already have the maximum tickets for this event" };
    }

    // Find the requested tier
    const tiers = ticketing.tiers || [];
    const selectedTier = tiers.find((t: { id: string }) => t.id === tierId);

    if (!selectedTier && ticketing.enabled && tiers.length > 0) {
      return { success: false, error: "Invalid ticket tier" };
    }

    // Check tier availability
    if (selectedTier) {
      if (selectedTier.sold >= selectedTier.capacity) {
        return { success: false, error: "This tier is sold out" };
      }
      if (selectedTier.deadline && new Date(selectedTier.deadline) < new Date()) {
        return { success: false, error: "This tier has closed" };
      }
      if (selectedTier.opens_at && new Date(selectedTier.opens_at) > new Date()) {
        return { success: false, error: "This tier is not yet available" };
      }
    }

    // Check time slot availability
    let selectedTimeSlot = null;
    if (ticketing.time_slots_enabled && ticketing.time_slots?.length) {
      if (!timeSlotId) {
        return { success: false, error: "Please select a time slot" };
      }
      selectedTimeSlot = ticketing.time_slots.find((s: { id: string }) => s.id === timeSlotId);
      if (!selectedTimeSlot) {
        return { success: false, error: "Invalid time slot" };
      }
      if (selectedTimeSlot.booked >= selectedTimeSlot.capacity) {
        return { success: false, error: "This time slot is full" };
      }
    }

    // Validate seating selection
    const seating = event.seating;
    let seatingDirty = false; // Track whether seating data was mutated
    let assignedSectionName: string | undefined;
    let assignedSpotName: string | undefined;
    let assignedSpotSeatLabel: string | undefined;

    // Release stale seat holds from in-memory seating data before validation
    if (staleHolds.length > 0 && seating && seating.mode !== "none") {
      for (const release of staleHolds) {
        if (seating.mode === "custom" && release.spot_id && seating.spots) {
          for (const spot of seating.spots) {
            if (spot.id !== release.spot_id) continue;
            if (release.spot_seat_id && spot.seats) {
              for (const seat of spot.seats) {
                if (seat.id === release.spot_seat_id && seat.status === "held") {
                  seat.status = "available";
                  seat.held_by = null as any;
                  seat.held_until = null as any;
                  seatingDirty = true;
                }
              }
            }
          }
        }
        if (release.seat_id && seating.mode !== "custom" && seating.seats) {
          for (const seat of seating.seats) {
            if (seat.id === release.seat_id && seat.status === "held") {
              seat.status = "available";
              seat.held_by = null as any;
              seat.held_until = null as any;
              seatingDirty = true;
            }
          }
        }
      }
    }

    // Release stale addon seat holds
    let addonSeatingDirty = false;
    if (staleAddonHolds.length > 0) {
      const checkoutSteps = event.checkout?.steps || [];
      for (const release of staleAddonHolds) {
        for (const step of checkoutSteps) {
          if (step.type !== "addon_select" || !step.add_ons) continue;
          for (const addonCfg of step.add_ons) {
            if (addonCfg.id !== release.addon_id || !addonCfg.seating?.spots) continue;
            for (const spot of addonCfg.seating.spots) {
              if (spot.id !== release.spot_id) continue;
              if (release.spot_seat_id && spot.seats) {
                for (const seat of spot.seats) {
                  if (seat.id === release.spot_seat_id && seat.status === "held") {
                    seat.status = "available";
                    seat.held_by = null as any;
                    seat.held_until = null as any;
                    addonSeatingDirty = true;
                  }
                }
              }
            }
          }
        }
      }
      // addonSeatingDirty flag set — will be flushed at end if no addon booking overwrites
    }

    if (seating && seating.mode !== "none") {
      // Custom spot validation
      if (seating.mode === "custom" && seatId) {
        const spot = seating.spots?.find((s: { id: string }) => s.id === seatId);
        if (!spot) {
          return { success: false, error: "Invalid spot" };
        }

        // Individual seat selection (tables with seats array)
        if (spot.seats && spot.seats.length > 0) {
          if (!spotSeatId) {
            return { success: false, error: "Please select a specific seat at this table" };
          }
          const spotSeat = spot.seats.find((s: { id: string }) => s.id === spotSeatId);
          if (!spotSeat) {
            return { success: false, error: "Invalid seat selection" };
          }
          if (spotSeat.status !== "available") {
            return { success: false, error: "This seat is already taken" };
          }
          assignedSpotSeatLabel = spotSeat.label;
        } else {
          // Legacy capacity-based booking
          if (spot.booked >= spot.capacity) {
            return { success: false, error: "This spot is full" };
          }
        }

        assignedSpotName = spot.name;
        if (spot.section_id) {
          sectionId = spot.section_id;
        }
      }

      if (sectionId) {
        const section = seating.sections?.find((s: { id: string }) => s.id === sectionId);
        if (!section) {
          return { success: false, error: "Invalid section" };
        }
        if (section.booked >= section.capacity) {
          return { success: false, error: "This section is full" };
        }
        assignedSectionName = section.name;
      }
      if (seatId && seating.mode !== "custom") {
        const seat = seating.seats?.find((s: { id: string }) => s.id === seatId);
        if (!seat) {
          return { success: false, error: "Invalid seat" };
        }
        if (seat.status !== "available") {
          return { success: false, error: "This seat is already taken" };
        }
      }
    }

    // Validate add-on quantity, price, and seating selections
    if (addOns && addOns.length > 0) {
      const checkoutSteps = event.checkout?.steps || [];
      for (const addon of addOns) {
        if (!addon.quantity || addon.quantity < 1) {
          return { success: false, error: `Invalid quantity for add-on ${addon.name}` };
        }
        // Find addon config in checkout steps to validate quantity limits and enforce server price
        let addonConfig: { id?: string; name?: string; price?: number; max_quantity?: number; available?: number; seating?: { enabled?: boolean; spots?: Array<{ id: string; name: string; capacity: number; booked: number; seats?: Array<{ id: string; label: string; status: string }> }> } } | null = null;
        for (const step of checkoutSteps) {
          if (step.type !== "addon_select" || !step.add_ons) continue;
          const found = step.add_ons.find((a: { id: string }) => a.id === addon.addon_id);
          if (found) { addonConfig = found; break; }
        }
        if (!addonConfig) {
          return { success: false, error: `Add-on ${addon.name} not found in event configuration` };
        }
        // Enforce server-side price — never trust client-submitted price
        addon.price = addonConfig.price ?? 0;
        // Validate quantity against max_quantity from config
        if (addonConfig.max_quantity && addon.quantity > addonConfig.max_quantity) {
          return { success: false, error: `Maximum ${addonConfig.max_quantity} allowed for ${addon.name}` };
        }
        if (!addon.spot_id) continue;
        if (!addonConfig?.seating?.enabled) {
          return { success: false, error: `Add-on ${addon.name} does not support seating` };
        }
        const addonSpots = addonConfig.seating.spots || [];
        const spot = addonSpots.find((s) => s.id === addon.spot_id);
        if (!spot) {
          return { success: false, error: `Invalid spot for ${addon.name}` };
        }
        if (spot.seats && spot.seats.length > 0) {
          if (!addon.spot_seat_id) {
            return { success: false, error: `Please select a seat at ${spot.name} for ${addon.name}` };
          }
          const seat = spot.seats.find((s) => s.id === addon.spot_seat_id);
          if (!seat) {
            return { success: false, error: `Invalid seat at ${spot.name}` };
          }
          if (seat.status !== "available") {
            return { success: false, error: `Seat at ${spot.name} is already taken` };
          }
          addon.spot_seat_label = seat.label;
        } else {
          if (spot.booked >= spot.capacity) {
            return { success: false, error: `${spot.name} is full` };
          }
        }
        addon.spot_name = spot.name;
      }
    }

    // Check overall capacity (include held spots from pending payments)
    if ((event.spots_taken + (event.spots_held || 0)) >= event.total_spots) {
      return { success: false, error: "Event is full" };
    }

    // Assign pickup point
    const assignedPickup = pickupPoint || event.pickup_points?.[0]?.name || "TBD";

    // Calculate add-on total
    const addOnTotal = (addOns || []).reduce((sum, a) => sum + a.price * a.quantity, 0);

    // Determine price and status
    const tierPrice = selectedTier?.price || 0;
    const price = tierPrice + addOnTotal;
    const quantity = selectedTier?.per_person || 1;
    const isFree = price === 0 || event.is_free || !ticketing.enabled;
    const status = isFree ? "confirmed" : "pending_payment";

    // Generate ticket ID and signed QR code
    const ticketId = crypto.randomUUID();
    const qrPayload = { ticket_id: ticketId, event_id: eventId };
    const qrSignature = signQrPayload(qrPayload);
    const qrData = JSON.stringify({ ...qrPayload, sig: qrSignature });
    const qrCode = await QRCode.toDataURL(qrData, {
      width: 300,
      margin: 2,
      color: { dark: "#0E0D0B", light: "#FAF6F0" },
    });

    const ticketData = {
      id: ticketId,
      user_id: userId,
      event_id: eventId,
      tier_id: tierId || "free",
      tier_name: selectedTier?.label || selectedTier?.name || "Free",
      price,
      quantity,
      status,
      qr_code: qrCode,
      pickup_point: assignedPickup,
      time_slot: timeSlotId || null,
      add_ons: addOns && addOns.length > 0 ? addOns : null,
      seat_id: seating?.mode === "custom" ? null : (seatId || null),
      section_id: sectionId || null,
      section_name: assignedSectionName || null,
      spot_id: seating?.mode === "custom" ? (seatId || null) : null,
      spot_name: assignedSpotName || null,
      spot_seat_id: spotSeatId || null,
      spot_seat_label: assignedSpotSeatLabel || null,
      purchased_at: new Date().toISOString(),
      checked_in_at: null,
    };

    // Create ticket document
    tx.set(db.collection("tickets").doc(ticketId), ticketData);

    // For paid tickets, reserve capacity via spots_held counter
    if (!isFree) {
      tx.update(eventRef, { spots_held: FieldValue.increment(quantity) });
    }

    // Increment spots_taken if free (confirmed immediately)
    if (isFree) {
      tx.update(eventRef, { spots_taken: FieldValue.increment(quantity) });

      // Update tier sold count
      if (selectedTier) {
        const updatedTiers = tiers.map((t: { id: string; sold: number }) =>
          t.id === tierId ? { ...t, sold: t.sold + quantity } : t,
        );
        tx.update(eventRef, { "ticketing.tiers": updatedTiers });
      }

      // Update time slot booked count
      if (selectedTimeSlot && ticketing.time_slots) {
        const updatedSlots = ticketing.time_slots.map((s: { id: string; booked: number }) =>
          s.id === timeSlotId ? { ...s, booked: s.booked + quantity } : s,
        );
        tx.update(eventRef, { "ticketing.time_slots": updatedSlots });
      }

      // Update seating: mark seat as booked, increment section/spot booked count
      if (seating && seating.mode !== "none") {
        if (seating.mode === "custom" && seatId && seating.spots) {
          const updatedSpots = seating.spots.map((s: { id: string; booked: number; seats?: Array<{ id: string; status: string }> }) => {
            if (s.id !== seatId) return s;
            if (spotSeatId && s.seats) {
              const updatedSeats = s.seats.map((seat) =>
                seat.id === spotSeatId ? { ...seat, status: "booked", held_by: userId } : seat,
              );
              return { ...s, seats: updatedSeats, booked: s.booked + 1 };
            }
            return { ...s, booked: s.booked + 1 };
          });
          tx.update(eventRef, { "seating.spots": updatedSpots });
        }
        if (seatId && seating.mode !== "custom" && seating.seats) {
          const updatedSeats = seating.seats.map((s: { id: string }) =>
            s.id === seatId ? { ...s, status: "booked", held_by: userId } : s,
          );
          tx.update(eventRef, { "seating.seats": updatedSeats });
        }
        if (sectionId && seating.sections) {
          const updatedSections = seating.sections.map((s: { id: string; booked: number }) =>
            s.id === sectionId ? { ...s, booked: s.booked + 1 } : s,
          );
          tx.update(eventRef, { "seating.sections": updatedSections });
        }
      }
    }

    // For paid tickets, immediately hold the seat so others can't grab it
    if (!isFree && seating && seating.mode !== "none") {
      const holdUntil = new Date(Date.now() + HOLD_DURATION_MS).toISOString();

      if (seating.mode === "custom" && seatId && seating.spots) {
        const updatedSpots = seating.spots.map((s: { id: string; booked: number; seats?: Array<{ id: string; status: string }> }) => {
          if (s.id !== seatId) return s;
          if (spotSeatId && s.seats) {
            const updatedSeats = s.seats.map((seat) =>
              seat.id === spotSeatId
                ? { ...seat, status: "held", held_by: userId, held_until: holdUntil }
                : seat,
            );
            return { ...s, seats: updatedSeats };
            // Do NOT increment booked — that happens on confirmPayment
          }
          return s;
        });
        tx.update(eventRef, { "seating.spots": updatedSpots });
        seatingDirty = false; // spots written, stale releases included
      }
      if (seatId && seating.mode !== "custom" && seating.seats) {
        const updatedSeats = seating.seats.map((s: { id: string }) =>
          s.id === seatId
            ? { ...s, status: "held", held_by: userId, held_until: holdUntil }
            : s,
        );
        tx.update(eventRef, { "seating.seats": updatedSeats });
        seatingDirty = false; // seats written, stale releases included
      }
    }

    // If only stale holds were released (no new hold/booking wrote seating), flush the release
    if (seatingDirty && seating) {
      if (seating.mode === "custom" && seating.spots) {
        tx.update(eventRef, { "seating.spots": seating.spots });
      } else if (seating.seats) {
        tx.update(eventRef, { "seating.seats": seating.seats });
      }
    }

    // Book/hold add-on seats
    if (addOns && addOns.some((a) => a.spot_id)) {
      // Use already-mutated steps if stale holds were released, otherwise deep-clone
      const checkoutSteps = addonSeatingDirty
        ? (event.checkout?.steps || [])
        : JSON.parse(JSON.stringify(event.checkout?.steps || []));
      const holdUntilAddon = !isFree ? new Date(Date.now() + HOLD_DURATION_MS).toISOString() : undefined;

      for (const addon of addOns) {
        if (!addon.spot_id) continue;
        for (const step of checkoutSteps) {
          if (step.type !== "addon_select" || !step.add_ons) continue;
          for (const addonCfg of step.add_ons) {
            if (addonCfg.id !== addon.addon_id || !addonCfg.seating?.spots) continue;
            for (const spot of addonCfg.seating.spots) {
              if (spot.id !== addon.spot_id) continue;
              if (addon.spot_seat_id && spot.seats) {
                spot.seats = spot.seats.map((s: { id: string; status: string }) =>
                  s.id === addon.spot_seat_id
                    ? { ...s, status: isFree ? "booked" : "held", held_by: userId, held_until: holdUntilAddon || undefined }
                    : s,
                );
              }
              if (isFree) spot.booked = (spot.booked || 0) + 1;
            }
          }
        }
      }
      tx.update(eventRef, { "checkout.steps": checkoutSteps });
      addonSeatingDirty = false; // written
    }

    // If only stale addon holds were released (no new addon booking wrote steps), flush the release
    if (addonSeatingDirty) {
      tx.update(eventRef, { "checkout.steps": event.checkout?.steps || [] });
    }

    return { success: true, ticket: ticketData };
  });
}

/** Confirm payment for a ticket (mock: called directly; real: called from Razorpay webhook) */
export async function confirmPayment(ticketId: string): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  return db.runTransaction(async (tx) => {
    const ticketRef = db.collection("tickets").doc(ticketId);
    const ticketDoc = await tx.get(ticketRef);

    if (!ticketDoc.exists) {
      return { success: false, error: "Ticket not found" };
    }

    const ticket = ticketDoc.data()!;

    if (ticket.status !== "pending_payment") {
      return { success: false, error: "Ticket is not pending payment" };
    }

    const quantity = ticket.quantity || 1;

    // Read event BEFORE any writes (Firestore requires all reads before writes)
    const eventRef = db.collection("events").doc(ticket.event_id);
    const eventDoc = await tx.get(eventRef);

    // Verify event is still active — don't confirm tickets for cancelled/completed events
    if (eventDoc.exists) {
      const eventStatus = eventDoc.data()!.status;
      if (eventStatus === "cancelled" || eventStatus === "completed") {
        tx.update(ticketRef, { status: "cancelled", cancelled_reason: "event_" + eventStatus });
        tx.update(eventRef, { spots_held: FieldValue.increment(-quantity) });
        return { success: false, error: `Event is ${eventStatus} — ticket cannot be confirmed` };
      }
    }

    // Validate seat is still held by this user (hold may have expired and been taken by someone else)
    if (eventDoc.exists) {
      const event = eventDoc.data()!;
      const seating = event.seating;
      if (seating && seating.mode !== "none") {
        if (seating.mode === "custom" && ticket.spot_id && seating.spots) {
          const spot = seating.spots.find((s: { id: string }) => s.id === ticket.spot_id);
          if (spot && ticket.spot_seat_id && spot.seats) {
            const seat = spot.seats.find((s: { id: string }) => s.id === ticket.spot_seat_id);
            if (!seat || (seat.status !== "held" || seat.held_by !== ticket.user_id)) {
              tx.update(ticketRef, { status: "cancelled", cancelled_reason: "seat_lost" });
              tx.update(eventRef, { spots_held: FieldValue.increment(-quantity) });
              return { success: false, error: "Seat hold expired — ticket cannot be confirmed" };
            }
          }
        }
        if (ticket.seat_id && seating.mode !== "custom" && seating.seats) {
          const seat = seating.seats.find((s: { id: string }) => s.id === ticket.seat_id);
          if (!seat || (seat.status !== "held" || seat.held_by !== ticket.user_id)) {
            tx.update(ticketRef, { status: "cancelled", cancelled_reason: "seat_lost" });
            tx.update(eventRef, { spots_held: FieldValue.increment(-quantity) });
            return { success: false, error: "Seat hold expired — ticket cannot be confirmed" };
          }
        }
      }
    }

    // Now perform all writes
    tx.update(ticketRef, { status: "confirmed", confirmed_at: new Date().toISOString() });
    // Transfer from held to taken
    tx.update(eventRef, {
      spots_taken: FieldValue.increment(quantity),
      spots_held: FieldValue.increment(-quantity),
    });

    if (eventDoc.exists) {
      const event = eventDoc.data()!;
      const tiers = event.ticketing?.tiers || [];
      if (tiers.length > 0) {
        const updatedTiers = tiers.map((t: { id: string; sold: number }) =>
          t.id === ticket.tier_id ? { ...t, sold: t.sold + quantity } : t,
        );
        tx.update(eventRef, { "ticketing.tiers": updatedTiers });
      }

      // Update time slot if applicable
      if (ticket.time_slot && event.ticketing?.time_slots) {
        const updatedSlots = event.ticketing.time_slots.map((s: { id: string; booked: number }) =>
          s.id === ticket.time_slot ? { ...s, booked: s.booked + quantity } : s,
        );
        tx.update(eventRef, { "ticketing.time_slots": updatedSlots });
      }

      // Update seating on payment confirmation
      const seating = event.seating;
      if (seating && seating.mode !== "none") {
        if (seating.mode === "custom" && ticket.spot_id && seating.spots) {
          const updatedSpots = seating.spots.map((s: { id: string; booked: number; seats?: Array<{ id: string; status: string }> }) => {
            if (s.id !== ticket.spot_id) return s;
            if (ticket.spot_seat_id && s.seats) {
              const updatedSeats = s.seats.map((seat) =>
                seat.id === ticket.spot_seat_id
                  ? { ...seat, status: "booked", held_by: ticket.user_id, held_until: null }
                  : seat,
              );
              return { ...s, seats: updatedSeats, booked: s.booked + 1 };
            }
            return { ...s, booked: s.booked + 1 };
          });
          tx.update(eventRef, { "seating.spots": updatedSpots });
        }
        if (ticket.seat_id && seating.mode !== "custom" && seating.seats) {
          const updatedSeats = seating.seats.map((s: { id: string }) =>
            s.id === ticket.seat_id
              ? { ...s, status: "booked", held_by: ticket.user_id, held_until: null }
              : s,
          );
          tx.update(eventRef, { "seating.seats": updatedSeats });
        }
        if (ticket.section_id && seating.sections) {
          const updatedSections = seating.sections.map((s: { id: string; booked: number }) =>
            s.id === ticket.section_id ? { ...s, booked: s.booked + 1 } : s,
          );
          tx.update(eventRef, { "seating.sections": updatedSections });
        }
      }

      // Confirm add-on seat bookings (held -> booked)
      if (ticket.add_ons && ticket.add_ons.some((a: { spot_id?: string }) => a.spot_id)) {
        const checkoutSteps = JSON.parse(JSON.stringify(event.checkout?.steps || []));
        for (const addon of ticket.add_ons) {
          if (!addon.spot_id) continue;
          for (const step of checkoutSteps) {
            if (step.type !== "addon_select" || !step.add_ons) continue;
            for (const addonCfg of step.add_ons) {
              if (addonCfg.id !== addon.addon_id || !addonCfg.seating?.spots) continue;
              for (const spot of addonCfg.seating.spots) {
                if (spot.id !== addon.spot_id) continue;
                if (addon.spot_seat_id && spot.seats) {
                  spot.seats = spot.seats.map((s: { id: string; status: string }) =>
                    s.id === addon.spot_seat_id
                      ? { ...s, status: "booked", held_by: ticket.user_id, held_until: null }
                      : s,
                  );
                }
                spot.booked = (spot.booked || 0) + 1;
              }
            }
          }
        }
        tx.update(eventRef, { "checkout.steps": checkoutSteps });
      }
    }

    return { success: true };
  });
}

/** Attach Razorpay payment link details to a pending ticket */
export async function attachPaymentLink(
  ticketId: string,
  paymentLinkId: string,
  paymentUrl: string,
): Promise<void> {
  const db = await getDb();
  await db.collection("tickets").doc(ticketId).update({
    payment_link_id: paymentLinkId,
    payment_url: paymentUrl,
  });
}

/** Cancel a ticket */
export async function cancelTicket(
  ticketId: string,
  userId: string,
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  return db.runTransaction(async (tx) => {
    const ticketRef = db.collection("tickets").doc(ticketId);
    const ticketDoc = await tx.get(ticketRef);

    if (!ticketDoc.exists) {
      return { success: false, error: "Ticket not found" };
    }

    const ticket = ticketDoc.data()!;

    if (ticket.user_id !== userId) {
      return { success: false, error: "Not your ticket" };
    }

    if (!["pending_payment", "confirmed", "partially_checked_in"].includes(ticket.status)) {
      return { success: false, error: "Cannot cancel this ticket" };
    }

    const wasConfirmed = ticket.status === "confirmed";
    const wasPending = ticket.status === "pending_payment";
    const quantity = ticket.quantity || 1;
    const hasSeating = ticket.spot_id || ticket.seat_id || ticket.section_id;
    const hasAddonSeating = ticket.add_ons?.some((a: { spot_id?: string }) => a.spot_id);

    // Read event BEFORE any writes (Firestore requires all reads before writes)
    // Always read for confirmed (counters) and pending (spots_held + hold release)
    const eventRef = db.collection("events").doc(ticket.event_id);
    let eventDoc = null;
    if (wasConfirmed || wasPending) {
      eventDoc = await tx.get(eventRef);
    }

    // Now perform all writes
    tx.update(ticketRef, { status: "cancelled", cancelled_at: new Date().toISOString() });

    // Decrement spots_held for pending tickets (reserved capacity)
    if (wasPending) {
      tx.update(eventRef, { spots_held: FieldValue.increment(-quantity) });
    }

    // Only decrement if the ticket was already confirmed (counted toward spots)
    if (wasConfirmed) {
      tx.update(eventRef, { spots_taken: FieldValue.increment(-quantity) });

      // Decrement tier.sold, time_slot.booked, and section.booked counters
      if (eventDoc && eventDoc.exists) {
        const event = eventDoc.data()!;

        // Decrement tier sold count
        if (ticket.tier_id && event.ticketing?.tiers?.length) {
          const updatedTiers = event.ticketing.tiers.map((t: { id: string; sold: number }) =>
            t.id === ticket.tier_id ? { ...t, sold: Math.max(0, t.sold - quantity) } : t,
          );
          tx.update(eventRef, { "ticketing.tiers": updatedTiers });
        }

        // Decrement time slot booked count
        if (ticket.time_slot && event.ticketing?.time_slots?.length) {
          const updatedSlots = event.ticketing.time_slots.map((s: { id: string; booked: number }) =>
            s.id === ticket.time_slot ? { ...s, booked: Math.max(0, s.booked - quantity) } : s,
          );
          tx.update(eventRef, { "ticketing.time_slots": updatedSlots });
        }

        // Decrement section booked count
        if (ticket.section_id && event.seating?.sections?.length) {
          const updatedSections = event.seating.sections.map((s: { id: string; booked: number }) =>
            s.id === ticket.section_id ? { ...s, booked: Math.max(0, s.booked - 1) } : s,
          );
          tx.update(eventRef, { "seating.sections": updatedSections });
        }
      }

      // Release custom spot booking
      if (ticket.spot_id && eventDoc && eventDoc.exists) {
        const event = eventDoc.data()!;
        if (event.seating?.mode === "custom" && event.seating.spots) {
          const updatedSpots = event.seating.spots.map((s: { id: string; booked: number; seats?: Array<{ id: string; status: string }> }) => {
            if (s.id !== ticket.spot_id) return s;
            if (ticket.spot_seat_id && s.seats) {
              const updatedSeats = s.seats.map((seat) =>
                seat.id === ticket.spot_seat_id ? { ...seat, status: "available", held_by: null, held_until: null } : seat,
              );
              return { ...s, seats: updatedSeats, booked: Math.max(0, s.booked - 1) };
            }
            return { ...s, booked: Math.max(0, s.booked - 1) };
          });
          tx.update(eventRef, { "seating.spots": updatedSpots });
        }
      }
      if (ticket.seat_id && eventDoc && eventDoc.exists) {
        const event = eventDoc.data()!;
        if (event.seating?.mode !== "custom" && event.seating?.seats) {
          const updatedSeats = event.seating.seats.map((s: { id: string }) =>
            s.id === ticket.seat_id ? { ...s, status: "available", held_by: null, held_until: null } : s,
          );
          tx.update(eventRef, { "seating.seats": updatedSeats });
        }
      }
    }

    // Release seat hold for pending_payment tickets (seat was "held", not "booked")
    if (wasPending && hasSeating && eventDoc && eventDoc.exists) {
      const event = eventDoc.data()!;
      const seating = event.seating;
      if (seating && seating.mode !== "none") {
        if (seating.mode === "custom" && ticket.spot_id && seating.spots) {
          const updatedSpots = seating.spots.map((s: { id: string; booked: number; seats?: Array<{ id: string; status: string }> }) => {
            if (s.id !== ticket.spot_id) return s;
            if (ticket.spot_seat_id && s.seats) {
              const updatedSeats = s.seats.map((seat) =>
                seat.id === ticket.spot_seat_id
                  ? { ...seat, status: "available", held_by: null, held_until: null }
                  : seat,
              );
              return { ...s, seats: updatedSeats };
              // Do NOT decrement booked — it was never incremented for holds
            }
            return s;
          });
          tx.update(eventRef, { "seating.spots": updatedSpots });
        }
        if (ticket.seat_id && seating.mode !== "custom" && seating.seats) {
          const updatedSeats = seating.seats.map((s: { id: string }) =>
            s.id === ticket.seat_id
              ? { ...s, status: "available", held_by: null, held_until: null }
              : s,
          );
          tx.update(eventRef, { "seating.seats": updatedSeats });
        }
      }
    }

    // Release add-on seat holds/bookings
    if (hasAddonSeating && eventDoc && eventDoc.exists) {
      const event = eventDoc.data()!;
      const checkoutSteps = JSON.parse(JSON.stringify(event.checkout?.steps || []));
      for (const addon of ticket.add_ons) {
        if (!addon.spot_id) continue;
        for (const step of checkoutSteps) {
          if (step.type !== "addon_select" || !step.add_ons) continue;
          for (const addonCfg of step.add_ons) {
            if (addonCfg.id !== addon.addon_id || !addonCfg.seating?.spots) continue;
            for (const spot of addonCfg.seating.spots) {
              if (spot.id !== addon.spot_id) continue;
              if (addon.spot_seat_id && spot.seats) {
                spot.seats = spot.seats.map((s: { id: string; status: string }) =>
                  s.id === addon.spot_seat_id
                    ? { ...s, status: "available", held_by: null, held_until: null }
                    : s,
                );
              }
              if (wasConfirmed) spot.booked = Math.max(0, (spot.booked || 0) - 1);
              // For pending: booked was never incremented, just release hold
            }
          }
        }
      }
      tx.update(eventRef, { "checkout.steps": checkoutSteps });
    }

    return { success: true };
  });
}

/** Get all tickets for the current user, hydrated with event info */
export async function getUserTickets(userId: string) {
  const db = await getDb();
  const snap = await db
    .collection("tickets")
    .where("user_id", "==", userId)
    .orderBy("purchased_at", "desc")
    .get();

  if (snap.empty) return [];

  // Collect unique event IDs and batch-read event docs
  const eventIds = [...new Set(snap.docs.map((d) => d.data().event_id as string))];
  const eventDocs = await Promise.all(
    eventIds.map((id) => db.collection("events").doc(id).get()),
  );
  const eventMap = new Map<string, { title: string; emoji: string; date: string }>();
  for (const doc of eventDocs) {
    if (doc.exists) {
      const data = doc.data()!;
      eventMap.set(doc.id, { title: data.title, emoji: data.emoji || "", date: data.date || "" });
    }
  }

  return snap.docs.map((d) => {
    const data = d.data();
    const event = eventMap.get(data.event_id as string);
    return {
      id: d.id,
      ...data,
      event_title: event?.title || "Unknown Event",
      event_emoji: event?.emoji || "",
      event_date: event?.date || "",
    };
  });
}

/** Get a user's active ticket for a specific event */
export async function getUserEventTicket(userId: string, eventId: string) {
  const db = await getDb();
  const snap = await db
    .collection("tickets")
    .where("user_id", "==", userId)
    .where("event_id", "==", eventId)
    .where("status", "in", ["confirmed", "checked_in", "partially_checked_in"])
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/** Check in a ticket (admin action) — transactional to prevent double check-in */
export async function checkInTicket(
  ticketId: string,
  options: {
    event_id?: string;
    signature?: string;
    checked_in_by?: string;
    headcount?: number;
  } = {},
): Promise<{ success: boolean; ticket?: Record<string, unknown>; error?: string; error_code?: string }> {
  const db = await getDb();
  const result = await db.runTransaction(async (tx) => {
    const ticketRef = db.collection("tickets").doc(ticketId);
    const ticketDoc = await tx.get(ticketRef);

    if (!ticketDoc.exists) {
      return { success: false as const, error: "Ticket not found", error_code: "NOT_FOUND" };
    }

    const ticket = ticketDoc.data()!;

    // Event-scoped validation: ensure ticket belongs to the event being scanned for
    if (options.event_id && ticket.event_id !== options.event_id) {
      return {
        success: false as const,
        error: "This ticket is for a different event",
        error_code: "WRONG_EVENT",
        ticket,
      };
    }

    // Verify QR signature if provided
    if (options.signature) {
      const isValid = verifyQrSignature(ticketId, ticket.event_id, options.signature);
      if (!isValid) {
        return { success: false as const, error: "Invalid QR code — possible forgery", error_code: "INVALID_SIGNATURE" };
      }
    }

    if (ticket.status === "checked_in") {
      return {
        success: false as const,
        error: `Already checked in at ${ticket.checked_in_at}`,
        error_code: "ALREADY_CHECKED_IN",
        ticket,
      };
    }

    if (ticket.status === "cancelled") {
      return { success: false as const, error: "This ticket has been cancelled", error_code: "CANCELLED", ticket };
    }

    if (ticket.status === "pending_payment") {
      return { success: false as const, error: "Payment not completed for this ticket", error_code: "PENDING_PAYMENT", ticket };
    }

    if (ticket.status !== "confirmed") {
      return { success: false as const, error: `Cannot check in: ticket status is "${ticket.status}"`, error_code: "INVALID_STATUS" };
    }

    // Multi-quantity: track headcount arriving
    const totalQuantity = ticket.quantity || 1;
    const previousHeadcount = ticket.checked_in_headcount || 0;
    const arrivingHeadcount = options.headcount || totalQuantity;
    const newHeadcount = Math.min(previousHeadcount + arrivingHeadcount, totalQuantity);
    const fullyCheckedIn = newHeadcount >= totalQuantity;

    const checkedInAt = new Date().toISOString();
    const updateData: Record<string, unknown> = {
      checked_in_at: ticket.checked_in_at || checkedInAt,
      checked_in_headcount: newHeadcount,
    };

    if (fullyCheckedIn) {
      updateData.status = "checked_in";
    } else {
      updateData.status = "partially_checked_in";
    }

    // Audit trail
    if (options.checked_in_by) {
      updateData.checked_in_by = options.checked_in_by;
    }

    // Append to check-in log for audit history
    const logEntry = {
      at: checkedInAt,
      by: options.checked_in_by || "unknown",
      headcount: arrivingHeadcount,
    };
    updateData.check_in_log = FieldValue.arrayUnion(logEntry);

    tx.update(ticketRef, updateData);

    return {
      success: true as const,
      ticket,
      checkedInAt,
      headcount: newHeadcount,
      totalQuantity,
      fullyCheckedIn,
    };
  });

  if (!result.success) {
    return result;
  }

  // Fetch user name outside transaction (read-only, not critical)
  const userDoc = await db.collection("users").doc(result.ticket.user_id).get();
  const userName = userDoc.exists ? userDoc.data()!.name : "Unknown";

  return {
    success: true,
    ticket: {
      ...result.ticket,
      status: result.fullyCheckedIn ? "checked_in" : "partially_checked_in",
      checked_in_at: result.checkedInAt,
      checked_in_headcount: result.headcount,
      total_quantity: result.totalQuantity,
      fully_checked_in: result.fullyCheckedIn,
      user_name: userName,
    },
  };
}

/** Get all tickets for an event (admin) */
export async function getEventTickets(eventId: string) {
  const db = await getDb();
  const snap = await db
    .collection("tickets")
    .where("event_id", "==", eventId)
    .orderBy("purchased_at", "desc")
    .get();

  const tickets = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as { id: string; user_id: string; [key: string]: unknown }));

  // Batch hydrate user names (avoids N+1 sequential reads)
  const uniqueUserIds = [...new Set(tickets.map((t) => t.user_id).filter(Boolean))];
  const userMap = new Map<string, { name: string; handle: string }>();

  if (uniqueUserIds.length > 0) {
    const chunks: string[][] = [];
    for (let i = 0; i < uniqueUserIds.length; i += 500) {
      chunks.push(uniqueUserIds.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const refs = chunk.map((uid) => db.collection("users").doc(uid));
      const userDocs = await db.getAll(...refs);
      for (const userDoc of userDocs) {
        if (userDoc.exists) {
          const data = userDoc.data()!;
          userMap.set(userDoc.id, {
            name: (data.name as string) || "Unknown",
            handle: (data.handle as string) || "",
          });
        }
      }
    }
  }

  return tickets.map((ticket) => {
    const user = userMap.get(ticket.user_id);
    return {
      ...ticket,
      user_name: user?.name || "Unknown",
      user_handle: user?.handle || "",
    };
  });
}
