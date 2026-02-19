"use client";

import { P } from "@/components/shared/P";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-5"
      style={{ background: P.gateBlack }}
    >
      <h1
        className="mb-2 font-serif text-[48px] font-normal italic"
        style={{ color: P.cream, lineHeight: 1 }}
      >
        oops.
      </h1>
      <p className="mb-6 font-sans text-sm" style={{ color: P.muted }}>
        something broke. it&apos;s not you, it&apos;s us.
      </p>
      <button
        onClick={reset}
        className="cursor-pointer rounded-full border-none px-6 py-3 font-sans text-sm font-medium transition-opacity hover:opacity-80"
        style={{ background: P.cream, color: P.gateBlack }}
      >
        try again
      </button>
    </div>
  );
}
