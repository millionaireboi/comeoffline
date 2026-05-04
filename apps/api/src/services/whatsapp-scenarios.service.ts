/**
 * WhatsApp scenario registry — maps platform events ("scenarios") to approved templates.
 *
 * Each scenario is a business moment (RSVP confirmed, venue revealed, etc.). Admins can:
 *   - Toggle a scenario ON/OFF (kill-switch)
 *   - Override which approved template handles it (e.g. switch from v1 → v2)
 *   - Fire a test send for QA
 *
 * Defaults live in code (SCENARIOS). Per-scenario overrides live in Firestore at
 * `whatsapp_scenarios/{key}` so changes persist and propagate across instances.
 */

import { getDb } from "../config/firebase-admin";

export type TriggerKind = "auto" | "manual" | "cron";

export interface ScenarioDefinition {
  key: string;
  label: string;
  description: string;
  trigger: TriggerKind;
  /** Default approved template name. Admin can override via Firestore. */
  defaultTemplate: string;
  /** Names of body params the template expects, in order — used for sample data + UI labels. */
  paramNames: string[];
  /** Whether this scenario uses a template with an IMAGE header (e.g. payment_confirmed → QR). */
  hasImageHeader?: boolean;
  /** Sample values for test sends. */
  sampleParams: string[];
}

/**
 * Canonical list of scenarios. Order here determines display order in the admin UI.
 *
 * The values match the templates we've submitted to Meta for approval — keep them in sync.
 */
export const SCENARIOS: ScenarioDefinition[] = [
  {
    key: "phone_otp",
    label: "Phone OTP",
    description: "Login / PIN-reset OTP for member auth.",
    trigger: "auto",
    defaultTemplate: "phone_otp",
    paramNames: ["6-digit code"],
    sampleParams: ["482917"],
  },
  {
    key: "rsvp_confirmed",
    label: "RSVP confirmed (free events)",
    description: "Fires when a member RSVPs to a free event.",
    trigger: "auto",
    defaultTemplate: "rsvp_confirmed",
    paramNames: ["First name", "Event name", "Date/time", "Event URL"],
    sampleParams: [
      "Aanya",
      "Sunday Slow Brunch",
      "Sun, 4 May · 11:00 AM",
      "https://comeoffline.com/events/sample",
    ],
  },
  {
    key: "payment_confirmed",
    label: "Payment confirmed (paid tickets)",
    description: "Fires when Razorpay confirms payment. Includes QR as image header.",
    trigger: "auto",
    defaultTemplate: "payment_confirmed",
    paramNames: ["First name", "Event name", "Amount", "Ticket URL"],
    hasImageHeader: true,
    sampleParams: [
      "Aanya",
      "Sunday Slow Brunch",
      "₹999",
      "https://comeoffline.com/tickets/sample",
    ],
  },
  {
    key: "venue_revealed",
    label: "Venue revealed",
    description: "Manual broadcast when admin publishes the venue for an event.",
    trigger: "manual",
    defaultTemplate: "venue_reveal",
    paramNames: ["First name", "Event name", "Address", "Date/time", "Event URL"],
    sampleParams: [
      "Aanya",
      "Sunday Slow Brunch",
      "HSR Layout, Bengaluru",
      "Sun, 4 May · 11:00 AM",
      "https://comeoffline.com/events/sample",
    ],
  },
  {
    key: "event_reminder_day_before",
    label: "T-24h reminder",
    description: "Cron-fired the day before an event for confirmed attendees.",
    trigger: "cron",
    defaultTemplate: "event_reminder_day_before_v2",
    paramNames: ["First name", "Event name", "Time", "Latest details URL"],
    sampleParams: [
      "Aanya",
      "Sunday Slow Brunch",
      "11:00 AM",
      "https://comeoffline.com/events/sample",
    ],
  },
  {
    key: "event_changed",
    label: "Event changed",
    description: "Manual broadcast when time / venue / agenda changes after RSVP.",
    trigger: "manual",
    defaultTemplate: "event_changed",
    paramNames: ["First name", "Event name", "What changed", "Latest details URL"],
    sampleParams: [
      "Aanya",
      "Sunday Slow Brunch",
      "Time changed to 1:00 PM",
      "https://comeoffline.com/events/sample",
    ],
  },
  {
    key: "event_cancelled",
    label: "Event cancelled",
    description: "Manual broadcast when admin cancels an event. Includes refund note.",
    trigger: "manual",
    defaultTemplate: "event_cancelled",
    paramNames: ["First name", "Event name", "Reason", "Refund / next-steps URL"],
    sampleParams: [
      "Aanya",
      "Sunday Slow Brunch",
      "Venue is unavailable",
      "https://comeoffline.com/events/sample",
    ],
  },
  {
    key: "memories_ready",
    label: "Memories ready",
    description: "Manual fire after photos are uploaded post-event.",
    trigger: "manual",
    defaultTemplate: "memories_ready",
    paramNames: ["First name", "Event name", "Memories URL"],
    sampleParams: [
      "Aanya",
      "Sunday Slow Brunch",
      "https://comeoffline.com/memories/sample",
    ],
  },
  {
    key: "add_to_home_screen",
    label: "Add to home screen",
    description: "Cron-fired ~24h after first ticket confirmation, only for users who haven't installed the PWA yet.",
    trigger: "cron",
    defaultTemplate: "add_to_home_screen",
    paramNames: ["First name", "Install URL"],
    sampleParams: [
      "Aanya",
      "https://app.comeoffline.com/install",
    ],
  },
];

export interface ScenarioState {
  /** Definition (label, trigger, defaults). */
  key: string;
  label: string;
  description: string;
  trigger: TriggerKind;
  paramNames: string[];
  sampleParams: string[];
  hasImageHeader: boolean;

  /** Live state — overrides + history. */
  enabled: boolean;
  templateName: string;
  lastFiredAt: string | null;
  lastFiredBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

interface ScenarioOverride {
  enabled?: boolean;
  template_name?: string;
  last_fired_at?: string;
  last_fired_by?: string;
  updated_at?: string;
  updated_by?: string;
}

const COLLECTION = "whatsapp_scenarios";

function applyOverride(def: ScenarioDefinition, override: ScenarioOverride | null): ScenarioState {
  return {
    key: def.key,
    label: def.label,
    description: def.description,
    trigger: def.trigger,
    paramNames: def.paramNames,
    sampleParams: def.sampleParams,
    hasImageHeader: def.hasImageHeader ?? false,

    enabled: override?.enabled ?? true,
    templateName: override?.template_name ?? def.defaultTemplate,
    lastFiredAt: override?.last_fired_at ?? null,
    lastFiredBy: override?.last_fired_by ?? null,
    updatedAt: override?.updated_at ?? null,
    updatedBy: override?.updated_by ?? null,
  };
}

/** List all scenarios with current overrides merged in. */
export async function listScenarios(): Promise<ScenarioState[]> {
  const db = await getDb();
  const snap = await db.collection(COLLECTION).get();
  const overrides = new Map<string, ScenarioOverride>();
  for (const doc of snap.docs) overrides.set(doc.id, doc.data() as ScenarioOverride);
  return SCENARIOS.map((def) => applyOverride(def, overrides.get(def.key) ?? null));
}

/** Single scenario lookup. */
export async function getScenario(key: string): Promise<ScenarioState | null> {
  const def = SCENARIOS.find((s) => s.key === key);
  if (!def) return null;
  const db = await getDb();
  const doc = await db.collection(COLLECTION).doc(key).get();
  return applyOverride(def, doc.exists ? (doc.data() as ScenarioOverride) : null);
}

/** Update enabled or template_name for a scenario. */
export async function updateScenario(
  key: string,
  patch: { enabled?: boolean; templateName?: string },
  uid: string,
): Promise<ScenarioState | null> {
  const def = SCENARIOS.find((s) => s.key === key);
  if (!def) return null;
  const db = await getDb();
  const update: ScenarioOverride = {
    updated_at: new Date().toISOString(),
    updated_by: uid,
  };
  if (typeof patch.enabled === "boolean") update.enabled = patch.enabled;
  if (typeof patch.templateName === "string" && patch.templateName.trim().length > 0) {
    update.template_name = patch.templateName.trim();
  }
  await db.collection(COLLECTION).doc(key).set(update, { merge: true });
  return getScenario(key);
}

/** Stamp last_fired_at — called by send pipelines after a successful Cloud API send. */
export async function recordScenarioFired(key: string, uid: string | null = null): Promise<void> {
  const db = await getDb();
  await db.collection(COLLECTION).doc(key).set(
    {
      last_fired_at: new Date().toISOString(),
      last_fired_by: uid,
    },
    { merge: true },
  );
}

/** Quick check — used by send pipelines to short-circuit when a scenario is OFF. */
export async function isScenarioEnabled(key: string): Promise<boolean> {
  const state = await getScenario(key);
  return state?.enabled ?? true;
}

/** Used by send pipelines to discover which template name to use for a scenario. */
export async function getMappedTemplate(key: string): Promise<string | null> {
  const state = await getScenario(key);
  return state?.templateName ?? null;
}
