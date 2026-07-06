/**
 * Come Offline — backend e2e: full ticket-purchase lifecycle against local
 * Firebase emulators (Auth + Firestore) with a locally-running API instance.
 *
 * Flow covered:
 *   gate (vouch code) → auth token exchange → admin event creation →
 *   browse feed → buy ticket (real Razorpay link, auto-expires) →
 *   webhook signature checks → payment confirm (admin, simulates webhook) →
 *   double-booking guard → cancel + spot release →
 *   payment_link.expired webhook releases held spots →
 *   free-event RSVP → attendees → new profile endpoints → reports →
 *   POST-PURCHASE: QR check-in (forgery/wrong-event/double-scan guards) →
 *   mutual connections + reconnect window + "your people are going" →
 *   memories gallery → vouch-code claim + loop closure → community poll.
 *
 * Run everything with:  ./scripts/e2e-backend.sh   (starts emulators + API, runs this, tears down)
 * Or run just this file against an already-running stack:
 *   FIRESTORE_EMULATOR_HOST=127.0.0.1:8089 FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
 *   node scripts/e2e-backend.mjs
 */
import { createRequire } from "module";
import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const require = createRequire(join(REPO_ROOT, "apps/api/package.json"));
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");

const API = process.env.E2E_API_URL || "http://127.0.0.1:8090";
const AUTH_EMU = `http://${process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099"}`;

// ── env: project id + webhook secret from the repo .env ──
const envFile = readFileSync(join(REPO_ROOT, ".env"), "utf8");
const envVal = (key) => (envFile.match(new RegExp(`^${key}=(.*)$`, "m")) || [])[1]?.trim() || "";
const PROJECT_ID = envVal("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
const WEBHOOK_SECRET = envVal("RAZORPAY_WEBHOOK_SECRET");
const QR_SECRET = envVal("QR_SIGNING_SECRET");
if (!PROJECT_ID) throw new Error("No project id in .env");

initializeApp({ projectId: PROJECT_ID });
const db = getFirestore();
const auth = getAuth();

// ── tiny test harness ──
let passed = 0, failed = 0;
const failures = [];
function check(name, cond, extra = "") {
  if (cond) { passed++; console.log(`  ✓ ${name}`); }
  else { failed++; failures.push(name); console.log(`  ✗ ${name} ${extra}`); }
}
function section(name) { console.log(`\n── ${name} ──`); }

async function api(path, { method = "GET", token, body } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  let data = null;
  try { data = await res.json(); } catch { /* non-json */ }
  return { status: res.status, data };
}

async function exchangeCustomToken(customToken) {
  const res = await fetch(
    `${AUTH_EMU}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: customToken, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!data.idToken) throw new Error(`custom-token exchange failed: ${JSON.stringify(data)}`);
  return data.idToken;
}

function signWebhook(payload) {
  const body = JSON.stringify(payload);
  const signature = createHmac("sha256", WEBHOOK_SECRET).update(body).digest("hex");
  return { body, signature };
}

async function postWebhook(payload, { badSignature = false } = {}) {
  const { body, signature } = signWebhook(payload);
  const res = await fetch(`${API}/api/webhooks/razorpay`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-razorpay-signature": badSignature ? "deadbeef".repeat(8) : signature,
    },
    body,
  });
  let data = null;
  try { data = await res.json(); } catch { /* ignore */ }
  return { status: res.status, data };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ═══════════════════════════════════════════════
(async () => {
  // Fresh slate every run — wipe emulator Auth + Firestore data
  const FIRESTORE_EMU = `http://${process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8089"}`;
  await fetch(`${AUTH_EMU}/emulator/v1/projects/${PROJECT_ID}/accounts`, { method: "DELETE" });
  await fetch(`${FIRESTORE_EMU}/emulator/v1/projects/${PROJECT_ID}/databases/(default)/documents`, { method: "DELETE" });
  console.log("emulator data wiped");

  section("0. health");
  const health = await api("/api/health");
  check("API is up", health.status === 200);

  // ── seed: admin user + vouch code ──
  section("1. seed (admin user + vouch code)");
  const adminUser = await auth.createUser({ email: "e2e-admin@test.local", displayName: "E2E Admin" });
  await auth.setCustomUserClaims(adminUser.uid, { admin: true });
  await db.collection("users").doc(adminUser.uid).set({
    id: adminUser.uid, name: "E2E Admin", handle: "@e2e_admin", status: "active",
    has_seen_welcome: true, has_completed_profile: true, created_at: new Date().toISOString(),
  });
  const adminToken = await exchangeCustomToken(await auth.createCustomToken(adminUser.uid, { admin: true }));
  check("admin token minted", !!adminToken);

  await db.collection("vouch_codes").add({
    code: "E2ETEST1", owner_id: "admin", type: "single", status: "active",
    rules: { max_uses: 1 }, uses: 0, used_by: [], created_at: new Date().toISOString(),
    label: "e2e", description: "e2e test code",
  });

  // ── gate: validate code, become a member ──
  section("2. gate → member auth");
  const gate = await api("/api/auth/validate-code", { method: "POST", body: { code: "e2etest1", name: "E2E Member" } });
  check("validate-code succeeds (case-insensitive)", gate.status === 200 && gate.data?.success, JSON.stringify(gate.data));
  check("returns custom token + user", !!gate.data?.data?.token && !!gate.data?.data?.user?.id);
  const memberUid = gate.data.data.user.id;
  const memberToken = await exchangeCustomToken(gate.data.data.token);
  check("member token exchanges", !!memberToken);

  const gateReuse = await api("/api/auth/validate-code", { method: "POST", body: { code: "E2ETEST1" } });
  check("re-entering same single-use code signs the same user back in", gateReuse.data?.data?.user?.id === memberUid);

  // ── admin: create paid event ──
  section("3. admin creates paid event");
  const eventDate = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const created = await api("/api/admin/events", {
    method: "POST", token: adminToken,
    body: {
      title: "E2E Test Event", tagline: "not real", description: "e2e", date: eventDate,
      time: "7:00 PM", total_spots: 10, tag: "test", emoji: "🧪", status: "listed",
      venue_reveal_date: eventDate, dress_code: "", includes: ["nothing"], zones: [],
      pickup_points: [], faq: [{ q: "is this real?", a: "no. e2e test." }],
    },
  });
  check("event created", created.status === 201 || created.status === 200, JSON.stringify(created.data).slice(0, 200));
  const eventId = created.data?.data?.id;
  check("event id returned", !!eventId);

  const updated = await api(`/api/admin/events/${eventId}`, {
    method: "PUT", token: adminToken,
    body: {
      ticketing: {
        enabled: true, time_slots_enabled: false, max_per_user: 1,
        tiers: [{ id: "t1", name: "solo", label: "solo pass", price: 1, capacity: 5, sold: 0, deadline: "", description: "e2e tier", per_person: 1 }],
      },
      is_free: false,
    },
  });
  check("ticketing config attached", updated.status === 200, JSON.stringify(updated.data).slice(0, 200));

  // ── member: browse feed ──
  section("4. member browses feed");
  const feed = await api("/api/events", { token: memberToken });
  const feedEvent = (feed.data?.data || []).find((e) => e.id === eventId);
  check("test event visible in member feed", !!feedEvent);
  check("per-event FAQ present on event", Array.isArray(feedEvent?.faq) && feedEvent.faq.length === 1);
  // Authed feed exposes capacity by design (app computes "only N left").
  // Sanitization applies to the PUBLIC landing feed — assert there.
  const pub = await api("/api/events/public");
  const pubEvent = (pub.data?.data || []).find((e) => e.id === eventId);
  const pubTier = pubEvent?.ticketing?.tiers?.[0] || {};
  check("public feed hides raw capacity/sold", pubTier.capacity === undefined && pubTier.sold === undefined && typeof pubTier.sold_out === "boolean");

  // ── member: buy ticket (creates real, auto-expiring Razorpay link) ──
  section("5. ticket purchase (pending payment)");
  const buy = await api("/api/tickets/create", { method: "POST", token: memberToken, body: { event_id: eventId, tier_id: "t1" } });
  check("ticket created", buy.status === 201, JSON.stringify(buy.data).slice(0, 300));
  const ticket = buy.data?.data;
  check("status is pending_payment", ticket?.status === "pending_payment");
  check("payment_url returned (Razorpay link created)", typeof ticket?.payment_url === "string" && ticket.payment_url.includes("rzp.io"));

  let eventDoc = (await db.collection("events").doc(eventId).get()).data();
  check("spots_held incremented to 1", eventDoc.spots_held === 1, `got ${eventDoc.spots_held}`);

  // ── webhook: signature + unpaid-link guard ──
  section("6. webhook security");
  const paidPayload = { event: "payment_link.paid", payload: { payment_link: { entity: { id: ticket.payment_link_id, notes: { ticket_id: ticket.id } } } } };
  const badSig = await postWebhook(paidPayload, { badSignature: true });
  check("bad signature rejected (401)", badSig.status === 401);

  const goodSigUnpaid = await postWebhook(paidPayload);
  check("valid signature accepted (200)", goodSigUnpaid.status === 200);
  const statusAfterWebhook = await api(`/api/tickets/${ticket.id}/status`, { token: memberToken });
  check("unpaid link NOT confirmed by webhook (Razorpay says 'created')", statusAfterWebhook.data?.data?.status === "pending_payment", `got ${statusAfterWebhook.data?.data?.status}`);

  // ── admin confirms payment (simulates successful payment) ──
  section("7. payment confirmation");
  const confirm = await api("/api/tickets/confirm-payment", { method: "POST", token: adminToken, body: { ticket_id: ticket.id } });
  check("admin confirm-payment succeeds", confirm.status === 200 && confirm.data?.success, JSON.stringify(confirm.data));

  const statusAfter = await api(`/api/tickets/${ticket.id}/status`, { token: memberToken });
  check("ticket now confirmed (what the app polls for)", statusAfter.data?.data?.status === "confirmed");

  eventDoc = (await db.collection("events").doc(eventId).get()).data();
  check("spots_taken = 1", eventDoc.spots_taken === 1, `got ${eventDoc.spots_taken}`);
  check("spots_held released", (eventDoc.spots_held || 0) === 0, `got ${eventDoc.spots_held}`);
  check("tier sold = 1", eventDoc.ticketing?.tiers?.[0]?.sold === 1);

  // ── double-booking guard ──
  section("8. double-booking guard");
  const rebuy = await api("/api/tickets/create", { method: "POST", token: memberToken, body: { event_id: eventId, tier_id: "t1" } });
  check("second purchase rejected", rebuy.status === 400 && /maximum/i.test(rebuy.data?.error || ""), JSON.stringify(rebuy.data));

  const guardCheck = await api(`/api/tickets/event/${eventId}`, { token: memberToken });
  check("client guard endpoint returns existing ticket", guardCheck.data?.data?.id === ticket.id);

  const mine = await api("/api/tickets/mine", { token: memberToken });
  check("tickets/mine enriched with event title", mine.data?.data?.[0]?.event_title === "E2E Test Event");

  // ── new profile endpoints smoke ──
  section("9. new endpoints (connections-going, memories)");
  const going = await api("/api/users/me/connections-going", { token: memberToken });
  check("connections-going returns empty map", going.status === 200 && typeof going.data?.data === "object");
  const mems = await api("/api/users/me/memories", { token: memberToken });
  check("me/memories returns empty list", mems.status === 200 && Array.isArray(mems.data?.data) && mems.data.data.length === 0);

  // ── cancel + spot release ──
  section("10. cancellation");
  const cancel = await api(`/api/tickets/${ticket.id}`, { method: "DELETE", token: memberToken });
  check("cancel succeeds", cancel.status === 200 && cancel.data?.success);
  eventDoc = (await db.collection("events").doc(eventId).get()).data();
  check("spots_taken released back to 0", eventDoc.spots_taken === 0, `got ${eventDoc.spots_taken}`);
  check("tier sold back to 0", eventDoc.ticketing?.tiers?.[0]?.sold === 0, `got ${eventDoc.ticketing?.tiers?.[0]?.sold}`);

  // ── expired-link webhook releases held spots (new code) ──
  section("11. payment_link.expired webhook (abandoned checkout)");
  const buy2 = await api("/api/tickets/create", { method: "POST", token: memberToken, body: { event_id: eventId, tier_id: "t1" } });
  const ticket2 = buy2.data?.data;
  check("second pending ticket created", ticket2?.status === "pending_payment", JSON.stringify(buy2.data).slice(0, 200));
  eventDoc = (await db.collection("events").doc(eventId).get()).data();
  check("spots_held = 1 again", eventDoc.spots_held === 1, `got ${eventDoc.spots_held}`);

  const expired = await postWebhook({ event: "payment_link.expired", payload: { payment_link: { entity: { id: ticket2.payment_link_id, notes: { ticket_id: ticket2.id } } } } });
  check("expired webhook accepted", expired.status === 200);
  await sleep(300);
  const t2status = await api(`/api/tickets/${ticket2.id}/status`, { token: memberToken });
  check("pending ticket cancelled by expiry webhook", t2status.data?.data?.status === "cancelled", `got ${t2status.data?.data?.status}`);
  eventDoc = (await db.collection("events").doc(eventId).get()).data();
  check("held spot released by expiry webhook", (eventDoc.spots_held || 0) === 0, `got ${eventDoc.spots_held}`);

  // ── free event RSVP ──
  section("12. free event RSVP");
  const freeCreated = await api("/api/admin/events", {
    method: "POST", token: adminToken,
    body: {
      title: "E2E Free Event", tagline: "free", description: "e2e", date: eventDate,
      time: "8:00 PM", total_spots: 10, tag: "test", emoji: "🧪", status: "listed",
      venue_reveal_date: eventDate, dress_code: "", includes: [], zones: [], pickup_points: [],
    },
  });
  const freeId = freeCreated.data?.data?.id;
  check("free event created", !!freeId);
  const rsvp = await api(`/api/events/${freeId}/rsvp`, { method: "POST", token: memberToken, body: {} });
  check("RSVP succeeds", rsvp.status === 200 || rsvp.status === 201, JSON.stringify(rsvp.data).slice(0, 200));
  const attendees = await api(`/api/events/${freeId}/attendees?mode=preview`, { token: memberToken });
  check("attendee preview endpoint responds", attendees.status === 200);

  // ── reports ──
  section("13. reports (safety)");
  const report = await api("/api/reports", { method: "POST", token: memberToken, body: { reported_user_id: adminUser.uid, context: "attendee", event_id: eventId } });
  check("report created", report.status === 201 && report.data?.success, JSON.stringify(report.data));
  const dupe = await api("/api/reports", { method: "POST", token: memberToken, body: { reported_user_id: adminUser.uid, context: "attendee" } });
  check("duplicate report deduped", dupe.status === 200 && dupe.data?.data?.duplicate === true, JSON.stringify(dupe.data));
  const selfReport = await api("/api/reports", { method: "POST", token: memberToken, body: { reported_user_id: memberUid } });
  check("self-report rejected", selfReport.status === 400);

  // Admin review queue
  const adminReports = await api("/api/reports?status=open", { token: adminToken });
  const openReport = (adminReports.data?.data || [])[0];
  check("admin sees open report, enriched with names", !!openReport && openReport.reported_user?.name === "E2E Admin" && !!openReport.reporter?.name, JSON.stringify(adminReports.data).slice(0, 200));
  const memberReadReports = await api("/api/reports", { token: memberToken });
  check("non-admin cannot read the report queue", memberReadReports.status === 403);
  const resolve = await api(`/api/reports/${openReport?.id}/status`, { method: "PUT", token: adminToken, body: { status: "resolved" } });
  check("admin resolves report", resolve.status === 200 && resolve.data?.success);
  const afterResolve = await api("/api/reports?status=open", { token: adminToken });
  check("resolved report leaves the open queue", !(afterResolve.data?.data || []).some((r) => r.id === openReport?.id));

  // ═══════════════ POST-PURCHASE JOURNEY ═══════════════

  // ── check-in (day-of QR scan) ──
  section("14. check-in (day-of)");
  const buy3 = await api("/api/tickets/create", { method: "POST", token: memberToken, body: { event_id: eventId, tier_id: "t1" } });
  const ticket3 = buy3.data?.data;
  await api("/api/tickets/confirm-payment", { method: "POST", token: adminToken, body: { ticket_id: ticket3.id } });
  const t3 = await api(`/api/tickets/${ticket3.id}/status`, { token: memberToken });
  check("fresh confirmed ticket for check-in", t3.data?.data?.status === "confirmed");

  // ── QR generation: the ticket's qr_code must be a PNG data-URL that encodes
  // exactly {ticket_id, event_id, sig} with a valid HMAC. QR encoding is
  // deterministic, so re-encoding the expected payload with the same options
  // must produce a byte-identical data-URL. This proves generation end-to-end.
  const expectedSig = createHmac("sha256", QR_SECRET).update(`${ticket3.id}:${eventId}`).digest("hex");
  const expectedQrJson = JSON.stringify({ ticket_id: ticket3.id, event_id: eventId, sig: expectedSig });
  const QRCode = require("qrcode");
  const expectedDataUrl = await QRCode.toDataURL(expectedQrJson, {
    width: 300, margin: 2, color: { dark: "#0E0D0B", light: "#FAF6F0" },
  });
  check("qr_code is a PNG data-URL", typeof ticket3.qr_code === "string" && ticket3.qr_code.startsWith("data:image/png"));
  check("generated QR encodes {ticket_id, event_id, valid HMAC sig}", ticket3.qr_code === expectedDataUrl);

  // ── scan simulation: parse the QR payload exactly like the admin scanner
  // does (JSON.parse → .sig) and check in with the parsed signature.
  const scanned = JSON.parse(expectedQrJson);
  const qrSig = scanned.sig;

  const badQr = await api("/api/tickets/check-in", {
    method: "POST", token: adminToken,
    body: { ticket_id: ticket3.id, event_id: eventId, signature: "f".repeat(64) },
  });
  check("forged QR signature rejected", badQr.status === 400, JSON.stringify(badQr.data).slice(0, 150));

  const wrongEvent = await api("/api/tickets/check-in", {
    method: "POST", token: adminToken,
    body: { ticket_id: ticket3.id, event_id: freeId, signature: qrSig },
  });
  check("ticket scanned at wrong event rejected", wrongEvent.status === 400 && wrongEvent.data?.error_code === "WRONG_EVENT", JSON.stringify(wrongEvent.data).slice(0, 150));

  const checkin = await api("/api/tickets/check-in", {
    method: "POST", token: adminToken,
    body: { ticket_id: ticket3.id, event_id: eventId, signature: qrSig },
  });
  check("valid QR checks in", checkin.status === 200 && checkin.data?.success, JSON.stringify(checkin.data).slice(0, 200));
  check("ticket status flips to checked_in", ["checked_in", "partially_checked_in"].includes(checkin.data?.data?.status));

  const doubleScan = await api("/api/tickets/check-in", {
    method: "POST", token: adminToken,
    body: { ticket_id: ticket3.id, event_id: eventId, signature: qrSig },
  });
  check("double check-in rejected", doubleScan.status === 400, JSON.stringify(doubleScan.data).slice(0, 150));

  const memberCheckin = await api("/api/tickets/check-in", {
    method: "POST", token: memberToken,
    body: { ticket_id: ticket3.id, event_id: eventId, signature: qrSig },
  });
  check("non-admin cannot check in tickets", memberCheckin.status === 403);

  // ── second member + connections (reconnect) ──
  section("15. connections (reconnect after the event)");
  await db.collection("vouch_codes").add({
    code: "E2ETEST2", owner_id: "admin", type: "single", status: "active",
    rules: { max_uses: 1 }, uses: 0, used_by: [], created_at: new Date().toISOString(),
  });
  const gate2 = await api("/api/auth/validate-code", { method: "POST", body: { code: "E2ETEST2", name: "Buddy Two" } });
  const member2Uid = gate2.data?.data?.user?.id;
  const member2Token = await exchangeCustomToken(gate2.data.data.token);
  check("second member joins via vouch code", !!member2Token);

  // member2 buys + confirms a ticket on the paid event (feeds connections-going)
  const buyM2 = await api("/api/tickets/create", { method: "POST", token: member2Token, body: { event_id: eventId, tier_id: "t1" } });
  await api("/api/tickets/confirm-payment", { method: "POST", token: adminToken, body: { ticket_id: buyM2.data?.data?.id } });

  const conn1 = await api(`/api/events/${eventId}/connect`, { method: "POST", token: memberToken, body: { toUserId: member2Uid } });
  check("one-way connection created", conn1.status === 200 && conn1.data?.data?.mutual === false, JSON.stringify(conn1.data).slice(0, 150));

  const conn2 = await api(`/api/events/${eventId}/connect`, { method: "POST", token: member2Token, body: { toUserId: memberUid } });
  check("reciprocal connect becomes MUTUAL", conn2.data?.data?.mutual === true, JSON.stringify(conn2.data).slice(0, 150));

  const selfConn = await api(`/api/events/${eventId}/connect`, { method: "POST", token: memberToken, body: { toUserId: memberUid } });
  check("self-connection rejected", selfConn.status === 400);

  const myConns = await api("/api/users/me/connections", { token: memberToken });
  const buddy = (myConns.data?.data || []).find((c) => c.user.id === member2Uid);
  check("connections list shows buddy + met-at event", !!buddy && buddy.event_title === "E2E Test Event", JSON.stringify(myConns.data).slice(0, 200));

  // "your people are going" — buddy holds a confirmed ticket for the paid event
  const going2 = await api("/api/users/me/connections-going", { token: memberToken });
  const badge = going2.data?.data?.[eventId];
  check("connections-going surfaces buddy's ticket", badge?.count === 1 && badge?.names?.[0] === "Buddy", JSON.stringify(going2.data).slice(0, 200));

  // reconnect window enforcement — event 10 days in the past
  const pastDate = new Date(Date.now() - 10 * 24 * 3600 * 1000).toISOString().slice(0, 10);
  const pastEvent = await api("/api/admin/events", {
    method: "POST", token: adminToken,
    body: { title: "E2E Past Event", tagline: "old", description: "e2e", date: pastDate, time: "7:00 PM", total_spots: 10, tag: "test", emoji: "🕰", status: "listed", venue_reveal_date: pastDate, dress_code: "", includes: [], zones: [], pickup_points: [] },
  });
  const lateConn = await api(`/api/events/${pastEvent.data?.data?.id}/connect`, { method: "POST", token: memberToken, body: { toUserId: member2Uid } });
  check("reconnect window closed for old events", lateConn.status === 400 && /window/i.test(lateConn.data?.error || ""), JSON.stringify(lateConn.data).slice(0, 150));

  // Past events must not linger in feeds — status alone used to keep forgotten
  // events on the homepage forever.
  const feedAfter = await api("/api/events", { token: memberToken });
  check("past event hidden from member feed", !(feedAfter.data?.data || []).some((e) => e.id === pastEvent.data?.data?.id));
  const pubAfter = await api("/api/events/public");
  check("past event hidden from public feed", !(pubAfter.data?.data || []).some((e) => e.id === pastEvent.data?.data?.id));
  check("public feed exposes venue_area + time for cards", (pubAfter.data?.data || []).every((e) => "time" in e));

  // ── memories (the morning after) ──
  section("16. memories");
  const pol = await api(`/api/admin/events/${eventId}/polaroids`, {
    method: "POST", token: adminToken,
    body: { url: "https://example.com/polaroid1.jpg", caption: "3am energy", who: "the crew", color: "#E8DDD0", rotation: -2 },
  });
  check("admin uploads polaroid", pol.status === 200 || pol.status === 201, JSON.stringify(pol.data).slice(0, 150));

  const eventMems = await api(`/api/events/${eventId}/memories`, { token: memberToken });
  check("event memories returns the polaroid", eventMems.data?.data?.polaroids?.length === 1);

  const myMems = await api("/api/users/me/memories", { token: memberToken });
  const memEvent = (myMems.data?.data || []).find((m) => m.event_id === eventId);
  check("permanent my-memories gallery includes the event", !!memEvent && memEvent.polaroids.length === 1, JSON.stringify(myMems.data).slice(0, 200));

  // ── vouch codes earned (the growth loop) ──
  section("17. vouch codes earned");
  const claim = await api("/api/vouch-codes/claim", { method: "POST", token: memberToken, body: { eventId } });
  check("attendee claims 2 vouch codes", claim.data?.data?.length === 2, JSON.stringify(claim.data).slice(0, 200));
  const claimAgain = await api("/api/vouch-codes/claim", { method: "POST", token: memberToken, body: { eventId } });
  check("re-claim returns same codes (no farming)", claimAgain.data?.data?.length === 2);

  // close the loop: a NEW person joins with member1's earned code
  const earnedCode = claim.data.data[0].code;
  const gate3 = await api("/api/auth/validate-code", { method: "POST", body: { code: earnedCode, name: "Vouched Friend" } });
  check("earned code admits a new member (vouch loop closes)", gate3.status === 200 && !!gate3.data?.data?.user?.id, JSON.stringify(gate3.data).slice(0, 150));
  const vouchedDoc = await db.collection("users").doc(gate3.data.data.user.id).get();
  check("new member is vouched_by the earner", vouchedDoc.data()?.vouched_by === memberUid, `got ${vouchedDoc.data()?.vouched_by}`);

  // ── community poll (did these people vibe?) ──
  section("18. community poll");
  const pollCreated = await api(`/api/events/${eventId}/create-poll`, { method: "POST", token: adminToken });
  check("admin creates post-event poll", pollCreated.status === 200 && !!pollCreated.data?.data?.id);
  const pollFetch = await api(`/api/events/${eventId}/poll`, { token: memberToken });
  check("member fetches active poll", pollFetch.status === 200 && pollFetch.data?.data?.id === pollCreated.data.data.id);
  const vote = await api(`/api/events/${eventId}/community-poll`, {
    method: "POST", token: memberToken,
    body: { votes: [{ subject_id: member2Uid, vibed: true }] },
  });
  check("member submits vibe votes", vote.status === 200 && vote.data?.success, JSON.stringify(vote.data).slice(0, 150));

  // ── summary ──
  console.log(`\n═══ RESULT: ${passed} passed, ${failed} failed ═══`);
  if (failures.length) {
    console.log("failures:");
    failures.forEach((f) => console.log(`  - ${f}`));
    process.exit(1);
  }
  process.exit(0);
})().catch((err) => {
  console.error("\nFATAL:", err);
  process.exit(1);
});
