import crypto from "crypto";
import { env } from "../config/env";

interface CreatePaymentLinkParams {
  amount: number; // in rupees — converted to paise (×100) for Razorpay API
  ticketId: string;
  eventTitle: string;
  customerName: string;
}

interface PaymentLinkResult {
  success: boolean;
  payment_link_id?: string;
  payment_url?: string;
  error?: string;
}

/** Create a Razorpay Payment Link via REST API */
export async function createPaymentLink(params: CreatePaymentLinkParams): Promise<PaymentLinkResult> {
  const { amount, ticketId, eventTitle, customerName } = params;

  const callbackUrl = `${env.appUrl}/?razorpay_status=paid&ticket_id=${ticketId}`;
  const isLocalhost = process.env.NODE_ENV !== "production";

  const PAYMENT_TIMEOUT_S = 16 * 60; // 16 minutes — Razorpay requires at least 15min in future, so add 1min buffer
  const body: Record<string, any> = {
    amount: amount * 100, // Convert rupees to paise (Razorpay expects paise)
    currency: "INR",
    description: `Ticket for ${eventTitle}`,
    customer: { name: customerName },
    notes: { ticket_id: ticketId },
    reminder_enable: false,
    expire_by: Math.floor(Date.now() / 1000) + PAYMENT_TIMEOUT_S,
  };

  // Razorpay rejects localhost callback URLs — only set for real domains
  if (!isLocalhost) {
    body.callback_url = callbackUrl;
    body.callback_method = "get";
  }

  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");

  try {
    const res = await fetch("https://api.razorpay.com/v1/payment_links", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    const data = await res.json() as Record<string, any>;

    if (!res.ok) {
      console.error("[razorpay] Payment link creation failed:", data);
      return { success: false, error: data.error?.description || "Payment link creation failed" };
    }

    return {
      success: true,
      payment_link_id: data.id as string,
      payment_url: data.short_url as string,
    };
  } catch (err) {
    console.error("[razorpay] Payment link API error:", err);
    return { success: false, error: "Failed to connect to payment provider" };
  }
}

/** Fetch payment link status from Razorpay (for reconciliation) */
export async function fetchPaymentLinkStatus(paymentLinkId: string): Promise<{
  status: string;
  payments?: Array<{ payment_id: string; status: string }>;
} | null> {
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  try {
    const res = await fetch(`https://api.razorpay.com/v1/payment_links/${paymentLinkId}`, {
      method: "GET",
      headers: { Authorization: `Basic ${auth}` },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      console.error(`[razorpay] Failed to fetch payment link ${paymentLinkId}:`, res.status);
      return null;
    }
    const data = await res.json() as Record<string, any>;
    return {
      status: data.status as string,
      payments: (data.payments || []).map((p: any) => ({
        payment_id: p.payment_id,
        status: p.status,
      })),
    };
  } catch (err) {
    console.error(`[razorpay] fetchPaymentLinkStatus error for ${paymentLinkId}:`, err);
    return null;
  }
}

/** Cancel a Razorpay payment link (best-effort cleanup) */
export async function cancelPaymentLink(paymentLinkId: string): Promise<boolean> {
  const auth = Buffer.from(`${env.razorpayKeyId}:${env.razorpayKeySecret}`).toString("base64");
  try {
    const res = await fetch(`https://api.razorpay.com/v1/payment_links/${paymentLinkId}/cancel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${auth}`,
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      const data = await res.json() as Record<string, any>;
      // Already cancelled/expired is fine
      if (data.error?.code === "BAD_REQUEST_ERROR") return true;
      console.error(`[razorpay] Failed to cancel payment link ${paymentLinkId}:`, data);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[razorpay] cancelPaymentLink error for ${paymentLinkId}:`, err);
    return false;
  }
}

/** Verify Razorpay webhook signature (HMAC SHA256 using the dedicated webhook secret) */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", env.razorpayWebhookSecret)
    .update(body)
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature),
    );
  } catch {
    return false;
  }
}
