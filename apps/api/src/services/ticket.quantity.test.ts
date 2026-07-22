import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveOrderQuantity, resolveGroupDiscount, validateAttendees } from "./ticket.service";

/**
 * Multi-quantity checkout math. Solo tiers multiply price by the requested
 * quantity; group (per_person) tiers keep their fixed headcount, full-pass
 * price, and legacy slack. Run with `npm -w @comeoffline/api run test:unit`.
 */

const solo = { price: 1800, sold: 10, capacity: 100 };
const squad = { per_person: 4, price: 6300, sold: 0, capacity: 40 };

test("default order: one ticket at tier price", () => {
  const o = resolveOrderQuantity(solo, undefined, 0, 1);
  assert.equal(o.quantity, 1);
  assert.equal(o.tierSubtotal, 1800);
  assert.equal(o.error, undefined);
});

test("solo tier multiplies price by requested quantity", () => {
  const o = resolveOrderQuantity(solo, 3, 0, 6);
  assert.equal(o.quantity, 3);
  assert.equal(o.tierSubtotal, 5400);
  assert.equal(o.error, undefined);
});

test("group tier ignores requested quantity — fixed headcount, full-pass price", () => {
  const o = resolveOrderQuantity(squad, 3, 0, 1);
  assert.equal(o.quantity, 4);
  assert.equal(o.tierSubtotal, 6300);
  assert.equal(o.error, undefined);
});

test("group tier keeps legacy slack against max_per_user=1", () => {
  const o = resolveOrderQuantity(squad, undefined, 0, 1);
  assert.equal(o.error, undefined);
  assert.equal(o.quantity, 4);
});

test("quantity beyond max_per_user is rejected with remaining count", () => {
  const o = resolveOrderQuantity(solo, 4, 1, 4);
  assert.match(o.error!, /Only 3 tickets allowed/);
});

test("existing tickets count against the per-user cap", () => {
  const o = resolveOrderQuantity(solo, 2, 3, 4);
  assert.match(o.error!, /Only 1 ticket allowed/);
});

test("quantity beyond tier capacity is rejected with tickets-left count", () => {
  const o = resolveOrderQuantity({ price: 1800, sold: 98, capacity: 100 }, 3, 0, 6);
  assert.match(o.error!, /Only 2 tickets left in this tier/);
});

test("single-quantity orders keep legacy behavior — no strict caps applied", () => {
  // sold >= capacity is caught earlier by the sold-out check, not here
  const o = resolveOrderQuantity({ price: 1800, sold: 99, capacity: 100 }, 1, 5, 1);
  assert.equal(o.error, undefined);
  assert.equal(o.quantity, 1);
});

test("garbage quantities clamp to 1", () => {
  assert.equal(resolveOrderQuantity(solo, 0, 0, 6).quantity, 1);
  assert.equal(resolveOrderQuantity(solo, -3, 0, 6).quantity, 1);
  assert.equal(resolveOrderQuantity(solo, 2.7, 0, 6).quantity, 2);
});

test("free tier with quantity stays free", () => {
  const o = resolveOrderQuantity({ price: 0, sold: 0, capacity: 100 }, 3, 0, 5);
  assert.equal(o.tierSubtotal, 0);
  assert.equal(o.quantity, 3);
});

test("no tier (free RSVP path) resolves to a single free spot", () => {
  const o = resolveOrderQuantity(null, undefined, 0, 1);
  assert.equal(o.quantity, 1);
  assert.equal(o.tierSubtotal, 0);
});

/* ── Group discount slabs ─────────────────────────── */

const SLABS = [
  { min_qty: 2, max_qty: 3, percent: 5 },
  { min_qty: 4, max_qty: 6, percent: 10 },
  { min_qty: 7, max_qty: null, percent: 15 },
];

test("slab picks the matching quantity band", () => {
  assert.deepEqual(resolveGroupDiscount(SLABS, 2, 3600), { percent: 5, amount: 180 });
  assert.deepEqual(resolveGroupDiscount(SLABS, 3, 5400), { percent: 5, amount: 270 });
  assert.deepEqual(resolveGroupDiscount(SLABS, 4, 7200), { percent: 10, amount: 720 });
});

test("open-ended slab covers everything above its min", () => {
  assert.equal(resolveGroupDiscount(SLABS, 12, 21600).percent, 15);
});

test("single ticket never gets a slab discount", () => {
  assert.deepEqual(resolveGroupDiscount(SLABS, 1, 1800), { percent: 0, amount: 0 });
});

test("no slabs configured → no discount", () => {
  assert.deepEqual(resolveGroupDiscount(undefined, 4, 7200), { percent: 0, amount: 0 });
  assert.deepEqual(resolveGroupDiscount([], 4, 7200), { percent: 0, amount: 0 });
});

test("quantity in a gap between slabs → no discount", () => {
  const gappy = [{ min_qty: 4, max_qty: 6, percent: 10 }];
  assert.equal(resolveGroupDiscount(gappy, 3, 5400).percent, 0);
});

test("overlapping slabs: best percent wins; garbage percents clamp", () => {
  const messy = [
    { min_qty: 2, max_qty: 6, percent: 5 },
    { min_qty: 4, max_qty: 6, percent: 10 },
    { min_qty: 2, max_qty: 10, percent: 300 },
    { min_qty: 2, max_qty: 10, percent: -5 },
  ];
  assert.equal(resolveGroupDiscount(messy, 5, 9000).percent, 100);
});

/* ── Guest details validation ─────────────────────── */

const guest = (over: Partial<{ name: string; dob: string; phone: string }> = {}) => ({
  name: "Aanya Rao",
  dob: "2000-03-15",
  phone: "9876543210",
  ...over,
});

test("quantity 1 needs no guests", () => {
  assert.deepEqual(validateAttendees(undefined, 1), { attendees: [] });
});

test("quantity N requires exactly N-1 guests", () => {
  assert.match(validateAttendees(undefined, 3).error!, /all 2 guests/);
  assert.match(validateAttendees([guest()], 3).error!, /all 2 guests/);
  assert.equal(validateAttendees([guest(), guest()], 3).error, undefined);
});

test("10-digit phones are normalized to 91-prefixed", () => {
  const r = validateAttendees([guest({ phone: "98765 43210" })], 2);
  assert.equal(r.attendees[0].phone, "919876543210");
});

test("already-prefixed phones pass through digits-only", () => {
  const r = validateAttendees([guest({ phone: "+91 98765 43210" })], 2);
  assert.equal(r.attendees[0].phone, "919876543210");
});

test("bad phone, missing name, and bad DOB are rejected with guest number", () => {
  assert.match(validateAttendees([guest({ phone: "12345" })], 2).error!, /Guest 2: enter a valid phone/);
  assert.match(validateAttendees([guest(), guest({ name: "  " })], 3).error!, /Guest 3: enter their name/);
  assert.match(validateAttendees([guest({ dob: "not-a-date" })], 2).error!, /Guest 2: enter a valid date/);
});

test("age gate applies to every guest", () => {
  const kid = guest({ dob: "2015-01-01" });
  assert.match(validateAttendees([guest(), kid], 3, 18).error!, /Guest 3: this event is 18\+/);
  assert.equal(validateAttendees([guest(), guest()], 3, 18).error, undefined);
});
