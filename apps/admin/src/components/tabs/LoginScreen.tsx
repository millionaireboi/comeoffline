"use client";

import { useState } from "react";
import { auth } from "@comeoffline/firebase";
import { sendPasswordResetEmail } from "firebase/auth";
import { instrumentSerif } from "@/lib/constants";

interface LoginScreenProps {
  onLogin: (email: string, password: string) => Promise<void>;
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resetSent, setResetSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await onLogin(email, password);
    } catch {
      setError("Invalid email or password");
    } finally {
      setLoading(false);
    }
  }

  async function handleForgot() {
    setError("");
    if (!email.trim()) {
      setError("Enter your email first, then tap forgot password");
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSent(true);
    } catch {
      // Same message either way — don't leak which emails have accounts
      setResetSent(true);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gate-black px-8">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className={`${instrumentSerif.className} text-4xl tracking-tight text-cream`}>
            come offline
          </h1>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-[3px] text-muted">
            admin panel
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              placeholder="admin@comeoffline.com"
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
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 font-mono text-sm text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-caramel px-4 py-3 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {loading ? "signing in..." : "sign in"}
          </button>

          {resetSent ? (
            <p className="text-center font-mono text-[10px] text-caramel">
              if that email has an account, a reset link is on its way
            </p>
          ) : (
            <button
              type="button"
              onClick={handleForgot}
              className="w-full border-none bg-transparent text-center font-mono text-[10px] text-muted underline-offset-2 hover:text-cream hover:underline"
            >
              forgot password?
            </button>
          )}
        </form>

        <p className="text-center font-mono text-[10px] text-muted/50">
          team access only
        </p>
      </div>
    </div>
  );
}
