"use client";

import { useState } from "react";
import Link from "next/link";
import { usePWAInstall } from "@/hooks/usePWAInstall";

export default function InstallPage() {
  const { isStandalone, isIOS, browser, deferredPrompt, promptInstall } = usePWAInstall();
  const [installing, setInstalling] = useState(false);
  const [outcome, setOutcome] = useState<"accepted" | "dismissed" | null>(null);
  const [copied, setCopied] = useState(false);

  // Already installed — celebrate, then deep-link home.
  if (isStandalone) {
    return (
      <Section>
        <Heading>You're all set.</Heading>
        <Body>
          come offline is on your home screen. Tap the icon any time for venue reveals,
          memories, and reminders.
        </Body>
        <PrimaryLink href="/">go to your dashboard</PrimaryLink>
      </Section>
    );
  }

  // In-app browsers (Instagram, FB, etc.) — can't install. Tell user to open in Safari/Chrome.
  if (browser === "in-app") {
    return (
      <Section>
        <Heading>Open in your browser</Heading>
        <Body>
          You're in an in-app browser, which can't install web apps. Tap the menu (three dots)
          and choose <strong>Open in {isIOS ? "Safari" : "Chrome"}</strong>, then come back to
          this page.
        </Body>
        <CopyUrlButton copied={copied} setCopied={setCopied} />
      </Section>
    );
  }

  // iOS Safari — guide through the share-sheet flow
  if (isIOS && browser === "safari") {
    return (
      <Section>
        <Heading>Add come offline to your home screen</Heading>
        <Body>Two taps. Takes 10 seconds.</Body>

        <Step n={1}>
          Tap the <Pill>share button</Pill> at the bottom of Safari.
          <ShareIconHint />
        </Step>
        <Step n={2}>
          Scroll down and tap <Pill>Add to Home Screen</Pill>.
        </Step>
        <Step n={3}>
          Tap <Pill>Add</Pill> in the top right.
        </Step>

        <Body className="text-muted">
          That's it. Open the new come offline icon on your home screen any time you want
          updates on your events.
        </Body>
      </Section>
    );
  }

  // iOS but non-Safari browser — only Safari can install on iOS. Redirect them.
  if (isIOS && browser !== "safari") {
    return (
      <Section>
        <Heading>iOS needs Safari for this</Heading>
        <Body>
          Apple only lets web apps install from Safari. Long-press the link below, choose
          <strong> Open in Safari</strong>, then follow the steps there.
        </Body>
        <CopyUrlButton copied={copied} setCopied={setCopied} />
      </Section>
    );
  }

  // Android (Chrome, Edge, Samsung Internet, etc.) — native install prompt
  if (!isIOS && deferredPrompt) {
    return (
      <Section>
        <Heading>Install come offline</Heading>
        <Body>One tap. The app opens from your home screen, full-screen, no browser bar.</Body>
        <button
          onClick={async () => {
            setInstalling(true);
            try {
              await promptInstall();
              const choice = await (deferredPrompt as unknown as {
                userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
              }).userChoice;
              setOutcome(choice.outcome);
            } finally {
              setInstalling(false);
            }
          }}
          disabled={installing}
          className="mt-4 w-full max-w-sm rounded-full bg-caramel px-6 py-3 font-mono text-[12px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {installing ? "installing…" : "install app"}
        </button>
        {outcome === "dismissed" && (
          <Body className="mt-4 text-coral">
            Looks like you cancelled. Tap install again whenever you're ready.
          </Body>
        )}
        {outcome === "accepted" && (
          <Body className="mt-4 text-sage">
            Installing… You'll find come offline on your home screen in a moment.
          </Body>
        )}
      </Section>
    );
  }

  // Android Chrome but no install prompt yet (browser hasn't decided to expose it).
  // Show the menu route as a fallback.
  if (!isIOS) {
    return (
      <Section>
        <Heading>Add come offline to your home screen</Heading>
        <Body>
          Tap the browser menu (three dots, top right) and choose
          <strong> Install app</strong> or <strong>Add to Home Screen</strong>.
        </Body>
        <Body className="text-muted">
          If you don't see that option, you may need to open this page in Chrome.
        </Body>
      </Section>
    );
  }

  // Desktop fallback
  return (
    <Section>
      <Heading>Open this on your phone</Heading>
      <Body>
        come offline is built for the phone you carry to events. Open
        <strong> https://app.comeoffline.com/install</strong> on your iPhone or Android to
        install.
      </Body>
      <CopyUrlButton copied={copied} setCopied={setCopied} />
    </Section>
  );
}

// ─── Layout primitives ───────────────────────────────────────────────────

function Section({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-gate-black px-6 py-16 text-cream">
      <div className="mx-auto flex max-w-md flex-col gap-4">{children}</div>
    </main>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h1 className="font-serif text-3xl tracking-tight">{children}</h1>;
}

function Body({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <p className={`text-sand ${className}`}>{children}</p>;
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="mx-1 inline-flex rounded-md border border-white/15 bg-white/5 px-2 py-0.5 font-mono text-[11px] text-cream">
      {children}
    </span>
  );
}

function Step({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <div className="mt-3 flex gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-caramel font-mono text-[11px] text-gate-black">
        {n}
      </span>
      <div className="flex-1 text-[14px] text-sand">{children}</div>
    </div>
  );
}

function PrimaryLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="mt-3 inline-flex w-full max-w-sm items-center justify-center rounded-full bg-caramel px-6 py-3 font-mono text-[12px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-90"
    >
      {children}
    </Link>
  );
}

function CopyUrlButton({
  copied,
  setCopied,
}: {
  copied: boolean;
  setCopied: (v: boolean) => void;
}) {
  const url = typeof window !== "undefined" ? window.location.href : "";
  return (
    <button
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {}
      }}
      className="mt-3 inline-flex w-full max-w-sm items-center justify-center rounded-full border border-white/15 bg-white/5 px-6 py-3 font-mono text-[12px] uppercase tracking-[2px] text-cream transition-colors hover:bg-white/10"
    >
      {copied ? "copied!" : "copy install link"}
    </button>
  );
}

function ShareIconHint() {
  return (
    <span aria-hidden className="ml-1 inline-flex align-middle">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
        className="inline-block h-4 w-4 text-caramel"
      >
        <path d="M4 12v7a2 2 0 002 2h12a2 2 0 002-2v-7" />
        <polyline points="16 6 12 2 8 6" />
        <line x1="12" y1="2" x2="12" y2="15" />
      </svg>
    </span>
  );
}
