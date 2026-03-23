import { getDb } from "../config/firebase-admin";
import { FieldValue } from "firebase-admin/firestore";

interface BookingsFilters {
  event_id?: string;
  status?: string;
  search?: string;
  from_date?: string;
  to_date?: string;
  sort_by?: "date" | "price" | "status";
  sort_dir?: "asc" | "desc";
  page?: number;
  limit?: number;
}

interface TicketWithUser {
  id: string;
  user_id: string;
  event_id: string;
  tier_id: string;
  tier_name: string;
  price: number;
  quantity: number;
  status: string;
  qr_code: string;
  pickup_point: string;
  time_slot?: string;
  add_ons?: Array<{ addon_id: string; name: string; quantity: number; price: number }>;
  seat_id?: string;
  section_id?: string;
  section_name?: string;
  spot_id?: string;
  spot_name?: string;
  spot_seat_id?: string;
  spot_seat_label?: string;
  purchased_at: string;
  checked_in_at?: string;
  cancelled_at?: string;
  confirmed_at?: string;
  user_name?: string;
  user_handle?: string;
  event_title?: string;
  event_emoji?: string;
  event_date?: string;
}

/** Get filtered, paginated tickets with user and event info */
export async function getFilteredTickets(filters: BookingsFilters) {
  const db = await getDb();

  const {
    event_id,
    status,
    search,
    from_date,
    to_date,
    sort_by = "date",
    sort_dir = "desc",
    page = 1,
    limit = 50,
  } = filters;

  // Build Firestore query
  let query: FirebaseFirestore.Query = db.collection("tickets");

  if (event_id) {
    query = query.where("event_id", "==", event_id);
  }

  if (status && status !== "all") {
    query = query.where("status", "==", status);
  }

  if (from_date) {
    query = query.where("purchased_at", ">=", from_date);
  }

  if (to_date) {
    // Add end-of-day to include the full day
    const endDate = to_date.includes("T") ? to_date : `${to_date}T23:59:59.999Z`;
    query = query.where("purchased_at", "<=", endDate);
  }

  // Sort
  const sortField = sort_by === "price" ? "price" : "purchased_at";
  query = query.orderBy(sortField, sort_dir);

  // Fetch all matching tickets (for total count and server-side search)
  const snap = await query.get();
  let tickets: TicketWithUser[] = snap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  })) as TicketWithUser[];

  // Batch hydrate user names
  const uniqueUserIds = [...new Set(tickets.map((t) => t.user_id))];
  const userMap = new Map<string, { name: string; handle: string }>();
  if (uniqueUserIds.length > 0) {
    // Firestore getAll supports up to 500 refs per call
    const chunks = [];
    for (let i = 0; i < uniqueUserIds.length; i += 500) {
      chunks.push(uniqueUserIds.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const refs = chunk.map((uid) => db.collection("users").doc(uid));
      const userDocs = await db.getAll(...refs);
      for (const userDoc of userDocs) {
        if (userDoc.exists) {
          const data = userDoc.data()!;
          userMap.set(userDoc.id, { name: data.name || "Unknown", handle: data.handle || "" });
        }
      }
    }
  }

  // Batch hydrate event info
  const uniqueEventIds = [...new Set(tickets.map((t) => t.event_id))];
  const eventMap = new Map<string, { title: string; emoji: string; date: string }>();
  if (uniqueEventIds.length > 0) {
    const chunks = [];
    for (let i = 0; i < uniqueEventIds.length; i += 500) {
      chunks.push(uniqueEventIds.slice(i, i + 500));
    }
    for (const chunk of chunks) {
      const refs = chunk.map((eid) => db.collection("events").doc(eid));
      const eventDocs = await db.getAll(...refs);
      for (const eventDoc of eventDocs) {
        if (eventDoc.exists) {
          const data = eventDoc.data()!;
          eventMap.set(eventDoc.id, {
            title: data.title || "Unknown Event",
            emoji: data.emoji || "",
            date: data.date || "",
          });
        }
      }
    }
  }

  // Hydrate tickets
  tickets = tickets.map((t) => {
    const user = userMap.get(t.user_id);
    const event = eventMap.get(t.event_id);
    return {
      ...t,
      user_name: user?.name || "Unknown",
      user_handle: user?.handle || "",
      event_title: event?.title || "Unknown Event",
      event_emoji: event?.emoji || "",
      event_date: event?.date || "",
    };
  });

  // Server-side search filtering (after hydration since we search by user name/handle)
  if (search) {
    const q = search.toLowerCase();
    tickets = tickets.filter(
      (t) =>
        (t.user_name && t.user_name.toLowerCase().includes(q)) ||
        (t.user_handle && t.user_handle.toLowerCase().includes(q)),
    );
  }

  const total = tickets.length;
  const total_pages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const paginatedTickets = tickets.slice(offset, offset + limit);

  return {
    tickets: paginatedTickets,
    total,
    page,
    total_pages,
  };
}

/** Get revenue and booking stats */
export async function getBookingsStats(eventId?: string) {
  const db = await getDb();

  // Fetch all confirmed/checked_in tickets
  let query: FirebaseFirestore.Query = db
    .collection("tickets")
    .where("status", "in", ["confirmed", "checked_in"]);

  if (eventId) {
    query = query.where("event_id", "==", eventId);
  }

  const snap = await query.select("price", "event_id", "tier_name", "add_ons", "purchased_at").get();

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  let total_revenue = 0;
  let today_revenue = 0;
  let addon_revenue = 0;

  // Per-event aggregation
  const eventStats = new Map<string, { revenue: number; count: number; tiers: Map<string, { revenue: number; count: number }> }>();

  for (const doc of snap.docs) {
    const data = doc.data();
    const price = data.price || 0;
    total_revenue += price;

    // Today's revenue
    if (data.purchased_at && data.purchased_at.startsWith(today)) {
      today_revenue += price;
    }

    // Add-on revenue
    if (data.add_ons && Array.isArray(data.add_ons)) {
      for (const addon of data.add_ons) {
        addon_revenue += (addon.price || 0) * (addon.quantity || 1);
      }
    }

    // Per-event stats
    const eid = data.event_id;
    if (!eventStats.has(eid)) {
      eventStats.set(eid, { revenue: 0, count: 0, tiers: new Map() });
    }
    const es = eventStats.get(eid)!;
    es.revenue += price;
    es.count += 1;

    // Per-tier within event
    const tierName = data.tier_name || "Free";
    if (!es.tiers.has(tierName)) {
      es.tiers.set(tierName, { revenue: 0, count: 0 });
    }
    const ts = es.tiers.get(tierName)!;
    ts.revenue += price;
    ts.count += 1;
  }

  // Hydrate event names
  const eventIds = [...eventStats.keys()];
  const eventInfoMap = new Map<string, { title: string; emoji: string }>();
  if (eventIds.length > 0) {
    const refs = eventIds.map((eid) => db.collection("events").doc(eid));
    const eventDocs = await db.getAll(...refs);
    for (const eventDoc of eventDocs) {
      if (eventDoc.exists) {
        const data = eventDoc.data()!;
        eventInfoMap.set(eventDoc.id, { title: data.title || "Unknown", emoji: data.emoji || "" });
      }
    }
  }

  const tickets_sold = snap.size;
  const avg_ticket_price = tickets_sold > 0 ? Math.round(total_revenue / tickets_sold) : 0;

  const per_event = eventIds.map((eid) => {
    const es = eventStats.get(eid)!;
    const info = eventInfoMap.get(eid) || { title: "Unknown", emoji: "" };
    return {
      event_id: eid,
      event_title: info.title,
      event_emoji: info.emoji,
      revenue: es.revenue,
      ticket_count: es.count,
      per_tier: [...es.tiers.entries()].map(([tier_name, ts]) => ({
        tier_name,
        revenue: ts.revenue,
        count: ts.count,
      })),
    };
  }).sort((a, b) => b.revenue - a.revenue);

  return {
    total_revenue,
    today_revenue,
    tickets_sold,
    avg_ticket_price,
    addon_revenue,
    per_event,
  };
}

/** Admin cancel a ticket (no user_id check) */
export async function adminCancelTicket(
  ticketId: string,
  reason?: string,
): Promise<{ success: boolean; error?: string }> {
  const db = await getDb();
  return db.runTransaction(async (tx) => {
    const ticketRef = db.collection("tickets").doc(ticketId);
    const ticketDoc = await tx.get(ticketRef);

    if (!ticketDoc.exists) {
      return { success: false, error: "Ticket not found" };
    }

    const ticket = ticketDoc.data()!;

    if (!["pending_payment", "confirmed"].includes(ticket.status)) {
      return { success: false, error: `Cannot cancel: ticket is ${ticket.status}` };
    }

    const wasConfirmed = ticket.status === "confirmed";
    const quantity = ticket.quantity || 1;

    tx.update(ticketRef, {
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      cancelled_reason: reason || "admin_cancelled",
    });

    if (wasConfirmed) {
      const eventRef = db.collection("events").doc(ticket.event_id);
      tx.update(eventRef, { spots_taken: FieldValue.increment(-quantity) });

      // Release seating
      const eventDoc = await tx.get(eventRef);
      if (eventDoc.exists) {
        const event = eventDoc.data()!;
        const seating = event.seating;
        if (seating && seating.mode !== "none") {
          if (seating.mode === "custom" && ticket.spot_id && seating.spots) {
            const updatedSpots = seating.spots.map((s: { id: string; booked: number; seats?: Array<{ id: string; status: string }> }) => {
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
          if (ticket.seat_id && seating.mode !== "custom" && seating.seats) {
            const updatedSeats = seating.seats.map((s: { id: string }) =>
              s.id === ticket.seat_id ? { ...s, status: "available", held_by: null } : s,
            );
            tx.update(eventRef, { "seating.seats": updatedSeats });
          }
          if (ticket.section_id && seating.sections) {
            const updatedSections = seating.sections.map((s: { id: string; booked: number }) =>
              s.id === ticket.section_id ? { ...s, booked: Math.max(0, s.booked - 1) } : s,
            );
            tx.update(eventRef, { "seating.sections": updatedSections });
          }
        }

        // Decrement tier sold count
        const tiers = event.ticketing?.tiers || [];
        if (tiers.length > 0 && ticket.tier_id) {
          const updatedTiers = tiers.map((t: { id: string; sold: number }) =>
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

        // Release add-on seat bookings
        if (ticket.add_ons?.some((a: { spot_id?: string }) => a.spot_id)) {
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
                  spot.booked = Math.max(0, (spot.booked || 0) - 1);
                }
              }
            }
          }
          tx.update(eventRef, { "checkout.steps": checkoutSteps });
        }
      }
    }

    return { success: true };
  });
}

/** Admin confirm a pending_payment ticket */
export async function adminConfirmTicket(
  ticketId: string,
): Promise<{ success: boolean; error?: string }> {
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

    // Verify event is still active
    if (eventDoc.exists) {
      const eventStatus = eventDoc.data()!.status;
      if (eventStatus === "cancelled" || eventStatus === "completed") {
        tx.update(ticketRef, { status: "cancelled", cancelled_reason: "event_" + eventStatus });
        return { success: false, error: `Event is ${eventStatus} — ticket cannot be confirmed` };
      }
    }

    // Now perform all writes
    tx.update(ticketRef, { status: "confirmed", confirmed_at: new Date().toISOString() });
    tx.update(eventRef, { spots_taken: FieldValue.increment(quantity) });

    if (eventDoc.exists) {
      const event = eventDoc.data()!;
      const tiers = event.ticketing?.tiers || [];
      if (tiers.length > 0 && ticket.tier_id) {
        const updatedTiers = tiers.map((t: { id: string; sold: number }) =>
          t.id === ticket.tier_id ? { ...t, sold: t.sold + quantity } : t,
        );
        tx.update(eventRef, { "ticketing.tiers": updatedTiers });
      }

      // Update time slot booked count
      if (ticket.time_slot && event.ticketing?.time_slots?.length) {
        const updatedSlots = event.ticketing.time_slots.map((s: { id: string; booked: number }) =>
          s.id === ticket.time_slot ? { ...s, booked: s.booked + quantity } : s,
        );
        tx.update(eventRef, { "ticketing.time_slots": updatedSlots });
      }

      // Update seating (held -> booked)
      const seating = event.seating;
      if (seating && seating.mode !== "none") {
        if (seating.mode === "custom" && ticket.spot_id && seating.spots) {
          const updatedSpots = seating.spots.map((s: { id: string; booked: number; seats?: Array<{ id: string; status: string }> }) => {
            if (s.id !== ticket.spot_id) return s;
            if (ticket.spot_seat_id && s.seats) {
              const updatedSeats = s.seats.map((seat) =>
                seat.id === ticket.spot_seat_id ? { ...seat, status: "booked", held_by: ticket.user_id, held_until: null } : seat,
              );
              return { ...s, seats: updatedSeats, booked: s.booked + 1 };
            }
            return { ...s, booked: s.booked + 1 };
          });
          tx.update(eventRef, { "seating.spots": updatedSpots });
        }
        if (ticket.seat_id && seating.mode !== "custom" && seating.seats) {
          const updatedSeats = seating.seats.map((s: { id: string }) =>
            s.id === ticket.seat_id ? { ...s, status: "booked", held_by: ticket.user_id, held_until: null } : s,
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
      if (ticket.add_ons?.some((a: { spot_id?: string }) => a.spot_id)) {
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

/** Export tickets as CSV string */
export async function exportTicketsCSV(filters: BookingsFilters): Promise<string> {
  // Reuse the filtered tickets logic but without pagination
  const allFilters = { ...filters, page: 1, limit: 10000 };
  const { tickets } = await getFilteredTickets(allFilters);

  const headers = [
    "Ticket ID",
    "User Name",
    "User Handle",
    "Event",
    "Tier",
    "Price (INR)",
    "Quantity",
    "Status",
    "Add-ons",
    "Section/Seat",
    "Pickup Point",
    "Purchased At",
    "Checked In At",
  ];

  const rows = tickets.map((t) => [
    t.id,
    escapeCsv(t.user_name || ""),
    escapeCsv(t.user_handle || ""),
    escapeCsv(t.event_title || ""),
    escapeCsv(t.tier_name || ""),
    (t.price || 0).toFixed(2),
    t.quantity || 1,
    t.status,
    t.add_ons ? t.add_ons.map((a) => `${a.name} x${a.quantity}`).join("; ") : "",
    t.spot_seat_label ? `${t.spot_name || ""} - ${t.spot_seat_label}` : (t.section_name || t.spot_name || t.seat_id || ""),
    t.pickup_point || "",
    t.purchased_at || "",
    t.checked_in_at || "",
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

function escapeCsv(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}
