import { Router } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { asyncHandler } from "../../middleware/errorHandler";
import { analyzeFloorPlan } from "../../services/floorplan.service";

const router = Router();

/** POST /api/admin/floorplan/analyze — Analyze floor plan image with Gemini Vision */
router.post(
  "/floorplan/analyze",
  requireAdmin,
  asyncHandler(async (req: AuthRequest, res) => {
    const { image } = req.body;

    if (!image || typeof image !== "string") {
      res.status(400).json({ success: false, error: "image (data URI) is required" });
      return;
    }

    // Extract base64 and mime type from data URI
    const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!matches) {
      res.status(400).json({ success: false, error: "Invalid image data URI format" });
      return;
    }

    const mimeType = `image/${matches[1]}`;
    const base64Data = matches[2];

    const spots = await analyzeFloorPlan(base64Data, mimeType);

    // Assign unique IDs
    const ts = Date.now();
    const formattedSpots = spots.map((s, i) => ({
      id: `spot_${ts}_${i}`,
      name: s.name,
      emoji: s.emoji,
      capacity: s.capacity,
      booked: 0,
      description: s.description,
      x: s.x,
      y: s.y,
      shape: s.shape,
      spot_type: s.spot_type,
      seats: s.seats?.map((seat, j) => ({
        id: `spot_${ts}_${i}_seat_${j}`,
        label: seat.label,
        status: "available" as const,
        angle: seat.angle,
      })),
    }));

    res.json({ success: true, data: { spots: formattedSpots } });
  }),
);

export default router;
