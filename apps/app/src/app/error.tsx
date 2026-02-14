"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
      <div className="max-w-[340px] text-center">
        <span className="mb-6 block text-4xl">😵</span>
        <h2 className="mb-3 font-serif text-2xl text-near-black">something broke</h2>
        <p className="mb-8 font-sans text-sm text-warm-brown">
          {error.message || "an unexpected error occurred. try again."}
        </p>
        <button
          onClick={reset}
          className="rounded-full bg-near-black px-8 py-3.5 font-sans text-sm font-medium text-cream transition-all hover:-translate-y-0.5"
        >
          try again
        </button>
      </div>
    </main>
  );
}
