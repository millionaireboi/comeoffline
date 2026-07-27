"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { phoneVerifyOff } from "@/lib/phone-verify";

const DONE_KEY = "co_pin_nudge_done";
const SNOOZE_KEY = "co_pin_nudge_snooze_until";

/**
 * While WhatsApp OTPs are down, a member with no PIN who gets logged out has no
 * way back in. This card catches them while their session is still alive and
 * gets a 4-digit PIN set. Gated to the outage flag; disappears once set.
 */
export function PinNudge() {
  const { user, getIdToken } = useAuth();
  const [visible, setVisible] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!phoneVerifyOff || !user) return;
    try {
      if (localStorage.getItem(DONE_KEY)) return;
      const snooze = localStorage.getItem(SNOOZE_KEY);
      if (snooze && Date.now() < Number(snooze)) return;
    } catch { /* ignore */ }

    let cancelled = false;
    (async () => {
      try {
        const token = await getIdToken();
        if (!token || cancelled) return;
        const res = await apiFetch<{ success: boolean; data?: { has_pin: boolean } }>(
          "/api/users/me/pin-status",
          { token },
        );
        if (cancelled) return;
        if (res.data?.has_pin) {
          try { localStorage.setItem(DONE_KEY, "1"); } catch { /* ignore */ }
        } else {
          setVisible(true);
        }
      } catch { /* fail quiet — it's a nudge */ }
    })();
    return () => { cancelled = true; };
  }, [user, getIdToken]);

  if (!visible) return null;

  const dismiss = () => {
    setVisible(false);
    try { localStorage.setItem(SNOOZE_KEY, String(Date.now() + 3 * 24 * 60 * 60 * 1000)); } catch { /* ignore */ }
  };

  const savePin = async () => {
    if (pin.length !== 4 || saving) return;
    if (pin !== confirm) { setError("PINs don't match"); return; }
    setError("");
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) { setError("session expired — reopen the app"); return; }
      await apiFetch("/api/users/me/pin", {
        method: "POST",
        token,
        body: JSON.stringify({ pin }),
      });
      try { localStorage.setItem(DONE_KEY, "1"); } catch { /* ignore */ }
      setSaved(true);
      setTimeout(() => setVisible(false), 1800);
    } catch {
      setError("couldn't save. try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-x-4 z-[60] rounded-2xl border border-white/10 bg-gate-black p-4 shadow-2xl"
      style={{ bottom: "calc(84px + env(safe-area-inset-bottom, 0px))" }}
    >
      {saved ? (
        <p className="text-center font-sans text-[14px] text-sage">
          ✓ PIN set — you can always sign back in with your handle now.
        </p>
      ) : !expanded ? (
        <div className="flex items-center gap-3">
          <div className="flex-1">
            <p className="font-sans text-[14px] font-medium text-cream">set a 4-digit PIN</p>
            <p className="mt-0.5 font-sans text-[12px] leading-relaxed text-muted">
              so you can always get back into your account.
            </p>
          </div>
          <button
            onClick={() => setExpanded(true)}
            className="rounded-xl border-none bg-caramel px-4 py-2.5 font-sans text-[13px] font-medium text-near-black"
            style={{ cursor: "pointer" }}
          >
            set it
          </button>
          <button
            onClick={dismiss}
            aria-label="dismiss"
            className="border-none bg-transparent px-1 font-sans text-[16px] text-muted/50"
            style={{ cursor: "pointer" }}
          >
            ✕
          </button>
        </div>
      ) : (
        <div>
          <p className="mb-3 font-sans text-[13px] text-muted">
            pick a 4-digit PIN — with your handle <span className="text-cream">{user?.handle}</span> it gets you back in anytime.
          </p>
          <div className="flex gap-2">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="PIN"
              autoComplete="new-password"
              className="w-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center font-mono text-lg tracking-[6px] text-cream placeholder:text-[12px] placeholder:tracking-normal placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              placeholder="again"
              autoComplete="new-password"
              className="w-1/2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-center font-mono text-lg tracking-[6px] text-cream placeholder:text-[12px] placeholder:tracking-normal placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
            />
          </div>
          {error && <p className="mt-2 text-center font-sans text-[12px] text-terracotta">{error}</p>}
          <div className="mt-3 flex gap-2">
            <button
              onClick={savePin}
              disabled={pin.length !== 4 || confirm.length !== 4 || saving}
              className="flex-1 rounded-xl border-none py-3 font-sans text-[14px] font-medium transition-all"
              style={{
                background: pin.length === 4 && confirm.length === 4 ? "#D4A574" : "rgba(155,142,130,0.15)",
                color: pin.length === 4 && confirm.length === 4 ? "#0E0D0B" : "rgba(155,142,130,0.5)",
                cursor: pin.length === 4 && confirm.length === 4 && !saving ? "pointer" : "default",
              }}
            >
              {saving ? "saving..." : "save PIN"}
            </button>
            <button
              onClick={dismiss}
              className="rounded-xl border border-white/10 bg-transparent px-4 py-3 font-sans text-[13px] text-muted"
              style={{ cursor: "pointer" }}
            >
              later
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
