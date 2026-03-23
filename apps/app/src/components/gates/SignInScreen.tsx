"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";
import type { User } from "@comeoffline/types";

const notFoundLines = [
  "hmm, can't find you.",
  "we don't recognize that one.",
  "no account with that handle.",
  "are you sure that's right?",
];

export function SignInScreen({ onBack }: { onBack: () => void }) {
  const [handle, setHandle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [errorIdx, setErrorIdx] = useState(0);
  const { loginWithToken } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim() || loading) return;
    setError("");
    setLoading(true);

    try {
      const res = await apiFetch<{
        success: boolean;
        data: { token: string; user: Record<string, unknown> };
        error?: string;
      }>("/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({ handle: handle.trim() }),
      });

      // Set user in store immediately
      if (res.data.user) {
        const { setUser } = useAppStore.getState();
        setUser(res.data.user as unknown as User);
      }

      await loginWithToken(res.data.token);

      // Navigate to main app after successful sign-in
      if (typeof window !== "undefined" && window.location.pathname === "/sign-in") {
        window.location.href = "/";
      }
    } catch (err) {
      // If the user was already set in the store, sign-in likely succeeded
      // but Firebase token refresh failed — redirect anyway
      const currentUser = useAppStore.getState().user;
      if (currentUser) {
        if (typeof window !== "undefined" && window.location.pathname === "/sign-in") {
          window.location.href = "/";
        }
        return;
      }
      setError(notFoundLines[errorIdx % notFoundLines.length]);
      setErrorIdx((i) => i + 1);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-6 py-10">
      <Noise opacity={0.05} />

      {/* Back button */}
      <button
        onClick={onBack}
        className="absolute left-6 top-6 font-mono text-[11px] uppercase tracking-[3px] text-muted/50 transition-colors hover:text-cream"
      >
        &larr; back
      </button>

      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="font-serif text-4xl tracking-tight text-cream" style={{ letterSpacing: "-1px" }}>
          come offline
        </h1>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[4px] text-muted/50">
          welcome back
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-4">
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
            your handle or instagram
          </label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 font-sans text-[15px] text-muted/40">@</span>
            <input
              type="text"
              value={handle}
              onChange={(e) => setHandle(e.target.value.replace(/^@/, "").replace(/\s/g, ""))}
              required
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              className="w-full rounded-[14px] border border-white/10 bg-white/5 py-3 pl-9 pr-4 font-sans text-[15px] text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              placeholder="your_handle"
            />
          </div>
        </div>

        {error && (
          <p
            className="animate-fadeSlideDown rounded-[14px] border border-terracotta/20 bg-terracotta/10 px-4 py-3 text-center font-sans text-sm text-terracotta"
            style={{ animation: "shake 0.4s ease" }}
          >
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !handle.trim()}
          className="w-full rounded-[14px] border-none py-4 font-sans text-[15px] font-medium transition-all duration-300"
          style={{
            background: handle.trim() ? "#FAF6F0" : "rgba(155,142,130,0.12)",
            color: handle.trim() ? "#0E0D0B" : "rgba(155,142,130,0.4)",
            cursor: handle.trim() ? "pointer" : "default",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "finding you..." : "sign in \u2192"}
        </button>
      </form>

      <div className="mt-8 text-center">
        <p className="font-mono text-[11px] text-muted/50">
          don&apos;t have an account?
        </p>
        <button
          onClick={onBack}
          className="mt-2 font-mono text-[11px] uppercase tracking-[3px] text-caramel transition-opacity hover:opacity-70"
        >
          get an invite code
        </button>
      </div>

      <div className="absolute bottom-8 font-mono text-[10px] uppercase tracking-[2px] text-muted/20">
        invite only &middot; est. 2026
      </div>
    </div>
  );
}
