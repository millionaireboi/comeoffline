/**
 * WhatsApp OTP service — replaces Firebase Phone Auth for phone verification.
 *
 * Trust model: caller is already authenticated via Firebase ID token (custom token from
 * invite code). This service generates a 6-digit code, hashes it, stores under the user's
 * UID in Firestore, and dispatches via WhatsApp Cloud API. Verification re-hashes and
 * compares — never returns the plaintext code.
 *
 * Storage: one active OTP per user — `phone_otps/{uid}` is overwritten on each new send.
 * Hash is HMAC-SHA256(qrSigningSecret, "{phone}:{code}") so a leaked hash from one user
 * can't be replayed against another.
 */

import crypto from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { getDb } from "../config/firebase-admin";
import { env } from "../config/env";
import { sendPhoneOtp as sendPhoneOtpTemplate, normalizeRecipient } from "./whatsapp.service";

const OTP_TTL_MS = 10 * 60 * 1000; // 10 min
const MAX_VERIFY_ATTEMPTS = 5;
const MAX_SENDS_PER_WINDOW = 3;
const SEND_WINDOW_MS = 15 * 60 * 1000; // 15 min
const RESEND_COOLDOWN_MS = 30 * 1000; // 30s between consecutive sends

type SendResult =
  | { ok: true }
  | { ok: false; error: string; retry_after_seconds?: number };

type VerifyResult =
  | { ok: true }
  | { ok: false; error: string };

function generateOtp(): string {
  // 6 digits, zero-padded — crypto.randomInt for unbiased generation
  const n = crypto.randomInt(0, 1_000_000);
  return n.toString().padStart(6, "0");
}

function hashOtp(otp: string, phone: string): string {
  return crypto
    .createHmac("sha256", env.qrSigningSecret)
    .update(`${phone}:${otp}`)
    .digest("hex");
}

/** Send a 6-digit OTP via WhatsApp. Idempotent on re-call (overwrites previous). */
export async function sendPhoneOtp(userId: string, phone: string): Promise<SendResult> {
  if (!phone || !phone.startsWith("+")) {
    return { ok: false, error: "Phone number must be in E.164 format (e.g. +919876543210)" };
  }

  const db = await getDb();
  const docRef = db.collection("phone_otps").doc(userId);

  // Read previous OTP record to enforce rate limits
  const prevSnap = await docRef.get();
  const now = Date.now();

  if (prevSnap.exists) {
    const prev = prevSnap.data() as {
      sends_in_window?: number;
      window_started_at?: string;
      last_send_at?: string;
    };

    // Per-send cooldown
    if (prev.last_send_at) {
      const lastMs = new Date(prev.last_send_at).getTime();
      const elapsed = now - lastMs;
      if (elapsed < RESEND_COOLDOWN_MS) {
        return {
          ok: false,
          error: "Please wait a moment before requesting another code",
          retry_after_seconds: Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000),
        };
      }
    }

    // Per-window limit (e.g. 3 sends per 15 min)
    if (prev.window_started_at) {
      const windowStartMs = new Date(prev.window_started_at).getTime();
      const withinWindow = now - windowStartMs < SEND_WINDOW_MS;
      const sendsInWindow = prev.sends_in_window ?? 0;
      if (withinWindow && sendsInWindow >= MAX_SENDS_PER_WINDOW) {
        const retryAfter = Math.ceil((windowStartMs + SEND_WINDOW_MS - now) / 1000);
        return {
          ok: false,
          error: "Too many code requests. Try again in a few minutes.",
          retry_after_seconds: retryAfter,
        };
      }
    }
  }

  // Generate and dispatch
  const otp = generateOtp();
  const otpHash = hashOtp(otp, phone);
  const nowIso = new Date().toISOString();
  const expiresAt = new Date(now + OTP_TTL_MS).toISOString();

  const result = await sendPhoneOtpTemplate({
    to: normalizeRecipient(phone),
    code: otp,
  });

  if (!result.ok) {
    console.error(`[whatsapp-otp] dispatch failed for user ${userId}:`, {
      phone,
      error: result.error,
      code: result.code,
      httpStatus: result.httpStatus,
      details: result.details,
    });
    // Persist the failure on the OTP record so admins can see what happened without tailing logs.
    await docRef.set(
      {
        user_id: userId,
        phone,
        last_send_attempted_at: nowIso,
        last_send_ok: false,
        last_send_error: result.error,
        last_send_error_code: result.code ?? null,
        last_send_http_status: result.httpStatus ?? null,
        last_send_error_details: result.details ?? null,
      },
      { merge: true },
    );
    return { ok: false, error: "Couldn't send the code. Please try again." };
  }

  // Reset window if expired, otherwise increment counter
  const prev = prevSnap.exists ? (prevSnap.data() as { window_started_at?: string; sends_in_window?: number }) : {};
  const inWindow =
    prev.window_started_at &&
    now - new Date(prev.window_started_at).getTime() < SEND_WINDOW_MS;

  await docRef.set({
    user_id: userId,
    phone,
    otp_hash: otpHash,
    created_at: nowIso,
    expires_at: expiresAt,
    attempts: 0,
    consumed: false,
    last_send_at: nowIso,
    window_started_at: inWindow ? prev.window_started_at : nowIso,
    sends_in_window: inWindow ? (prev.sends_in_window ?? 0) + 1 : 1,
    // Diagnostics — populated by admin/whatsapp-otp/status and updated by the WhatsApp delivery webhook
    last_send_ok: true,
    last_send_attempted_at: nowIso,
    last_send_wamid: result.messageId,
    last_send_error: null,
    last_send_error_code: null,
    last_send_status: "accepted", // updated to sent/delivered/read/failed by the webhook
  });

  // Index dispatch by wamid so the delivery webhook can resolve back to the user record.
  if (result.messageId) {
    await db.collection("whatsapp_messages").doc(result.messageId).set({
      wamid: result.messageId,
      kind: "phone_otp",
      user_id: userId,
      to_normalized: normalizeRecipient(phone),
      to_input: phone,
      template_name: "phone_otp",
      sent_at: nowIso,
      status: "accepted",
      status_history: [{ status: "accepted", at: nowIso }],
    });
  }

  return { ok: true };
}

/** Verify a code submitted by the user. On success the OTP record is consumed. */
export async function verifyPhoneOtp(
  userId: string,
  phone: string,
  code: string,
): Promise<VerifyResult> {
  if (!code || !/^\d{6}$/.test(code)) {
    return { ok: false, error: "Code must be 6 digits" };
  }

  const db = await getDb();
  const docRef = db.collection("phone_otps").doc(userId);
  const snap = await docRef.get();

  if (!snap.exists) {
    return { ok: false, error: "No active code. Tap send again." };
  }

  const data = snap.data() as {
    phone: string;
    otp_hash: string;
    expires_at: string;
    attempts: number;
    consumed: boolean;
  };

  if (data.consumed) {
    return { ok: false, error: "That code was already used. Tap send again." };
  }

  if (data.phone !== phone) {
    return { ok: false, error: "Phone number doesn't match the active code. Tap send again." };
  }

  if (new Date(data.expires_at).getTime() < Date.now()) {
    return { ok: false, error: "Code expired. Tap send again." };
  }

  if ((data.attempts ?? 0) >= MAX_VERIFY_ATTEMPTS) {
    return { ok: false, error: "Too many wrong attempts. Tap send again." };
  }

  const expectedHash = hashOtp(code, phone);
  // timingSafeEqual to prevent leak via response timing
  const expectedBuf = Buffer.from(expectedHash, "hex");
  const providedBuf = Buffer.from(data.otp_hash, "hex");
  const matches =
    expectedBuf.length === providedBuf.length &&
    crypto.timingSafeEqual(expectedBuf, providedBuf);

  if (!matches) {
    await docRef.update({ attempts: FieldValue.increment(1) });
    return { ok: false, error: "Wrong code. Try again." };
  }

  await docRef.update({
    consumed: true,
    verified_at: new Date().toISOString(),
  });

  return { ok: true };
}
