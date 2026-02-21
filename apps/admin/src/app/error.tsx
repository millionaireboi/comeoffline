"use client";

import { instrumentSerif } from "@/lib/constants";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gate-black px-8 text-center">
      <h1
        className={`${instrumentSerif.className} mb-3 text-3xl tracking-tight text-cream`}
      >
        something went wrong
      </h1>
      <p className="mb-8 max-w-[320px] font-mono text-sm text-muted">
        {error.digest
          ? "an unexpected error occurred. try refreshing."
          : error.message || "an unexpected error occurred."}
      </p>
      <button
        onClick={reset}
        className="rounded-xl bg-white/5 px-6 py-3 font-mono text-[11px] uppercase tracking-[2px] text-cream transition-colors hover:bg-white/10"
      >
        try again
      </button>
    </div>
  );
}
