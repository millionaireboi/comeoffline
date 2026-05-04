/**
 * WhatsApp Cloud API service
 *
 * Setup:
 *   1. Set WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_ACCESS_TOKEN in .env
 *   2. Templates must be approved in Meta Business Manager before use
 */

// Meta Graph API version. Bumped from v21.0 → v23.0 to match current Cloud API docs.
// Older versions are supported ~2 years; v23.0 keeps us on the latest stable.
const GRAPH_API_VERSION = "v23.0";

interface SendTemplateOptions {
  to: string; // E.164 without "+", e.g. "919663241658"
  templateName: string;
  languageCode?: string; // defaults to en_US
  bodyParams?: string[]; // injected as {{1}}, {{2}}, ...
  headerImageUrl?: string; // optional: public HTTPS URL for IMAGE-header templates
  headerImageId?: string;  // preferred: WhatsApp media_id from uploadMedia() — image stays private to Meta's servers
  // Button parameters by index. Required for AUTHENTICATION templates with a Copy-code or
  // URL button — the code (or URL fragment) must be passed alongside the body.
  buttonParamsByIndex?: Record<number, { subType: "url" | "copy_code" | "quick_reply"; text: string }>;
}

interface CloudApiSuccess {
  ok: true;
  messageId: string;
  /** Full JSON response from Meta — useful when debugging delivery */
  raw?: unknown;
}

interface CloudApiFailure {
  ok: false;
  error: string;
  code?: number;
  /** Meta error subcode + trace info if present */
  details?: unknown;
  /** HTTP status from Meta */
  httpStatus?: number;
}

export type CloudApiResult = CloudApiSuccess | CloudApiFailure;

function getCreds() {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!phoneNumberId || !accessToken) {
    throw new Error(
      "WhatsApp Cloud API not configured. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env",
    );
  }
  return { phoneNumberId, accessToken };
}

function getWabaCreds() {
  const wabaId = process.env.WHATSAPP_WABA_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  if (!wabaId || !accessToken) {
    throw new Error(
      "WHATSAPP_WABA_ID is not set. Find it in WhatsApp Manager → Account Tools → Settings (or in business.facebook.com URLs as waba_id=...)",
    );
  }
  return { wabaId, accessToken };
}

/** Normalize a phone number to Cloud API format (digits only, with country code, no +) */
export function normalizeRecipient(input: string): string {
  return input.replace(/[^\d]/g, "");
}

/** Send an approved WhatsApp template message */
export async function sendTemplate(opts: SendTemplateOptions): Promise<CloudApiResult> {
  const { phoneNumberId, accessToken } = getCreds();
  const to = normalizeRecipient(opts.to);

  const components: Array<Record<string, unknown>> = [];

  if (opts.headerImageId) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { id: opts.headerImageId } }],
    });
  } else if (opts.headerImageUrl) {
    components.push({
      type: "header",
      parameters: [{ type: "image", image: { link: opts.headerImageUrl } }],
    });
  }

  if (opts.bodyParams && opts.bodyParams.length > 0) {
    components.push({
      type: "body",
      parameters: opts.bodyParams.map((text) => ({ type: "text", text })),
    });
  }

  if (opts.buttonParamsByIndex) {
    for (const [indexStr, btn] of Object.entries(opts.buttonParamsByIndex)) {
      components.push({
        type: "button",
        sub_type: btn.subType,
        index: indexStr,
        parameters: [{ type: "text", text: btn.text }],
      });
    }
  }

  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "template",
    template: {
      name: opts.templateName,
      language: { code: opts.languageCode ?? "en_US" },
      ...(components.length > 0 ? { components } : {}),
    },
  };

  // Sanitized payload (omits any sensitive fields) for logging — currently identical to payload
  // but kept as a separate variable so we can redact OTP codes in the future if needed.
  const debugPayload = JSON.stringify(payload);

  try {
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/messages`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as {
      messaging_product?: string;
      contacts?: { input: string; wa_id: string }[];
      messages?: { id: string; message_status?: string }[];
      error?: {
        message?: string;
        type?: string;
        code?: number;
        error_subcode?: number;
        error_data?: { details?: string; messaging_product?: string };
        fbtrace_id?: string;
      };
    };

    if (!res.ok || data.error) {
      const message = data.error?.message || `HTTP ${res.status}`;
      const code = data.error?.code;
      console.error("[whatsapp] send error:", {
        httpStatus: res.status,
        code,
        subcode: data.error?.error_subcode,
        message,
        details: data.error?.error_data?.details,
        fbtrace_id: data.error?.fbtrace_id,
        template: opts.templateName,
        to,
        payload: debugPayload,
      });
      return {
        ok: false,
        error: message,
        code,
        httpStatus: res.status,
        details: data.error,
      };
    }

    const messageId = data.messages?.[0]?.id || "";
    const waId = data.contacts?.[0]?.wa_id;
    const inputPhone = data.contacts?.[0]?.input;
    console.log(
      `[whatsapp] sent template "${opts.templateName}" to ${to} → wamid=${messageId} ` +
        `wa_id=${waId ?? "n/a"} input=${inputPhone ?? "n/a"} status=${data.messages?.[0]?.message_status ?? "n/a"}`,
    );
    if (waId && waId.replace(/\D/g, "") !== to) {
      // Recipient resolved to a different WhatsApp account than the input — rare but worth flagging.
      console.warn(`[whatsapp] wa_id (${waId}) differs from normalized input (${to}) — recipient may be on a different number`);
    }
    return { ok: true, messageId, raw: data };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] network error:", { template: opts.templateName, to, message });
    return { ok: false, error: message };
  }
}

/**
 * Upload binary media (e.g. PNG buffer) to WhatsApp Cloud API and return a media_id that can
 * be referenced from a template's IMAGE/VIDEO/DOCUMENT header. Preferred over public URLs for
 * sensitive content (per-user QR codes, etc.) — the asset stays on Meta's servers and is only
 * deliverable through their messaging system.
 */
export async function uploadMedia(opts: {
  buffer: Buffer;
  mimeType: string; // e.g. "image/png"
  filename?: string;
}): Promise<{ ok: true; mediaId: string } | { ok: false; error: string }> {
  const { phoneNumberId, accessToken } = getCreds();

  const form = new FormData();
  form.append("messaging_product", "whatsapp");
  form.append("type", opts.mimeType);
  form.append(
    "file",
    new Blob([new Uint8Array(opts.buffer)], { type: opts.mimeType }),
    opts.filename ?? "file",
  );

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${phoneNumberId}/media`,
      { method: "POST", headers: { Authorization: `Bearer ${accessToken}` }, body: form },
    );
    const data = (await res.json()) as { id?: string; error?: { message?: string } };
    if (!res.ok || !data.id) {
      const message = data.error?.message ?? `HTTP ${res.status}`;
      console.error("[whatsapp] uploadMedia failed:", message);
      return { ok: false, error: message };
    }
    return { ok: true, mediaId: data.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[whatsapp] uploadMedia network error:", message);
    return { ok: false, error: message };
  }
}

/**
 * Send phone_otp template — fires from the WhatsApp OTP verification flow.
 * Uses Meta's AUTHENTICATION template category (faster approval, OTP-specific format).
 *
 * Meta-approved template structure:
 *   - Category: AUTHENTICATION
 *   - Body: "{{1}} is your come offline verification code. don't share it with anyone."
 *   - (Optional) Button: "Copy code" — auto-fills code on tap
 *
 * Body params:
 *   {{1}} the 6-digit code
 */
export async function sendPhoneOtp(args: {
  to: string;
  code: string;
}): Promise<CloudApiResult> {
  return sendTemplate({
    to: args.to,
    templateName: "phone_otp",
    languageCode: "en_US",
    bodyParams: [args.code],
    // Auth templates with Copy-code / URL button require the code as a button param too.
    // Meta surfaces the button as type "url" in the API even when shown as "Copy code" to users.
    buttonParamsByIndex: {
      0: { subType: "url", text: args.code },
    },
  });
}

/** Send venue_reveal template */
export async function sendVenueReveal(args: {
  to: string;
  firstName: string;
  eventName: string;
  address: string;
  time: string;
  url: string;
}): Promise<CloudApiResult> {
  return sendTemplate({
    to: args.to,
    templateName: "venue_reveal",
    languageCode: "en_US",
    bodyParams: [args.firstName, args.eventName, args.address, args.time, args.url],
  });
}

/**
 * Send ticket_confirmation template — fires when a ticket reaches "confirmed" status
 * (free events on creation, paid events from the Razorpay webhook).
 *
 * The framing is celebratory + soft nudge — NOT "complete profile to confirm booking",
 * because the booking is already confirmed. We use add-to-home-screen as the wrapper
 * for the profile completion + future-events ask.
 *
 * Meta-approved template structure:
 *   - Header: IMAGE (their ticket QR — sent dynamically per ticket)
 *   - Body:
 *       🎉 you're in, {{1}}!
 *
 *       your spot for {{2}} on {{3}} is locked. show this QR at the door.
 *
 *       add come offline to your home screen so you can stay in the loop,
 *       personalize your profile, and never miss future drops: {{4}}
 *
 *       see you on the night ✨
 *       — come offline
 *
 * Body params (must match the approved template exactly):
 *   {{1}} firstName
 *   {{2}} eventName
 *   {{3}} eventDate (human-readable, e.g. "Sat, May 4")
 *   {{4}} appUrl (deep link into the app)
 */
export async function sendTicketConfirmation(args: {
  to: string;
  firstName: string;
  eventName: string;
  eventDate: string;
  appUrl: string;
  qrMediaId: string; // from uploadMedia() — keeps the QR image private to Meta's servers
}): Promise<CloudApiResult> {
  return sendTemplate({
    to: args.to,
    templateName: "ticket_confirmation",
    languageCode: "en_US",
    headerImageId: args.qrMediaId,
    bodyParams: [args.firstName, args.eventName, args.eventDate, args.appUrl],
  });
}

// ────────────────────────────────────────────────────────────────────────────────
// Template management — list, fetch, delete via WABA edge.
// ────────────────────────────────────────────────────────────────────────────────

export type TemplateStatus =
  | "APPROVED"
  | "PENDING"
  | "REJECTED"
  | "PAUSED"
  | "DISABLED"
  | "IN_APPEAL"
  | "PENDING_DELETION"
  | string;

export type TemplateCategory = "UTILITY" | "MARKETING" | "AUTHENTICATION" | string;

export interface TemplateComponent {
  type: "HEADER" | "BODY" | "FOOTER" | "BUTTONS" | string;
  format?: "TEXT" | "IMAGE" | "VIDEO" | "DOCUMENT" | "LOCATION" | string;
  text?: string;
  buttons?: Array<{ type: string; text?: string; url?: string }>;
  example?: { body_text?: string[][]; header_text?: string[]; header_handle?: string[] };
}

export interface TemplateRecord {
  id: string;
  name: string;
  language: string;
  status: TemplateStatus;
  category: TemplateCategory;
  components: TemplateComponent[];
  /** ISO-ish; Meta returns Unix seconds via some endpoints, derived locally */
  last_updated_time?: string;
  rejected_reason?: string;
  quality_score?: { score?: string; date?: number };
}

interface ListTemplatesResponse {
  data?: TemplateRecord[];
  paging?: { cursors?: { before?: string; after?: string }; next?: string };
  error?: { message?: string; code?: number };
}

/**
 * List all message templates for the connected WhatsApp Business Account.
 * Paginated by Meta — we fetch up to `limit` per page, default 100. Pass `after` for next page.
 */
export async function listTemplates(opts: {
  limit?: number;
  after?: string;
} = {}): Promise<{ ok: true; templates: TemplateRecord[]; nextCursor?: string } | { ok: false; error: string }> {
  const { wabaId, accessToken } = getWabaCreds();
  const limit = opts.limit ?? 100;
  const params = new URLSearchParams({
    limit: String(limit),
    fields: "id,name,language,status,category,components,quality_score,rejected_reason",
  });
  if (opts.after) params.set("after", opts.after);

  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = (await res.json()) as ListTemplatesResponse;
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, templates: data.data ?? [], nextCursor: data.paging?.cursors?.after };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/** Get a single template by name — wraps listTemplates with a name filter. */
export async function getTemplate(
  name: string,
): Promise<{ ok: true; template: TemplateRecord | null } | { ok: false; error: string }> {
  const { wabaId, accessToken } = getWabaCreds();
  const params = new URLSearchParams({
    name,
    fields: "id,name,language,status,category,components,quality_score,rejected_reason",
  });
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?${params}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = (await res.json()) as ListTemplatesResponse;
    if (!res.ok || data.error) {
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true, template: data.data?.[0] ?? null };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Delete a template by name. Meta soft-deletes for 30 days, after which the name can be reused.
 * Note: deleting an APPROVED template stops you from sending it but doesn't recall messages already in flight.
 */
export async function deleteTemplate(
  name: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { wabaId, accessToken } = getWabaCreds();
  try {
    const res = await fetch(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${wabaId}/message_templates?name=${encodeURIComponent(name)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = (await res.json()) as { success?: boolean; error?: { message?: string } };
    if (!res.ok || data.error || !data.success) {
      return { ok: false, error: data.error?.message ?? `HTTP ${res.status}` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Extract the body variables ({{1}}, {{2}}, ...) declared in a template's BODY component
 * and return the count + the body text. Useful for dynamically rendering a "send test" form.
 */
export function templateVariableCount(template: TemplateRecord): {
  bodyText: string;
  bodyVarCount: number;
  hasImageHeader: boolean;
} {
  const body = template.components?.find((c) => c.type?.toUpperCase() === "BODY");
  const header = template.components?.find((c) => c.type?.toUpperCase() === "HEADER");
  const bodyText = body?.text ?? "";
  const matches = bodyText.match(/\{\{\d+\}\}/g) ?? [];
  const unique = new Set(matches).size;
  const hasImageHeader = (header?.format ?? "").toUpperCase() === "IMAGE";
  return { bodyText, bodyVarCount: unique, hasImageHeader };
}
