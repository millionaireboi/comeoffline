import { test } from "node:test";
import assert from "node:assert/strict";
import { tallyEarnings, resolveRate, type TallyTicket } from "./creators.service";

/**
 * The earnings engine encodes six founder-locked money rules. These tests
 * pin each one — run with `npm -w @comeoffline/api run test:unit`.
 */

const CREATOR = {
  rate_per_ticket: 150,
  rate_per_100_clicks: 100,
  activation_sales: 10,
  user_uid: "creator-uid" as string | null,
};

const NOW = "2026-07-22T12:00:00.000Z";

const ticket = (over: Partial<TallyTicket> = {}): TallyTicket => ({
  status: "confirmed",
  quantity: 1,
  purchased_at: "2026-07-20T10:00:00.000Z",
  event_id: "ev1",
  user_id: "someone-else",
  via: "link",
  ...over,
});

const TITLES = new Map([["ev1", "Friends House"]]);
const NO_RATES = new Map<string, number>();

function tally(tickets: TallyTicket[], opts: { rates?: Map<string, number>; clicks?: number; creator?: Partial<typeof CREATOR> } = {}) {
  return tallyEarnings({
    tickets,
    titles: TITLES,
    rates: opts.rates ?? NO_RATES,
    clicks: opts.clicks ?? 0,
    creator: { ...CREATOR, ...opts.creator },
    nowIso: NOW,
  });
}

test("refunded/cancelled/pending tickets never count", () => {
  const e = tally([
    ticket(),
    ticket({ status: "cancelled" }),
    ticket({ status: "pending_payment" }),
    ticket({ status: "refunded" }),
  ]);
  assert.equal(e.lifetime_seats, 1);
});

test("self-purchases earn nothing and don't advance activation", () => {
  const e = tally(Array.from({ length: 12 }, () => ticket({ user_id: "creator-uid" })));
  assert.equal(e.lifetime_seats, 0);
  assert.equal(e.activated, false);
  assert.equal(e.earned, 0);
});

test("below activation: sales tracked but nothing earned", () => {
  const e = tally(Array.from({ length: 9 }, () => ticket()));
  assert.equal(e.lifetime_seats, 9);
  assert.equal(e.activated, false);
  assert.equal(e.earned, 0);
});

test("activation is retroactive — crossing 10 pays from sale #1", () => {
  const e = tally(Array.from({ length: 10 }, () => ticket()));
  assert.equal(e.activated, true);
  assert.equal(e.sales_earned, 10 * 150);
});

test("quantity multiplies seats and commission", () => {
  const e = tally(Array.from({ length: 5 }, () => ticket({ quantity: 2 })));
  assert.equal(e.lifetime_seats, 10);
  assert.equal(e.sales_earned, 10 * 150);
});

test("campaign rate overrides default via contains-match, most specific wins", () => {
  assert.equal(resolveRate("Friends House — vol 2", new Map([["friends house", 250]]), 150), 250);
  assert.equal(
    resolveRate(
      "Friends House — vol 2",
      new Map([
        ["friends house", 250],
        ["friends house — vol 2", 400],
      ]),
      150
    ),
    400
  );
  assert.equal(resolveRate("Supper Club", new Map([["friends house", 250]]), 150), 150);
});

test("campaign rate applies to every sale of that event once activated", () => {
  const rates = new Map([["friends house", 250]]);
  const e = tally(Array.from({ length: 10 }, () => ticket()), { rates });
  assert.equal(e.sales_earned, 10 * 250);
  assert.equal(e.recent_sales[0].earned, 250);
});

test("clicks pay per completed block of 100, behind the same activation", () => {
  const inactive = tally(Array.from({ length: 5 }, () => ticket()), { clicks: 950 });
  assert.equal(inactive.click_earned, 0);
  const active = tally(Array.from({ length: 10 }, () => ticket()), { clicks: 950 });
  assert.equal(active.click_earned, 9 * 100); // 950 clicks = 9 completed blocks
  assert.equal(active.earned, active.sales_earned + active.click_earned);
});

test("click incentive off (rate 0) earns nothing regardless of clicks", () => {
  const e = tally(Array.from({ length: 10 }, () => ticket()), {
    clicks: 5000,
    creator: { rate_per_100_clicks: 0 },
  });
  assert.equal(e.click_earned, 0);
});

test("recent sales are newest first and never leak buyer info", () => {
  const e = tally([
    ticket({ purchased_at: "2026-07-01T10:00:00.000Z" }),
    ticket({ purchased_at: "2026-07-21T10:00:00.000Z" }),
  ]);
  assert.equal(e.recent_sales[0].date, "2026-07-21");
  for (const sale of e.recent_sales) {
    assert.deepEqual(Object.keys(sale).sort(), ["date", "earned", "event_title", "seats", "via"]);
  }
});
