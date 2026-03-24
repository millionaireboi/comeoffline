import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import {
  getFilteredTickets,
  getBookingsStats,
  adminCancelTicket,
  adminConfirmTicket,
  streamTicketsCSV,
} from "../../services/bookings.service";
import { withCache, invalidateCacheByPrefix, isQuotaError } from "../../utils/cache";

const router = Router();

/** GET /api/admin/bookings — Paginated ticket list with filters */
router.get("/", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const filters = {
      event_id: req.query.event_id as string | undefined,
      status: req.query.status as string | undefined,
      search: req.query.search as string | undefined,
      from_date: req.query.from_date as string | undefined,
      to_date: req.query.to_date as string | undefined,
      timezone: (req.query.timezone as string) || undefined,
      sort_by: (req.query.sort_by as "date" | "price" | "status") || "date",
      sort_dir: (req.query.sort_dir as "asc" | "desc") || "desc",
      page: parseInt(req.query.page as string) || 1,
      limit: Math.min(parseInt(req.query.limit as string) || 50, 200),
    };

    const cacheKey = `admin-bookings-${Object.keys(filters).sort().map(k => `${k}=${(filters as Record<string, unknown>)[k]}`).join("&")}`;
    const result = await withCache(() => getFilteredTickets(filters), {
      key: cacheKey,
      ttl: 2 * 60 * 1000,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    console.error("[admin/bookings] list error:", err);
    const s = isQuotaError(err) ? 429 : 500;
    res.status(s).json({ success: false, error: isQuotaError(err) ? "Firestore quota exceeded. Try again in a few minutes." : "Internal server error" });
  }
});

/** GET /api/admin/bookings/stats — Revenue breakdown */
router.get("/stats", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const eventId = req.query.event_id as string | undefined;

    const stats = await withCache(
      () => getBookingsStats(eventId),
      { key: `admin-bookings-stats-${eventId || "all"}`, ttl: 5 * 60 * 1000 },
    );

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("[admin/bookings] stats error:", err);
    const s = isQuotaError(err) ? 429 : 500;
    res.status(s).json({ success: false, error: isQuotaError(err) ? "Firestore quota exceeded. Try again in a few minutes." : "Internal server error" });
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
      timezone: (req.query.timezone as string) || undefined,
      sort_by: (req.query.sort_by as "date" | "price" | "status") || "date",
      sort_dir: (req.query.sort_dir as "asc" | "desc") || "desc",
    };

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename=bookings-${new Date().toISOString().split("T")[0]}.csv`);
    await streamTicketsCSV(filters, (chunk) => res.write(chunk));
    res.end();
  } catch (err) {
    console.error("[admin/bookings] export error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

/** POST /api/admin/bookings/:id/cancel — Admin cancel a ticket */
router.post("/:id/cancel", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const { reason } = req.body || {};
    const result = await adminCancelTicket(req.params.id as string, reason, req.uid);

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    // Invalidate bookings and stats caches
    invalidateCacheByPrefix("admin-bookings-");

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

    // Invalidate bookings and stats caches
    invalidateCacheByPrefix("admin-bookings-");

    res.json({ success: true });
  } catch (err) {
    console.error("[admin/bookings] confirm error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
});

export default router;
