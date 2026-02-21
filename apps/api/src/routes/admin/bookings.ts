import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import {
  getFilteredTickets,
  getBookingsStats,
  adminCancelTicket,
  adminConfirmTicket,
  exportTicketsCSV,
} from "../../services/bookings.service";

const router = Router();

// In-memory cache for bookings stats (5 minute TTL)
let statsCache: { data: unknown; timestamp: number; key: string } | null = null;
const STATS_CACHE_TTL = 5 * 60 * 1000;

/** GET /api/admin/bookings — Paginated ticket list with filters */
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const filters = {
      event_id: req.query.event_id as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      from_date: req.query.from_date as string | undefined,
      to_date: req.query.to_date as string | undefined,
      sort_by: (req.query.sort_by as "date" | "price" | "status") || "date",
      sort_dir: (req.query.sort_dir as "asc" | "desc") || "desc",
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 50, 200),
    };

    const result = await getFilteredTickets(filters);
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[admin/bookings] list error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/admin/bookings/stats — Revenue breakdown */
router.get("/stats", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.event_id as string | undefined;
    const cacheKey = `stats_${eventId || "all"}`;

    // Return cached data if fresh
    if (statsCache && statsCache.key === cacheKey && Date.now() - statsCache.timestamp < STATS_CACHE_TTL) {
      res.json({ success: true, data: statsCache.data, cached: true });
      return;
    }

    const stats = await getBookingsStats(eventId);

    statsCache = { data: stats, timestamp: Date.now(), key: cacheKey };

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("[admin/bookings] stats error:", err);

    const error = err as { code?: number; message?: string };
    if (error.code === 8 || (error.message && error.message.includes("RESOURCE_EXHAUSTED"))) {
      if (statsCache) {
        res.json({ success: true, data: statsCache.data, cached: true, stale: true });
        return;
      }
      res.status(429).json({ success: false, error: "Firestore quota exceeded" });
      return;
    }

    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** GET /api/admin/bookings/export — CSV download */
router.get("/export", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const filters = {
      event_id: req.query.event_id as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      from_date: req.query.from_date as string | undefined,
      to_date: req.query.to_date as string | undefined,
      sort_by: (req.query.sort_by as "date" | "price" | "status") || "date",
      sort_dir: (req.query.sort_dir as "asc" | "desc") || "desc",
    };

    const csv = await exportTicketsCSV(filters);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=bookings-${new Date().toISOString().split("T")[0]}.csv`);
    res.send(csv);
  } catch (err) {
    console.error("[admin/bookings] export error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/bookings/:id/cancel — Admin cancel a ticket */
router.post("/:id/cancel", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body || {};
    const result = await adminCancelTicket(req.params.id as string, reason);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Invalidate stats cache
    statsCache = null;

    res.json({ success: true });
  } catch (err) {
    console.error("[admin/bookings] cancel error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/bookings/:id/confirm — Admin confirm a pending ticket */
router.post("/:id/confirm", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const result = await adminConfirmTicket(req.params.id as string);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Invalidate stats cache
    statsCache = null;

    res.json({ success: true });
  } catch (err) {
    console.error("[admin/bookings] confirm error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
