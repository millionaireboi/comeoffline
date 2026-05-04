"use client";

interface CommunitySafetyDialogProps {
  onContinue: () => void;
  onLater: () => void;
}

export function CommunitySafetyDialog({ onContinue, onLater }: CommunitySafetyDialogProps) {
  return (
    <div
      className="animate-fadeIn fixed inset-0 z-[700] flex items-end justify-center sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="community-safety-title"
    >
      <button
        aria-label="close"
        onClick={onLater}
        className="absolute inset-0 cursor-default border-none bg-[rgba(10,9,7,0.7)] backdrop-blur-md"
      />

      <div
        className="relative mx-4 w-full max-w-[400px] overflow-hidden rounded-[24px] bg-cream"
        style={{
          animation: "chatSlideIn 0.35s cubic-bezier(0.16,1,0.3,1) both",
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          }}
        />

        <div className="relative px-7 pt-9 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: "rgba(168,181,160,0.18)" }}>
            <span className="text-2xl">{"\u{1F39F}"}</span>
          </div>

          <p className="mb-3 font-mono text-[10px] uppercase tracking-[3px] text-caramel">
            you&apos;re in
          </p>

          <h2
            id="community-safety-title"
            className="mb-4 font-serif text-[26px] font-normal leading-[1.2] text-near-black"
            style={{ letterSpacing: "-0.5px" }}
          >
            ticket confirmed 🎫
          </h2>

          <p className="mx-auto mb-7 max-w-[320px] font-sans text-[15px] leading-[1.55] text-warm-brown">
            personalize your profile so we can connect you with the right people. takes 2 minutes.
          </p>
        </div>

        <div className="relative px-7">
          <button
            onClick={onContinue}
            className="w-full rounded-[14px] border-none bg-near-black py-[15px] font-sans text-[15px] font-medium text-cream transition-transform active:scale-[0.98]"
            style={{ cursor: "pointer" }}
          >
            personalize my profile {"→"}
          </button>

          <button
            onClick={onLater}
            className="mt-3 w-full border-none bg-transparent py-3 font-mono text-[11px] uppercase tracking-[2px] text-muted transition-opacity hover:opacity-70"
            style={{ cursor: "pointer" }}
          >
            i&apos;ll do it later
          </button>
        </div>
      </div>
    </div>
  );
}
