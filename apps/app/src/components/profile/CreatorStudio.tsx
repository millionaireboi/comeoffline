"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

/**
 * Creator studio — a creator's view of their own affiliate numbers, reachable
 * from the profile when their member account is linked to a creator record
 * (admin sets user_uid on the creator doc). Read-only: earnings compute
 * server-side, payouts are recorded by admin after manual UPI transfers.
 * Sales come pre-anonymized from the API — no buyer info ever reaches here.
 */

interface CreatorMe {
  handle: string;
  name: string;
  rate_per_ticket: number;
  activation_sales: number;
  discount_code: string | null;
  payouts: { amount: number; date: string; note?: string }[];
  earnings: {
    lifetime_seats: number;
    month_seats: number;
    activated: boolean;
    earned: number;
    paid: number;
    owed: number;
    recent_sales: { date: string; event_title: string; seats: number; via: "link" | "code" }[];
  };
}

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || "https://www.comeoffline.com";
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]">
      <p className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">{label}</p>
      <p className={`mt-1 font-serif text-[24px] leading-none ${accent ? "text-caramel" : "text-near-black"}`}>{value}</p>
    </div>
  );
}

export function CreatorStudio({ onClose }: { onClose: () => void }) {
  const { getIdToken, loading: authLoading } = useAuth();
  const [me, setMe] = useState<CreatorMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  const fetchMe = useCallback(async () => {
    setError(false);
    try {
      const token = await getIdToken();
      if (!token) {
        setError(true);
        setLoading(false);
        return;
      }
      const res = await apiFetch<{ success: boolean; data: CreatorMe }>("/api/creators/me", { token });
      if (res.data) setMe(res.data);
    } catch (err) {
      console.error("Failed to load creator studio:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (!authLoading) fetchMe();
  }, [authLoading, fetchMe]);

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const pageUrl = me ? `${LANDING_URL}/with/${me.handle}` : "";

  return (
    <div
      className="fixed inset-0 z-[500] overflow-y-auto bg-cream"
      style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
    >
      <Noise />

      <div className="sticky top-0 z-10 flex items-center justify-between bg-cream/95 px-5 pb-3 pt-6 backdrop-blur-sm">
        <button onClick={onClose} className="font-mono text-[11px] text-muted">
          ← back
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">creator studio</span>
        <span className="w-10" />
      </div>

      {loading ? (
        <div className="px-5 pt-6">
          <div className="h-24 animate-pulse rounded-[14px] bg-white/60" />
        </div>
      ) : error || !me ? (
        <p className="px-5 pt-10 text-center font-mono text-[12px] text-muted">
          couldn’t load your numbers — pull down or try again in a bit
        </p>
      ) : (
        <>
          {/* Earnings */}
          <section className="animate-fadeSlideUp px-5 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <Tile label="this month" value={`${me.earnings.month_seats} seats`} />
              <Tile label="lifetime" value={`${me.earnings.lifetime_seats} seats`} />
              <Tile label="earned" value={rupees(me.earnings.earned)} />
              <Tile label="owed to you" value={rupees(me.earnings.owed)} accent={me.earnings.owed > 0} />
            </div>
            {!me.earnings.activated && (
              <div className="mt-2 rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]">
                <p className="font-mono text-[10px] text-muted">
                  <span className="text-near-black">
                    {me.earnings.lifetime_seats}/{me.activation_sales}
                  </span>{" "}
                  seats to unlock payouts — once you cross, every seat from your first one pays{" "}
                  {rupees(me.rate_per_ticket)}.
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-caramel/15">
                  <div
                    className="h-full rounded-full bg-caramel transition-all"
                    style={{
                      width: `${Math.min(100, (me.earnings.lifetime_seats / Math.max(1, me.activation_sales)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <p className="mt-2 px-1 font-mono text-[9px] text-muted">
              {rupees(me.rate_per_ticket)} per confirmed seat · refunds don’t count · paid monthly by upi
            </p>
          </section>

          {/* Tools */}
          <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.1s" }}>
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">your tools</span>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => copy("link", pageUrl)}
                className="flex items-center justify-between rounded-[14px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
              >
                <div>
                  <p className="font-sans text-[14px] font-medium text-near-black">your invite page</p>
                  <p className="font-mono text-[10px] text-muted">{pageUrl.replace(/^https?:\/\//, "")}</p>
                </div>
                <span className="font-mono text-[10px] text-caramel">{copied === "link" ? "copied ✓" : "copy"}</span>
              </button>
              {me.discount_code && (
                <button
                  onClick={() => copy("code", me.discount_code as string)}
                  className="flex items-center justify-between rounded-[14px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                >
                  <div>
                    <p className="font-sans text-[14px] font-medium text-near-black">your code</p>
                    <p className="font-mono text-[10px] text-muted">
                      say it in reels — buyers get a discount, the sale counts for you
                    </p>
                  </div>
                  <span className="font-mono text-[12px] tracking-[2px] text-caramel">
                    {copied === "code" ? "copied ✓" : me.discount_code}
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Recent sales — anonymized */}
          <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.15s" }}>
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">recent sales</span>
            {me.earnings.recent_sales.length === 0 ? (
              <p className="rounded-[14px] bg-white/50 p-4 text-center font-mono text-[10px] text-muted">
                nothing yet — share your page and this fills up
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {me.earnings.recent_sales.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                  >
                    <div>
                      <p className="font-sans text-[13px] font-medium text-near-black">{s.event_title}</p>
                      <p className="font-mono text-[10px] text-muted">
                        {s.date} · via your {s.via}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-near-black">
                      {s.seats} seat{s.seats > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Payout history */}
          <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.2s" }}>
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">payouts</span>
            {me.payouts.length === 0 ? (
              <p className="rounded-[14px] bg-white/50 p-4 text-center font-mono text-[10px] text-muted">
                no payouts yet{me.earnings.owed > 0 ? ` — ${rupees(me.earnings.owed)} settles at month end` : ""}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...me.payouts].reverse().map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                  >
                    <div>
                      <p className="font-sans text-[13px] font-medium text-near-black">{rupees(p.amount)}</p>
                      {p.note && <p className="font-mono text-[10px] text-muted">{p.note}</p>}
                    </div>
                    <span className="font-mono text-[10px] text-muted">{p.date}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
