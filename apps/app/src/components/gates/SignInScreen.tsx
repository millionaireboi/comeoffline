"use client";

import { useState, useRef, useEffect } from "react";
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
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"handle" | "pin" | "forgot" | "reset">("handle");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [errorIdx, setErrorIdx] = useState(0);
  const [resetCode, setResetCode] = useState("");
  const [newPin, setNewPin] = useState("");
  const [newPinConfirm, setNewPinConfirm] = useState("");
  const { loginWithToken } = useAuth();
  const pinRef = useRef<HTMLInputElement>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (step === "pin") pinRef.current?.focus();
    if (step === "reset") codeRef.current?.focus();
  }, [step]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!handle.trim() || loading) return;

    if (step === "pin" && pin.length !== 4) {
      setError("enter your 4-digit PIN");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const res = await apiFetch<{
        success: boolean;
        data: { token: string; user: Record<string, unknown> };
        error?: string;
        needs_pin?: boolean;
      }>("/api/auth/sign-in", {
        method: "POST",
        body: JSON.stringify({
          handle: handle.trim(),
          ...(step === "pin" && { pin }),
        }),
      });

      if (res.data.user) {
        const { setUser } = useAppStore.getState();
        setUser(res.data.user as unknown as User);
      }

      await loginWithToken(res.data.token);

      if (typeof window !== "undefined" && window.location.pathname === "/sign-in") {
        window.location.href = "/";
      }
    } catch (err) {
      const currentUser = useAppStore.getState().user;
      if (currentUser) {
        if (typeof window !== "undefined" && window.location.pathname === "/sign-in") {
          window.location.href = "/";
        }
        return;
      }

      const msg = err instanceof Error ? err.message : "";

      if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("timeout")) {
        setError("can't reach the server. check your connection.");
      } else if (msg.includes("Too many")) {
        setError("too many attempts. wait 15 minutes and try again.");
      } else if (msg.includes("PIN is required") || msg.includes("needs_pin")) {
        setStep("pin");
        setPin("");
        setError("");
      } else if (step === "pin") {
        setError("wrong PIN. try again.");
        setPin("");
      } else {
        setError(notFoundLines[errorIdx % notFoundLines.length]);
        setErrorIdx((i) => i + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPin() {
    if (loading) return;
    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/forgot-pin", {
        method: "POST",
        body: JSON.stringify({ handle: handle.trim() }),
      });
      setStep("reset");
      setSuccess("check your email for a 6-digit code.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("No email")) {
        setError("no email on file. contact an admin to reset your PIN.");
      } else {
        setSuccess("if an account exists, a reset code has been sent.");
        setStep("reset");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPin(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    if (resetCode.length !== 6) { setError("enter the 6-digit code from your email"); return; }
    if (newPin.length !== 4) { setError("new PIN must be 4 digits"); return; }
    if (newPin !== newPinConfirm) { setError("PINs don't match"); return; }

    setError("");
    setLoading(true);
    try {
      await apiFetch("/api/auth/reset-pin", {
        method: "POST",
        body: JSON.stringify({ handle: handle.trim(), code: resetCode, new_pin: newPin }),
      });
      setSuccess("PIN reset! sign in with your new PIN.");
      setStep("pin");
      setPin("");
      setResetCode("");
      setNewPin("");
      setNewPinConfirm("");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.includes("expired") ? "code expired. request a new one." : "invalid code. try again.");
    } finally {
      setLoading(false);
    }
  }

  function goBack() {
    setError("");
    setSuccess("");
    if (step === "reset" || step === "forgot") { setStep("pin"); return; }
    if (step === "pin") { setStep("handle"); setPin(""); return; }
    onBack();
  }

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-6 py-10" style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom, 2.5rem))" }}>
      <Noise opacity={0.05} />

      <button
        onClick={goBack}
        className="absolute left-6 top-6 font-mono text-[11px] uppercase tracking-[3px] text-muted/50 transition-colors hover:text-cream"
      >
        &larr; back
      </button>

      <div className="mb-12 text-center">
        <h1 className="font-serif text-4xl tracking-tight text-cream" style={{ letterSpacing: "-1px" }}>
          come offline
        </h1>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[4px] text-muted/50">
          welcome back
        </div>
      </div>

      {/* Step: Handle */}
      {step === "handle" && (
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

          {error && <ErrorBox message={error} />}

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
            {loading ? "finding you..." : "next \u2192"}
          </button>
        </form>
      )}

      {/* Step: PIN */}
      {step === "pin" && (
        <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-4">
          <p className="mb-1 text-center font-sans text-[13px] text-muted">
            signing in as <span className="text-cream">@{handle}</span>
          </p>
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              your 4-digit pin
            </label>
            <input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              autoComplete="current-password"
              className="w-full rounded-[14px] border border-white/10 bg-white/5 px-5 py-4 text-center font-mono text-2xl tracking-[12px] text-cream placeholder:text-muted/20 focus:border-caramel/50 focus:outline-none"
              placeholder="••••"
            />
          </div>

          {success && <SuccessBox message={success} />}
          {error && <ErrorBox message={error} />}

          <button
            type="submit"
            disabled={loading || pin.length !== 4}
            className="w-full rounded-[14px] border-none py-4 font-sans text-[15px] font-medium transition-all duration-300"
            style={{
              background: pin.length === 4 ? "#FAF6F0" : "rgba(155,142,130,0.12)",
              color: pin.length === 4 ? "#0E0D0B" : "rgba(155,142,130,0.4)",
              cursor: pin.length === 4 ? "pointer" : "default",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "checking..." : "sign in \u2192"}
          </button>

          <button
            type="button"
            onClick={handleForgotPin}
            disabled={loading}
            className="w-full border-none bg-transparent py-2 font-mono text-[11px] text-muted/40 transition-colors hover:text-caramel"
            style={{ cursor: "pointer" }}
          >
            forgot your PIN?
          </button>
        </form>
      )}

      {/* Step: Reset — enter code + new PIN */}
      {step === "reset" && (
        <form onSubmit={handleResetPin} className="w-full max-w-[320px] space-y-4">
          <p className="text-center font-sans text-[13px] text-muted">
            resetting PIN for <span className="text-cream">@{handle}</span>
          </p>

          {success && <SuccessBox message={success} />}

          <p className="text-center font-mono text-[10px] text-muted/40">
            code expires in 10 minutes
          </p>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              6-digit code from email
            </label>
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={resetCode}
              onChange={(e) => setResetCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full rounded-[14px] border border-white/10 bg-white/5 px-5 py-4 text-center font-mono text-xl tracking-[8px] text-cream placeholder:text-muted/20 focus:border-caramel/50 focus:outline-none"
              placeholder="000000"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              new 4-digit PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
              autoComplete="new-password"
              className="w-full rounded-[14px] border border-white/10 bg-white/5 px-5 py-3 text-center font-mono text-xl tracking-[10px] text-cream placeholder:text-muted/20 focus:border-caramel/50 focus:outline-none"
              placeholder="••••"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              confirm new PIN
            </label>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              value={newPinConfirm}
              onChange={(e) => setNewPinConfirm(e.target.value.replace(/\D/g, "").slice(0, 4))}
              autoComplete="new-password"
              className="w-full rounded-[14px] border border-white/10 bg-white/5 px-5 py-3 text-center font-mono text-xl tracking-[10px] text-cream placeholder:text-muted/20 focus:border-caramel/50 focus:outline-none"
              placeholder="••••"
              style={{
                borderColor: newPinConfirm.length === 4 && newPin !== newPinConfirm
                  ? "rgba(196,112,77,0.5)"
                  : newPinConfirm.length === 4 && newPin === newPinConfirm
                    ? "rgba(168,181,160,0.5)"
                    : undefined,
              }}
            />
          </div>

          {error && <ErrorBox message={error} />}

          <button
            type="submit"
            disabled={loading || resetCode.length !== 6 || newPin.length !== 4 || newPin !== newPinConfirm}
            className="w-full rounded-[14px] border-none py-4 font-sans text-[15px] font-medium transition-all duration-300"
            style={{
              background: resetCode.length === 6 && newPin.length === 4 && newPin === newPinConfirm ? "#FAF6F0" : "rgba(155,142,130,0.12)",
              color: resetCode.length === 6 && newPin.length === 4 && newPin === newPinConfirm ? "#0E0D0B" : "rgba(155,142,130,0.4)",
              opacity: loading ? 0.5 : 1,
            }}
          >
            {loading ? "resetting..." : "set new PIN \u2192"}
          </button>
        </form>
      )}

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

      <div className="absolute bottom-0 pb-2 font-mono text-[10px] uppercase tracking-[2px] text-muted/20" style={{ paddingBottom: "max(0.5rem, env(safe-area-inset-bottom, 0.5rem))" }}>
        invite only &middot; est. 2026
      </div>
    </div>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <p
      className="rounded-[14px] border border-terracotta/20 bg-terracotta/10 px-4 py-3 text-center font-sans text-sm text-terracotta"
      style={{ animation: "shake 0.4s ease" }}
    >
      {message}
    </p>
  );
}

function SuccessBox({ message }: { message: string }) {
  return (
    <p
      className="rounded-[14px] border border-sage/20 bg-sage/10 px-4 py-3 text-center font-sans text-sm text-sage"
      style={{ animation: "fadeIn 0.3s ease" }}
    >
      {message}
    </p>
  );
}
