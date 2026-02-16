"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@comeoffline/firebase";
import { Noise } from "@/components/shared/Noise";

export function SignInScreen({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state change will be handled by useAuth hook
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      if (message.includes("user-not-found") || message.includes("wrong-password") || message.includes("invalid-credential")) {
        setError("invalid email or password");
      } else if (message.includes("too-many-requests")) {
        setError("too many attempts. try again later.");
      } else {
        setError("something went wrong. try again.");
      }
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
        ← back
      </button>

      {/* Logo */}
      <div className="mb-12 text-center">
        <h1 className="font-serif text-4xl tracking-tight text-cream" style={{ letterSpacing: "-1px" }}>
          come offline
        </h1>
        <div className="mt-2 font-mono text-[11px] uppercase tracking-[4px] text-muted/50">
          sign in
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="w-full max-w-[320px] space-y-4">
        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
            email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            className="w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 font-sans text-[15px] text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
            placeholder="you@example.com"
          />
        </div>

        <div>
          <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
            password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full rounded-[14px] border border-white/10 bg-white/5 px-4 py-3 font-sans text-[15px] text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p className="animate-fadeSlideDown rounded-[14px] border border-terracotta/20 bg-terracotta/10 px-4 py-3 text-center font-sans text-sm text-terracotta">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !email.trim() || !password.trim()}
          className="w-full rounded-[14px] border-none py-4 font-sans text-[15px] font-medium transition-all duration-300"
          style={{
            background: email.trim() && password.trim() ? "#FAF6F0" : "rgba(155,142,130,0.12)",
            color: email.trim() && password.trim() ? "#0E0D0B" : "rgba(155,142,130,0.4)",
            cursor: email.trim() && password.trim() ? "pointer" : "default",
            opacity: loading ? 0.5 : 1,
          }}
        >
          {loading ? "signing in..." : "sign in →"}
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
        invite only · est. 2026
      </div>
    </div>
  );
}
