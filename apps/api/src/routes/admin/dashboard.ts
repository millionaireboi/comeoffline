import { Router } from "express";
import { requireAdmin } from "../../middleware/auth";
import { getDb } from "../../config/firebase-admin";
import { withCache, isQuotaError } from "../../utils/cache";

const router = Router();

async function fetchDashboardStats() {
  const db = await getDb();

  // Use count() aggregation queries to avoid reading all documents
  const [
    totalMembersSnap,
    provisionalUsersSnap,
    upcomingEventsSnap,
    liveEventsSnap,
    confirmedTicketsSnap,
    checkedInTicketsSnap,
    vouchSnap,
    contactUnreadSnap,
    brandNewSnap,
  ] = await Promise.all([
    db.collection("users").count().get(),
    db.collection("users").where("status", "==", "provisional").count().get(),
    db.collection("events").where("status", "==", "upcoming").count().get(),
    db.collection("events").where("status", "==", "live").count().get(),
    db.collection("tickets").where("status", "==", "confirmed").count().get(),
    db.collection("tickets").where("status", "==", "checked_in").count().get(),
    db.collection("vouch_codes").where("status", "==", "depleted").count().get(),
    db.collection("contact_submissions").where("status", "==", "unread").count().get(),
    db.collection("brand_inquiries").where("status", "==", "new").count().get(),
  ]);

  const total_members = totalMembersSnap.data().count;
  const active_events = upcomingEventsSnap.data().count + liveEventsSnap.data().count;
  const total_tickets = confirmedTicketsSnap.data().count + checkedInTicketsSnap.data().count;
  const vouch_codes_used = vouchSnap.data().count;
  const provisional_users = provisionalUsersSnap.data().count;
  const contact_unread = contactUnreadSnap.data().count;
  const brand_new = brandNewSnap.data().count;

  // For revenue, we still need to read ticket docs (consider maintaining a counter in a separate doc)
  const ticketsWithPrice = await db.collection("tickets")
    .where("status", "in", ["confirmed", "checked_in"])
    .select("price")
    .get();
  const total_revenue = ticketsWithPrice.docs.reduce((sum, doc) => sum + (doc.data().price || 0), 0);

  return {
    total_members,
    active_events,
    total_tickets,
    vouch_codes_used,
    provisional_users,
    total_revenue,
    contact_unread,
    brand_new,
  };
}

/** GET /api/admin/dashboard-stats — Aggregate stats for admin dashboard */
router.get("/dashboard-stats", requireAdmin, async (_req, res) => {
  try {
    const stats = await withCache(fetchDashboardStats, {
      key: "admin-dashboard-stats",
      ttl: 15 * 60 * 1000,
    });

    res.json({ success: true, data: stats });
  } catch (err) {
    console.error("[admin/dashboard] stats error:", err);
    const status = isQuotaError(err) ? 429 : 500;
    res.status(status).json({ success: false, error: isQuotaError(err) ? "Firestore quota exceeded. Try again in a few minutes." : "Internal server error" });
  }
});

export default router;
