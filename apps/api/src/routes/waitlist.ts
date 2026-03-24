import { Router } from "express";
import { requireAuth, type AuthRequest } from "../middleware/auth";
import { joinWaitlist, getUserWaitlistEntry, cancelWaitlistEntry } from "../services/waitlist.service";

const router = Router();

/** POST /api/events/:eventId/waitlist — Join the waitlist */
router.post("/:eventId/waitlist", requireAuth, async (req: AuthRequest, res) => {
  try {
    const rawSpots = req.body?.spots_wanted;
    const spotsWanted = typeof rawSpots === "number" ? Math.floor(rawSpots) : 1;

    if (spotsWanted < 1 || spotsWanted > 4) {
      res.status(400).json({ success: false, error: "spots_wanted must be between 1 and 4" });
      return;
    }

    const result = await joinWaitlist(
      req.params.eventId as string,
      req.uid!,
      spotsWanted,
    );

    if (!result.success) {
      res.status(400).json({ success: false, error: result.error });
      return;
    }

    res.status(201).json({ success: true, data: result.entry });
  } catch (err) {
    console.error("[waitlist] join error:", err);
    res.status(500).json({ success: false, error: "Failed to join waitlist" });
  }
});

/** GET /api/events/:eventId/waitlist — Get user's waitlist entry */
router.get("/:eventId/waitlist", requireAuth, async (req: AuthRequest, res) => {
  try {
    const entry = await getUserWaitlistEntry(req.params.eventId as string, req.uid!);
    res.json({ success: true, data: entry });
  } catch (err) {
    console.error("[waitlist] get error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch waitlist entry" });
  }
});

/** DELETE /api/events/:eventId/waitlist/:entryId — Leave the waitlist */
router.delete("/:eventId/waitlist/:entryId", requireAuth, async (req: AuthRequest, res) => {
  try {
    const cancelled = await cancelWaitlistEntry(
      req.params.eventId as string,
      req.params.entryId as string,
      req.uid!,
    );

    if (!cancelled) {
      res.status(404).json({ success: false, error: "Waitlist entry not found or already cancelled" });
      return;
    }

    res.json({ success: true });
  } catch (err) {
    console.error("[waitlist] cancel error:", err);
    res.status(500).json({ success: false, error: "Failed to leave waitlist" });
  }
});

export default router;
