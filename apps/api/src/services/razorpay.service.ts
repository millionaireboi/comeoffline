import crypto from "crypto";
import { env } from "../config/env";

interface CreatePaymentLinkParams {
  amount: number; // in rupees (converted to paise for Razorpay)
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
  const isLocalhost = env.appUrl.includes("localhost");

  const body: Record<string, any> = {
    amount: amount * 100, // Convert rupees to paise (Razorpay expects paise)
    currency: "INR",
    description: `Ticket for ${eventTitle}`,
    customer: { name: customerName },
    notes: { ticket_id: ticketId },
    reminder_enable: false,
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

/** Verify Razorpay webhook signature (HMAC SHA256) */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", env.razorpayKeySecret)
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
