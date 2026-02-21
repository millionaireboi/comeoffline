import { getDb } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import QRCode from "qrcode";
import crypto from "crypto";

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
  addOns?: Array<{ addon_id: string; name: string; quantity: number; price: number }>,
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

    if (!["upcoming", "live"].includes(event.status)) {
      return { success: false, error: "Event is not accepting tickets" };
    }

    const ticketing = event.ticketing || { enabled: false, tiers: [], time_slots_enabled: false, max_per_user: 1 };

    // Check for existing tickets — also expire stale pending_payment tickets (15-min timeout)
    const existingSnap = await db
      .collection("tickets")
      .where("user_id", "==", userId)
      .where("event_id", "==", eventId)
      .where("status", "in", ["pending_payment", "confirmed"])
      .get();

    const PAYMENT_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
    let existingCount = 0;
    for (const doc of existingSnap.docs) {
      const t = doc.data();
      // Auto-expire stale pending_payment tickets
      if (t.status === "pending_payment") {
        const purchasedAt = new Date(t.purchased_at).getTime();
        if (Date.now() - purchasedAt > PAYMENT_TIMEOUT_MS) {
          tx.update(doc.ref, { status: "cancelled", cancelled_reason: "payment_timeout" });
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
    let assignedSectionName: string | undefined;
    let assignedSpotName: string | undefined;
    let assignedSpotSeatLabel: string | undefined;
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

    // Check overall capacity
    if (event.spots_taken >= event.total_spots) {
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

    // Generate ticket ID and QR code
    const ticketId = crypto.randomUUID();
    const qrData = JSON.stringify({ ticket_id: ticketId, event_id: eventId });
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
              // Mark individual seat as booked
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

    // Update ticket status
    tx.update(ticketRef, { status: "confirmed", confirmed_at: new Date().toISOString() });

    // Increment spots_taken
    const eventRef = db.collection("events").doc(ticket.event_id);
    tx.update(eventRef, { spots_taken: FieldValue.increment(quantity) });

    // Update tier sold count
    const eventDoc = await tx.get(eventRef);
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
                seat.id === ticket.spot_seat_id ? { ...seat, status: "booked", held_by: ticket.user_id } : seat,
              );
              return { ...s, seats: updatedSeats, booked: s.booked + 1 };
            }
            return { ...s, booked: s.booked + 1 };
          });
          tx.update(eventRef, { "seating.spots": updatedSpots });
        }
        if (ticket.seat_id && seating.mode !== "custom" && seating.seats) {
          const updatedSeats = seating.seats.map((s: { id: string }) =>
            s.id === ticket.seat_id ? { ...s, status: "booked", held_by: ticket.user_id } : s,
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
    }

    return { success: true };
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

    if (!["pending_payment", "confirmed"].includes(ticket.status)) {
      return { success: false, error: "Cannot cancel this ticket" };
    }

    const wasConfirmed = ticket.status === "confirmed";
    const quantity = ticket.quantity || 1;

    tx.update(ticketRef, { status: "cancelled", cancelled_at: new Date().toISOString() });

    // Only decrement if the ticket was already confirmed (counted toward spots)
    if (wasConfirmed) {
      const eventRef = db.collection("events").doc(ticket.event_id);
      tx.update(eventRef, { spots_taken: FieldValue.increment(-quantity) });

      // Release custom spot booking
      if (ticket.spot_id) {
        const eventDoc = await tx.get(eventRef);
        if (eventDoc.exists) {
          const event = eventDoc.data()!;
          if (event.seating?.mode === "custom" && event.seating.spots) {
            const updatedSpots = event.seating.spots.map((s: { id: string; booked: number; seats?: Array<{ id: string; status: string }> }) => {
              if (s.id !== ticket.spot_id) return s;
              if (ticket.spot_seat_id && s.seats) {
                const updatedSeats = s.seats.map((seat) =>
                  seat.id === ticket.spot_seat_id ? { ...seat, status: "available", held_by: undefined } : seat,
                );
                return { ...s, seats: updatedSeats, booked: Math.max(0, s.booked - 1) };
              }
              return { ...s, booked: Math.max(0, s.booked - 1) };
            });
            tx.update(eventRef, { "seating.spots": updatedSpots });
          }
        }
      }
    }

    return { success: true };
  });
}

/** Get all tickets for the current user */
export async function getUserTickets(userId: string) {
  const db = await getDb();
  const snap = await db
    .collection("tickets")
    .where("user_id", "==", userId)
    .orderBy("purchased_at", "desc")
    .get();

  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Get a user's active ticket for a specific event */
export async function getUserEventTicket(userId: string, eventId: string) {
  const db = await getDb();
  const snap = await db
    .collection("tickets")
    .where("user_id", "==", userId)
    .where("event_id", "==", eventId)
    .where("status", "in", ["confirmed", "checked_in"])
    .limit(1)
    .get();

  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}

/** Check in a ticket (admin action) */
export async function checkInTicket(
  ticketId: string,
): Promise<{ success: boolean; ticket?: Record<string, unknown>; error?: string }> {
  const db = await getDb();
  const ticketRef = db.collection("tickets").doc(ticketId);
  const ticketDoc = await ticketRef.get();

  if (!ticketDoc.exists) {
    return { success: false, error: "Ticket not found" };
  }

  const ticket = ticketDoc.data()!;

  if (ticket.status === "checked_in") {
    return { success: false, error: "Already checked in", ticket };
  }

  if (ticket.status !== "confirmed") {
    return { success: false, error: `Cannot check in: ticket is ${ticket.status}` };
  }

  await ticketRef.update({
    status: "checked_in",
    checked_in_at: new Date().toISOString(),
  });

  // Fetch user name for the check-in confirmation
  const userDoc = await db.collection("users").doc(ticket.user_id).get();
  const userName = userDoc.exists ? userDoc.data()!.name : "Unknown";

  return {
    success: true,
    ticket: {
      ...ticket,
      status: "checked_in",
      checked_in_at: new Date().toISOString(),
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

  // Hydrate with user names
  const tickets = [];
  for (const doc of snap.docs) {
    const data = doc.data();
    const ticket = { id: doc.id, ...data };
    const userDoc = await db.collection("users").doc(data.user_id as string).get();
    tickets.push({
      ...ticket,
      user_name: userDoc.exists ? userDoc.data()!.name : "Unknown",
      user_handle: userDoc.exists ? userDoc.data()!.handle : "",
    });
  }

  return tickets;
}
