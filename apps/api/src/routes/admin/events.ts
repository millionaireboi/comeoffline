import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import {
  getAllEvents,
  getEventById,
  createEvent,
  updateEvent,
  updateEventStatus,
} from "../../services/events.service";
import { getEventWaitlist, notifyAndOpenSales } from "../../services/waitlist.service";
import { withCache, invalidateCache, isQuotaError } from "../../utils/cache";

const router = Router();

/** GET /api/admin/events — List all events (including drafts) */
router.get("/", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const events = await withCache(() => getAllEvents(), {
      key: "admin-events",
      ttl: 5 * 60 * 1000,
    });
    res.json({ success: true, data: events });
  } catch (err) {
    console.error("[admin/events] list error:", err);
    const status = isQuotaError(err) ? 429 : 500;
    res.status(status).json({ success: false, error: isQuotaError(err) ? "Firestore quota exceeded. Try again in a few minutes." : "Failed to fetch events" });
  }
});

/** GET /api/admin/events/:id — Get single event */
router.get("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const event = await withCache(() => getEventById(id), {
      key: `admin-event-${id}`,
      ttl: 3 * 60 * 1000,
    });
    if (!event) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    res.json({ success: true, data: event });
  } catch (err) {
    console.error("[admin/events] get error:", err);
    const status = isQuotaError(err) ? 429 : 500;
    res.status(status).json({ success: false, error: isQuotaError(err) ? "Firestore quota exceeded. Try again in a few minutes." : "Failed to fetch event" });
  }
});

/** POST /api/admin/events — Create event */
router.post("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const event = await createEvent(req.body);
    invalidateCache("admin-events");
    res.status(201).json({ success: true, data: event });
  } catch (err) {
    console.error("[admin/events] create error:", err);
    const message = err instanceof Error ? err.message : "Failed to create event";
    const status = message.includes("required") ? 400 : 500;
    res.status(status).json({ success: false, error: message });
  }
});

/** PUT /api/admin/events/:id — Update event */
router.put("/:id", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const event = await updateEvent(id, req.body);
    if (!event) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    invalidateCache("admin-events");
    invalidateCache(`admin-event-${id}`);
    res.json({ success: true, data: event });
  } catch (err) {
    console.error("[admin/events] update error:", err);
    res.status(500).json({ success: false, error: "Failed to update event" });
  }
});

/** PUT /api/admin/events/:id/status — Update event status */
router.put("/:id/status", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { status } = req.body;
    if (!status) {
      res.status(400).json({ success: false, error: "Status is required" });
      return;
    }

    const id = req.params.id as string;
    const updated = await updateEventStatus(id, status);
    if (!updated) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    invalidateCache("admin-events");
    invalidateCache(`admin-event-${id}`);
    res.json({ success: true });
  } catch (err) {
    console.error("[admin/events] status error:", err);
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
});

/** GET /api/admin/events/:id/waitlist — View waitlist entries */
router.get("/:id/waitlist", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const entries = await getEventWaitlist(req.params.id as string);
    res.json({ success: true, data: entries });
  } catch (err) {
    console.error("[admin/events] waitlist error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch waitlist" });
  }
});

/** POST /api/admin/events/:id/duplicate — Duplicate an event as a new draft.
 *  Optional body { date, title }: the "add a date" flow — same event, new
 *  night. With a date the copy keeps the source title (it's the next edition
 *  of a series, not a "Copy of"). */
router.post("/:id/duplicate", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const { date: newDate, title: newTitle } = (req.body ?? {}) as { date?: string; title?: string };
    const source = await getEventById(id);
    if (!source) {
      res.status(404).json({ success: false, error: "Event not found" });
      return;
    }
    const { id: _id, spots_taken: _spots, waitlist_count: _wl, ...rest } = source as unknown as Record<string, unknown>;
    // The copy is a fresh edition — carry the config, zero the sales state
    // (tier sold counts, section/spot bookings, individual seat holds).
    const fresh = rest as Partial<Parameters<typeof createEvent>[0]>;
    if (fresh.ticketing) {
      fresh.ticketing = {
        ...fresh.ticketing,
        tiers: (fresh.ticketing.tiers ?? []).map((t) => ({ ...t, sold: 0 })),
      };
    }
    if (fresh.seating) {
      // Firestore rejects undefined values (no ignoreUndefinedProperties) —
      // omit optional keys instead of writing them as undefined
      fresh.seating = {
        ...fresh.seating,
        sections: (fresh.seating.sections ?? []).map((s) => ({ ...s, booked: 0 })),
        seats: (fresh.seating.seats ?? []).map(({ held_by: _hb, held_until: _hu, ...seat }) => ({
          ...seat,
          status: "available" as const,
        })),
        ...(fresh.seating.spots
          ? {
              spots: fresh.seating.spots.map((spot) => ({
                ...spot,
                booked: 0,
                ...(spot.seats
                  ? {
                      seats: spot.seats.map(({ held_by: _hb, held_until: _hu, ...seat }) => ({
                        ...seat,
                        status: "available" as const,
                      })),
                    }
                  : {}),
              })),
            }
          : {}),
      };
    }
    const copy = await createEvent({
      ...fresh,
      title: newTitle?.trim() || (newDate ? source.title : `Copy of ${source.title}`),
      ...(newDate ? { date: newDate } : {}),
      status: "draft",
      spots_taken: 0,
    } as Parameters<typeof createEvent>[0]);
    invalidateCache("admin-events");
    res.status(201).json({ success: true, data: copy });
  } catch (err) {
    console.error("[admin/events] duplicate error:", err);
    res.status(500).json({ success: false, error: "Failed to duplicate event" });
  }
});

/** PUT /api/admin/events/:id/open-sales — Transition announced → listed and notify waitlist */
router.put("/:id/open-sales", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const id = req.params.id as string;
    const result = await notifyAndOpenSales(id, req.uid!);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    invalidateCache("admin-events");
    invalidateCache(`admin-event-${id}`);
    res.json({ success: true, data: { sent: result.sent, failed: result.failed } });
  } catch (err) {
    console.error("[admin/events] open-sales error:", err);
    res.status(500).json({ success: false, error: "Failed to open sales" });
  }
});

export default router;
