/**
 * Admin WhatsApp inbox — replies to campaign blasts and any other inbound messages.
 *
 * Mounted at /api/admin — adds:
 *   GET  /whatsapp/inbox            conversation list, newest activity first
 *   GET  /whatsapp/inbox/:phone     full thread (marks it read)
 *   POST /whatsapp/inbox/:phone/reply   free-form text reply — only works inside the
 *                                       24h customer-service window (WhatsApp rule)
 */

import { Router, type Response } from "express";
import { requireAdmin, type AuthRequest } from "../../middleware/auth";
import { strictLimiter } from "../../middleware/rateLimit";
import {
  listConversations,
  getThread,
  replyToConversation,
} from "../../services/whatsapp-inbox.service";

const router = Router();

function sendError(res: Response, err: unknown, context: string) {
  const statusCode = (err as { statusCode?: number }).statusCode ?? 500;
  const message = err instanceof Error ? err.message : "Internal server error";
  if (statusCode >= 500) console.error(`[admin/whatsapp-inbox] ${context} error:`, message);
  res.status(statusCode).json({ success: false, error: message });
}

router.get("/whatsapp/inbox", requireAdmin, async (_req: AuthRequest, res) => {
  try {
    const conversations = await listConversations();
    res.json({ success: true, data: { conversations } });
  } catch (err) {
    sendError(res, err, "list");
  }
});

router.get("/whatsapp/inbox/:phone", requireAdmin, async (req: AuthRequest, res) => {
  try {
    const thread = await getThread(String(req.params.phone));
    if (!thread.conversation) {
      res.status(404).json({ success: false, error: "Conversation not found" });
      return;
    }
    res.json({ success: true, data: thread });
  } catch (err) {
    sendError(res, err, "thread");
  }
});

router.post(
  "/whatsapp/inbox/:phone/reply",
  strictLimiter,
  requireAdmin,
  async (req: AuthRequest, res) => {
    try {
      const text = String((req.body as { text?: string }).text ?? "").trim();
      if (!text) {
        res.status(400).json({ success: false, error: "'text' is required" });
        return;
      }
      if (text.length > 4096) {
        res.status(400).json({ success: false, error: "Reply too long (max 4096 chars)" });
        return;
      }
      const result = await replyToConversation(
        String(req.params.phone),
        text,
        req.uid ?? "unknown",
      );
      if (!result.ok) {
        res.status(502).json({ success: false, error: result.error, code: result.code });
        return;
      }
      res.json({ success: true, data: { messageId: result.messageId } });
    } catch (err) {
      sendError(res, err, "reply");
    }
  },
);

export default router;
