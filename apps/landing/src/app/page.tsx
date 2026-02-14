"use client";

import { useState } from "react";
import { useInView } from "@/hooks/useInView";

// ─── Hero ──────────────────────────────────────────
function Hero() {
  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gate-black px-6">
      {/* Subtle ambient glow */}
      <div
        className="absolute h-[400px] w-[400px] rounded-full opacity-30"
        style={{
          background: "radial-gradient(circle, rgba(212,165,116,0.15), transparent 70%)",
          animation: "float 8s ease-in-out infinite",
        }}
      />

      <div className="relative z-10 max-w-[600px] text-center">
        <p className="mb-6 font-mono text-[11px] uppercase tracking-[5px] text-muted/50">
          invite only · bangalore · est. 2026
        </p>
        <h1
          className="mb-5 font-serif text-[clamp(3rem,8vw,5.5rem)] font-normal leading-[1.05] text-cream"
          style={{ letterSpacing: "-2px" }}
        >
          come offline.
        </h1>
        <p className="mx-auto mb-10 max-w-[420px] font-sans text-lg leading-relaxed text-muted">
          a community for people who still believe the best connections happen{" "}
          <span className="italic text-caramel">face to face.</span>
        </p>

        <div className="flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#two-ways-in"
            className="rounded-full bg-cream px-8 py-4 font-sans text-sm font-medium text-near-black transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(212,165,116,0.15)]"
          >
            get in →
          </a>
          <a
            href="#what-we-do"
            className="rounded-full border border-white/10 px-8 py-4 font-sans text-sm text-cream/70 transition-all hover:border-caramel/30 hover:text-cream"
          >
            learn more
          </a>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 font-mono text-[10px] tracking-[3px] text-muted/30">
        scroll ↓
      </div>
    </section>
  );
}

// ─── Marquee ───────────────────────────────────────
function MarqueeSection() {
  const words = ["no phones", "real talks", "curated vibes", "bangalore only", "phone-free", "invite only", "go outside"];
  const doubled = [...words, ...words];

  return (
    <section className="overflow-hidden bg-near-black py-5">
      <div className="flex whitespace-nowrap" style={{ animation: "marquee 20s linear infinite" }}>
        {doubled.map((word, i) => (
          <span key={i} className="mx-6 font-mono text-[11px] uppercase tracking-[3px] text-muted/30">
            {word}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── What We Do ────────────────────────────────────
function WhatWeDo() {
  const [ref, inView] = useInView();

  const items = [
    { emoji: "🏠", title: "house parties", desc: "intimate gatherings at curated venues. 30 people, no phones, all vibes." },
    { emoji: "🍽️", title: "secret dinners", desc: "chef's table experiences at hidden locations. revealed 24 hours before." },
    { emoji: "🎨", title: "creative sessions", desc: "paint, write, create — with strangers who become friends." },
    { emoji: "🎪", title: "festivals & one-offs", desc: "holi, halloween, new year's — but make it offline." },
  ];

  return (
    <section id="what-we-do" ref={ref as React.RefObject<HTMLElement>} className="bg-cream px-6 py-24">
      <div className="mx-auto max-w-[900px]">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[3px] text-muted">
          what we do
        </p>
        <h2
          className="mb-14 max-w-[500px] font-serif text-[clamp(2rem,5vw,3rem)] font-normal leading-tight text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          curated events where your phone stays in a lockbox.
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {items.map((item, i) => (
            <div
              key={item.title}
              className="rounded-[20px] bg-white p-7 shadow-[0_1px_4px_rgba(26,23,21,0.04)] transition-all duration-700"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(30px)",
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              <span className="mb-4 block text-3xl">{item.emoji}</span>
              <h3 className="mb-2 font-serif text-xl text-near-black">{item.title}</h3>
              <p className="font-sans text-[14px] leading-relaxed text-warm-brown">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── We Handle Everything ──────────────────────────
function WeHandle() {
  const [ref, inView] = useInView();

  const items = [
    "curated venue scouting",
    "phone lockboxes at the door",
    "rides to and from the venue",
    "food, drinks, and vibes",
    "community curation (no randoms)",
    "post-event connections",
  ];

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-near-black px-6 py-24">
      <div className="mx-auto max-w-[900px]">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[3px] text-muted/50">
          we handle everything
        </p>
        <h2
          className="mb-12 max-w-[500px] font-serif text-[clamp(2rem,5vw,3rem)] font-normal leading-tight text-cream"
          style={{ letterSpacing: "-1px" }}
        >
          you just show up.
        </h2>

        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((item, i) => (
            <div
              key={item}
              className="flex items-center gap-4 rounded-[16px] bg-white/[0.03] px-6 py-5 transition-all duration-700"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateX(0)" : "translateX(-20px)",
                transitionDelay: `${i * 0.08}s`,
              }}
            >
              <div className="h-2 w-2 shrink-0 rounded-full bg-caramel" />
              <span className="font-sans text-[15px] text-cream/80">{item}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Golden Ticket ─────────────────────────────────
function GoldenTicket() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-cream px-6 py-24">
      <div className="mx-auto max-w-[500px] text-center">
        <div
          className="rounded-3xl border-[1.5px] border-caramel/20 bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF8F0] px-10 py-14 shadow-[0_8px_32px_rgba(212,165,116,0.12)] transition-all duration-1000"
          style={{
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0) scale(1)" : "translateY(20px) scale(0.97)",
          }}
        >
          <div className="mb-5 flex items-center justify-center gap-2 font-mono text-[9px] uppercase tracking-[3px] text-caramel">
            <span className="h-px w-8 bg-caramel/40" />
            golden ticket
            <span className="h-px w-8 bg-caramel/40" />
          </div>

          <span className="mb-6 block text-5xl">🎟️</span>
          <h2 className="mb-3 font-serif text-3xl text-near-black">your invite awaits</h2>
          <p className="mb-2 font-sans text-[15px] text-warm-brown">
            every member gets a limited number of vouch codes.
          </p>
          <p className="font-mono text-[11px] text-muted">
            know someone? share your code. skip the line.
          </p>
        </div>
      </div>
    </section>
  );
}

// ─── Stats Stripe ──────────────────────────────────
function StatsStripe() {
  const stats = [
    { value: "150+", label: "members" },
    { value: "12", label: "events hosted" },
    { value: "0", label: "phones allowed" },
    { value: "4.8hrs", label: "avg offline time" },
  ];

  return (
    <section className="bg-near-black px-6 py-16">
      <div className="mx-auto grid max-w-[900px] grid-cols-2 gap-8 sm:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="text-center">
            <p className="font-serif text-[clamp(2rem,4vw,3rem)] text-cream">{stat.value}</p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[2px] text-muted/50">
              {stat.label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Overheard ─────────────────────────────────────
function Overheard() {
  const [ref, inView] = useInView();

  const quotes = [
    { text: "i haven't talked to a stranger like that in years", context: "house party #3" },
    { text: "wait, it's been 4 hours?!", context: "secret dinner" },
    { text: "this is what college felt like", context: "holi detox" },
    { text: "i literally forgot my phone existed", context: "every event" },
  ];

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-cream px-6 py-24">
      <div className="mx-auto max-w-[900px]">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[3px] text-muted">
          overheard at events
        </p>
        <h2
          className="mb-14 font-serif text-[clamp(2rem,5vw,3rem)] font-normal text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          real quotes. real people.
        </h2>

        <div className="grid gap-4 sm:grid-cols-2">
          {quotes.map((q, i) => (
            <div
              key={i}
              className="rounded-[20px] bg-white p-7 shadow-[0_1px_4px_rgba(26,23,21,0.04)] transition-all duration-700"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(20px)",
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              <p className="mb-3 font-caveat text-[22px] leading-snug text-near-black">
                &ldquo;{q.text}&rdquo;
              </p>
              <p className="font-mono text-[10px] text-muted">— {q.context}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Big Statement ─────────────────────────────────
function BigStatement() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-near-black px-6 py-32">
      <div className="mx-auto max-w-[700px] text-center">
        <h2
          className="font-serif text-[clamp(2rem,6vw,4rem)] font-normal leading-[1.15] text-cream transition-all duration-1000"
          style={{
            letterSpacing: "-1.5px",
            opacity: inView ? 1 : 0,
            transform: inView ? "translateY(0)" : "translateY(30px)",
          }}
        >
          the best night of your life won&apos;t be on your camera roll.
        </h2>
        <p
          className="mt-6 font-mono text-[11px] text-muted/40 transition-all duration-1000"
          style={{ opacity: inView ? 1 : 0, transitionDelay: "0.3s" }}
        >
          — come offline manifesto
        </p>
      </div>
    </section>
  );
}

// ─── Two Ways In ───────────────────────────────────
function TwoWaysIn() {
  const [ref, inView] = useInView();

  return (
    <section id="two-ways-in" ref={ref as React.RefObject<HTMLElement>} className="bg-cream px-6 py-24">
      <div className="mx-auto max-w-[900px]">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[3px] text-muted">
          how to get in
        </p>
        <h2
          className="mb-14 font-serif text-[clamp(2rem,5vw,3rem)] font-normal text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          two ways in. no shortcuts.
        </h2>

        <div className="grid gap-6 sm:grid-cols-2">
          {/* Option 1: Invite code */}
          <div
            className="rounded-[24px] border border-sand bg-white p-8 transition-all duration-700"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(30px)",
            }}
          >
            <span className="mb-5 block text-4xl">✉️</span>
            <h3 className="mb-2 font-serif text-2xl text-near-black">get vouched</h3>
            <p className="mb-5 font-sans text-[14px] leading-relaxed text-warm-brown">
              know someone in the community? ask them for a vouch code. enter it in the app, and
              you&apos;re in. no questions asked.
            </p>
            <div className="rounded-[14px] bg-cream p-4">
              <p className="font-mono text-[11px] text-muted">
                every member gets <span className="text-caramel">2 codes</span> after each event
              </p>
            </div>
          </div>

          {/* Option 2: Prove yourself */}
          <div
            className="rounded-[24px] border border-sand bg-white p-8 transition-all duration-700"
            style={{
              opacity: inView ? 1 : 0,
              transform: inView ? "translateY(0)" : "translateY(30px)",
              transitionDelay: "0.1s",
            }}
          >
            <span className="mb-5 block text-4xl">🎤</span>
            <h3 className="mb-2 font-serif text-2xl text-near-black">prove yourself</h3>
            <p className="mb-5 font-sans text-[14px] leading-relaxed text-warm-brown">
              no code? no problem. chat with our AI bot, answer a few vibe-check questions, and if
              you&apos;re the right fit, we&apos;ll let you in.
            </p>
            <div className="rounded-[14px] bg-cream p-4">
              <p className="font-mono text-[11px] text-muted">
                reviewed by a human · <span className="text-caramel">~48hr response</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Events Preview ────────────────────────────────
function EventsPreview() {
  const [ref, inView] = useInView();

  const events = [
    { emoji: "💌", title: "Galentines", tag: "WOMEN ONLY", accent: "#D4836B", date: "Feb 14" },
    { emoji: "🏠", title: "House Party", tag: "PHONE FREE", accent: "#D4A574", date: "Mar 8" },
    { emoji: "🎨", title: "Holi Detox", tag: "FESTIVAL", accent: "#8B7EC8", date: "Mar 14" },
  ];

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-near-black px-6 py-24">
      <div className="mx-auto max-w-[900px]">
        <p className="mb-4 font-mono text-[11px] uppercase tracking-[3px] text-muted/50">
          upcoming
        </p>
        <h2
          className="mb-14 font-serif text-[clamp(2rem,5vw,3rem)] font-normal text-cream"
          style={{ letterSpacing: "-1px" }}
        >
          what&apos;s cooking
        </h2>

        <div className="grid gap-4 sm:grid-cols-3">
          {events.map((event, i) => (
            <div
              key={event.title}
              className="overflow-hidden rounded-[20px] bg-white/[0.03] transition-all duration-700"
              style={{
                opacity: inView ? 1 : 0,
                transform: inView ? "translateY(0)" : "translateY(30px)",
                transitionDelay: `${i * 0.1}s`,
              }}
            >
              <div className="h-[4px]" style={{ background: event.accent }} />
              <div className="p-6">
                <span className="mb-3 block text-3xl">{event.emoji}</span>
                <span
                  className="mb-2 inline-block rounded-full px-2 py-0.5 font-mono text-[9px] tracking-[1px]"
                  style={{ color: event.accent, background: event.accent + "20" }}
                >
                  {event.tag}
                </span>
                <h3 className="mb-1 font-serif text-xl text-cream">{event.title}</h3>
                <p className="font-mono text-[11px] text-muted">{event.date}, 2026</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Final CTA ─────────────────────────────────────
function FinalCTA() {
  const [ref, inView] = useInView();

  return (
    <section ref={ref as React.RefObject<HTMLElement>} className="bg-cream px-6 py-32">
      <div
        className="mx-auto max-w-[500px] text-center transition-all duration-1000"
        style={{
          opacity: inView ? 1 : 0,
          transform: inView ? "translateY(0)" : "translateY(30px)",
        }}
      >
        <span className="mb-6 block text-5xl">🌙</span>
        <h2
          className="mb-4 font-serif text-[clamp(2rem,5vw,3rem)] font-normal text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          ready to come offline?
        </h2>
        <p className="mb-10 font-sans text-[15px] leading-relaxed text-warm-brown">
          install the app. enter your code.
          <br />
          the rest happens in real life.
        </p>

        <a
          href="https://app.comeoffline.com"
          className="inline-block rounded-full bg-near-black px-10 py-5 font-sans text-base font-medium text-cream transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(26,23,21,0.2)]"
        >
          open the app →
        </a>

        <p className="mt-6 font-mono text-[11px] text-muted/40">
          available as a PWA · works on any phone
        </p>
      </div>
    </section>
  );
}

// ─── Footer ────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-gate-black px-6 py-16">
      <div className="mx-auto max-w-[900px]">
        <div className="mb-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-between">
          <h3
            className="font-serif text-2xl text-cream"
            style={{ letterSpacing: "-0.5px" }}
          >
            come offline.
          </h3>
          <div className="flex gap-6">
            <a href="https://instagram.com/comeoffline" className="font-mono text-[11px] text-muted transition-colors hover:text-cream">
              instagram
            </a>
            <a href="mailto:hello@comeoffline.com" className="font-mono text-[11px] text-muted transition-colors hover:text-cream">
              email
            </a>
          </div>
        </div>

        <div className="h-px bg-white/5" />

        <div className="mt-8 flex flex-col items-center justify-between gap-3 sm:flex-row">
          <p className="font-mono text-[10px] text-muted/30">
            &copy; 2026 come offline. bangalore, india.
          </p>
          <p className="font-mono text-[10px] text-muted/30">
            the best things happen offline.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Floating Chat Button ──────────────────────────
function FloatingChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "hey! 👋 curious about come offline? ask me anything, or say 'i want in' to start the prove-yourself path." },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

  async function send(text: string) {
    if (!text.trim() || sending) return;
    const newMessages = [...messages, { role: "user" as const, content: text.trim() }];
    setMessages(newMessages);
    setInput("");
    setSending(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages }),
      });
      const data = await res.json();
      if (data.data?.message) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.data.message }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", content: "hmm, something went wrong. try again?" }]);
    } finally {
      setSending(false);
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-[500] flex h-14 w-14 items-center justify-center rounded-full bg-near-black text-xl text-cream shadow-[0_4px_20px_rgba(26,23,21,0.3)] transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_30px_rgba(26,23,21,0.4)]"
      >
        💬
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-[500] flex h-[480px] w-[360px] flex-col overflow-hidden rounded-3xl bg-gate-black shadow-[0_12px_48px_rgba(0,0,0,0.4)]">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-3.5">
        <div>
          <p className="font-serif text-sm text-cream">come offline</p>
          <p className="font-mono text-[9px] text-muted/50">ask us anything</p>
        </div>
        <button
          onClick={() => setOpen(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/5 text-xs text-cream"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="flex flex-col gap-3">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 ${
                  msg.role === "user"
                    ? "bg-cream text-near-black"
                    : "bg-white/5 text-cream/80"
                }`}
              >
                <p className="font-sans text-[13px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-2xl bg-white/5 px-3.5 py-2.5">
                <div className="flex gap-1">
                  <div className="h-1.5 w-1.5 rounded-full bg-muted/40" style={{ animation: "pulse 1.2s ease infinite" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted/40" style={{ animation: "pulse 1.2s ease 0.2s infinite" }} />
                  <div className="h-1.5 w-1.5 rounded-full bg-muted/40" style={{ animation: "pulse 1.2s ease 0.4s infinite" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="border-t border-white/5 px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="ask something..."
            disabled={sending}
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-[13px] text-cream placeholder:text-muted/30 focus:border-caramel/30 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-cream text-sm text-near-black disabled:opacity-30"
          >
            →
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <Hero />
      <MarqueeSection />
      <WhatWeDo />
      <WeHandle />
      <GoldenTicket />
      <StatsStripe />
      <Overheard />
      <BigStatement />
      <TwoWaysIn />
      <EventsPreview />
      <FinalCTA />
      <Footer />
      <FloatingChat />
    </>
  );
}
