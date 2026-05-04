/**
 * WhatsApp Cloud API webhook
 *
 * Two responsibilities:
 *   1. GET  /api/webhooks/whatsapp — Meta verification handshake. Echoes hub.challenge when
 *      hub.verify_token matches WHATSAPP_VERIFY_TOKEN.
 *   2. POST /api/webhooks/whatsapp — delivery status callbacks (sent / delivered / read /
 *      failed) and inbound messages. Logs everything, persists status history per wamid,
 *      and propagates the latest status onto phone_otps/{uid} so admins can see exactly
 *      why an OTP didn't reach the user.
 *
 * Setup:
 *   1. Set WHATSAPP_VERIFY_TOKEN to any random string in your env.
 *   2. (Recommended) Set WHATSAPP_APP_SECRET (App Dashboard → Settings → Basic → App Secret)
 *      so we can verify Meta's HMAC signature on the POST.
 *   3. In Meta Business Manager → WhatsApp → Configuration → Webhook:
 *      - Callback URL: https://<api-host>/api/webhooks/whatsapp
 *      - Verify token: same value as WHATSAPP_VERIFY_TOKEN
 *      - Subscribe to fields: messages
 */

import { Router, type Request, type Response } from "express";
import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { env } from "../config/env";
import { getDb } from "../config/firebase-admin";

const router = Router();

interface WhatsAppStatus {
  id: string; // wamid of the outbound message
  recipient_id: string;
  status: "sent" | "delivered" | "read" | "failed";
  timestamp: string;
  errors?: Array<{
    code: number;
    title?: string;
    message?: string;
    error_data?: { details?: string };
    href?: string;
  }>;
  conversation?: { id: string; origin?: { type?: string } };
  pricing?: { category?: string; pricing_model?: string };
}

interface WhatsAppInboundMessage {
  from: string;
  id: string;
  timestamp: string;
  type: string;
  text?: { body: string };
}

interface WhatsAppWebhookPayload {
  object?: string;
  entry?: Array<{
    id?: string;
    changes?: Array<{
      field?: string;
      value?: {
        messaging_product?: string;
        metadata?: { display_phone_number?: string; phone_number_id?: string };
        statuses?: WhatsAppStatus[];
        messages?: WhatsAppInboundMessage[];
        contacts?: Array<{ wa_id: string; profile?: { name?: string } }>;
      };
    }>;
  }>;
}

/** Verifies the X-Hub-Signature-256 header against WHATSAPP_APP_SECRET. */
function verifySignature(rawBody: string, header: string | undefined): boolean {
  if (!env.whatsappAppSecret) return true; // signing disabled — accept all
  if (!header || !header.startsWith("sha256=")) return false;
  const expected = crypto
    .createHmac("sha256", env.whatsappAppSecret)
    .update(rawBody)
    .digest("hex");
  const provided = header.slice("sha256=".length);
  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(provided, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** GET — Meta verification handshake. */
router.get("/", (req: Request, res: Response) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (!env.whatsappVerifyToken) {
    console.error("[whatsapp-webhook] WHATSAPP_VERIFY_TOKEN is not set — rejecting verification");
    res.status(500).send("Webhook not configured");
    return;
  }

  if (mode === "subscribe" && token === env.whatsappVerifyToken) {
    console.log("[whatsapp-webhook] verification handshake OK");
    res.status(200).send(String(challenge ?? ""));
    return;
  }

  console.warn("[whatsapp-webhook] verification failed", { mode, tokenMatched: token === env.whatsappVerifyToken });
  res.sendStatus(403);
});

/** POST — delivery status callbacks + inbound messages. */
router.post("/", async (req: Request, res: Response) => {
  const rawBody = (req as unknown as { rawBody?: string }).rawBody ?? JSON.stringify(req.body ?? {});
  const signatureOk = verifySignature(rawBody, req.headers["x-hub-signature-256"] as string | undefined);

  if (!signatureOk) {
    console.warn("[whatsapp-webhook] invalid X-Hub-Signature-256 — rejecting");
    res.sendStatus(401);
    return;
  }

  // Always 200 quickly so Meta doesn't disable the webhook on slow handlers.
  res.status(200).send("OK");

  try {
    const payload = req.body as WhatsAppWebhookPayload;
    const db = await getDb();

    for (const entry of payload.entry ?? []) {
      for (const change of entry.changes ?? []) {
        const value = change.value;
        if (!value) continue;

        // Status updates (sent/delivered/read/failed)
        for (const status of value.statuses ?? []) {
          const at = new Date(parseInt(status.timestamp, 10) * 1000).toISOString();
          const errSummary = status.errors?.[0]
            ? `${status.errors[0].code} ${status.errors[0].title ?? ""} — ${status.errors[0].message ?? ""}${status.errors[0].error_data?.details ? ` (${status.errors[0].error_data.details})` : ""}`
            : null;

          if (status.status === "failed" || status.errors?.length) {
            console.error("[whatsapp-webhook] FAILED", {
              wamid: status.id,
              recipient: status.recipient_id,
              error: errSummary,
              errors: status.errors,
            });
          } else {
            console.log(
              `[whatsapp-webhook] ${status.status} wamid=${status.id} to=${status.recipient_id} at=${at}`,
            );
          }

          // Update the dispatch record indexed by wamid
          const msgRef = db.collection("whatsapp_messages").doc(status.id);
          const msgSnap = await msgRef.get();
          await msgRef.set(
            {
              wamid: status.id,
              status: status.status,
              status_history: FieldValue.arrayUnion({
                status: status.status,
                at,
                errors: status.errors ?? null,
              }),
              ...(status.status === "failed" && status.errors?.[0]
                ? {
                    failure_code: status.errors[0].code,
                    failure_title: status.errors[0].title ?? null,
                    failure_message: status.errors[0].message ?? null,
                    failure_details: status.errors[0].error_data?.details ?? null,
                  }
                : {}),
              last_status_at: at,
            },
            { merge: true },
          );

          // If this was an OTP send, mirror the status onto phone_otps/{uid} so the
          // user-facing record explains itself.
          const msg = msgSnap.exists ? msgSnap.data() : null;
          if (msg?.kind === "phone_otp" && msg.user_id) {
            await db.collection("phone_otps").doc(msg.user_id).set(
              {
                last_send_status: status.status,
                last_send_status_at: at,
                ...(status.status === "failed" && status.errors?.[0]
                  ? {
                      last_send_error: errSummary,
                      last_send_error_code: status.errors[0].code,
                      last_send_error_details: status.errors[0].error_data?.details ?? null,
                    }
                  : {}),
              },
              { merge: true },
            );
          }
        }

        // Inbound messages — log only (we don't currently process incoming WhatsApp).
        for (const inbound of value.messages ?? []) {
          console.log(
            `[whatsapp-webhook] inbound type=${inbound.type} from=${inbound.from} id=${inbound.id}`,
          );
        }
      }
    }
  } catch (err) {
    console.error("[whatsapp-webhook] handler error:", err);
  }
});

export default router;
