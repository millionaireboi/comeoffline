"use client";

import { useState } from "react";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { RotatingSeal } from "@/components/shared/RotatingSeal";
import { FilmGrain } from "@/components/shared/FilmGrain";
import { useInView } from "@/hooks/useInView";
import { apiFetch } from "@/lib/api";

export function ContactForm() {
  const [ref, vis] = useInView();
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [trap, setTrap] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = form.name.trim() && form.email.trim() && form.message.trim() && !sending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || trap) return;

    setSending(true);
    setError("");

    try {
      const res = await apiFetch<{ id: string }>("/contact", {
        method: "POST",
        body: JSON.stringify({ name: form.name, email: form.email, message: form.message }),
      });

      if (res.success) {
        setSent(true);
      } else {
        setError(res.error || "something went wrong. try again?");
      }
    } catch {
      setError("network error. please try again.");
    } finally {
      setSending(false);
    }
  };

  const update = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const inputStyles: React.CSSProperties = {
    background: P.cream + "06",
    border: `1px solid ${P.cream}15`,
    color: P.cream,
  };

  const labelClass = "font-mono text-[9px] uppercase tracking-[2px]";

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden px-5 py-14 sm:px-7 sm:py-18"
      style={{ minHeight: "100vh", background: P.gateBlack }}
    >
      <FilmGrain />

      {/* Ghost text */}
      <div
        className="pointer-events-none absolute inset-0 flex items-center justify-center select-none"
        aria-hidden="true"
      >
        <span
          className="font-serif font-normal"
          style={{
            fontSize: "clamp(180px, 30vw, 360px)",
            color: P.muted + "04",
            lineHeight: 1,
          }}
        >
          hello
        </span>
      </div>

      {/* Rotating seal */}
      <div
        className="pointer-events-none absolute top-5 right-5 transition-opacity duration-800"
        style={{ opacity: vis ? 0.3 : 0 }}
      >
        <RotatingSeal size={70} />
      </div>

      {/* Content */}
      <div
        className="relative mx-auto max-w-[440px]"
        style={{ zIndex: 2 }}
      >
        {/* Header */}
        <div
          className="mb-10 transition-all duration-800"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(24px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span
            className="font-mono text-[10px] uppercase tracking-[3px]"
            style={{ color: P.caramel }}
          >
            contact
          </span>
          <h2
            className="mt-3 font-serif font-normal leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)", color: P.cream }}
          >
            say hi. ask things.
            <br />
            <span className="italic" style={{ color: P.caramel }}>
              we don&apos;t bite.
            </span>
          </h2>
          <p
            className="mt-3 font-sans text-sm leading-relaxed"
            style={{ color: P.muted }}
          >
            events, partnerships, press, or just curious what we&apos;re building
            &mdash; drop us a line.
          </p>
        </div>

        {/* Form / Success */}
        <div
          className="transition-all duration-800"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.15s",
          }}
        >
          {sent ? (
            /* ---- Success state ---- */
            <div
              className="rounded-2xl p-8 text-center"
              style={{
                background: P.sage + "10",
                border: `1px solid ${P.sage}25`,
              }}
            >
              <div className="mb-4 text-4xl">{"\uD83D\uDC4B"}</div>
              <h3
                className="mb-2 font-serif text-xl font-normal"
                style={{ color: P.cream }}
              >
                got it. we&apos;ll be in touch.
              </h3>
              <p className="font-sans text-sm" style={{ color: P.muted }}>
                someone from the team will get back to you.
                <br />
                probably faster than you&apos;d expect.
              </p>
            </div>
          ) : (
            /* ---- Form ---- */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Name */}
              <div>
                <label
                  htmlFor="contact-name"
                  className={labelClass}
                  style={{ color: P.muted }}
                >
                  name
                </label>
                <input
                  id="contact-name"
                  type="text"
                  placeholder="who are you"
                  value={form.name}
                  onChange={update("name")}
                  className="mt-1.5 w-full rounded-xl px-4 py-3 font-sans text-sm outline-none transition-colors duration-200 placeholder:opacity-40"
                  style={inputStyles}
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="contact-email"
                  className={labelClass}
                  style={{ color: P.muted }}
                >
                  email
                </label>
                <input
                  id="contact-email"
                  type="email"
                  placeholder="so we can actually reply"
                  value={form.email}
                  onChange={update("email")}
                  className="mt-1.5 w-full rounded-xl px-4 py-3 font-sans text-sm outline-none transition-colors duration-200 placeholder:opacity-40"
                  style={inputStyles}
                />
              </div>

              {/* Message */}
              <div>
                <label
                  htmlFor="contact-message"
                  className={labelClass}
                  style={{ color: P.muted }}
                >
                  message
                </label>
                <textarea
                  id="contact-message"
                  placeholder="what's on your mind"
                  rows={5}
                  value={form.message}
                  onChange={update("message")}
                  className="mt-1.5 w-full resize-y rounded-xl px-4 py-3 font-sans text-sm leading-relaxed outline-none transition-colors duration-200 placeholder:opacity-40"
                  style={{
                    ...inputStyles,
                    minHeight: "120px",
                  }}
                />
              </div>

              {/* Honeypot */}
              <div className="absolute -left-[9999px] opacity-0" aria-hidden="true">
                <input
                  type="text"
                  name="_trap"
                  tabIndex={-1}
                  autoComplete="off"
                  value={trap}
                  onChange={(e) => setTrap(e.target.value)}
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-sm" style={{ color: P.highlight }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full cursor-pointer rounded-xl border-none px-6 py-3.5 font-sans text-sm font-medium transition-all duration-300"
                style={
                  canSubmit
                    ? {
                        background: P.cream,
                        color: P.gateBlack,
                      }
                    : {
                        background: P.cream + "15",
                        color: P.muted,
                        cursor: "not-allowed",
                      }
                }
              >
                {sending ? "sending..." : "send it \u2192"}
              </button>

              <div className="pt-1 text-center">
                <HandNote rotation={-1.5} style={{ color: P.muted }}>
                  we actually read these. pinky promise.
                </HandNote>
              </div>
            </form>
          )}
        </div>

        {/* ---- Socials ---- */}
        <div
          className="mt-14 transition-all duration-800"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.3s",
          }}
        >
          {/* Separator */}
          <div
            className="mb-8 h-px w-full"
            style={{ background: P.cream + "10" }}
          />

          <span
            className="font-mono text-[10px] uppercase tracking-[3px]"
            style={{ color: P.muted }}
          >
            or find us here
          </span>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* Instagram */}
            <a
              href="https://instagram.com/comeoffline.blr"
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-xl px-5 py-4 transition-all duration-300"
              style={{
                background: P.cream + "04",
                border: `1px solid ${P.cream}12`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = P.cream + "30";
                e.currentTarget.style.background = P.cream + "08";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = P.cream + "12";
                e.currentTarget.style.background = P.cream + "04";
              }}
            >
              <span className="text-lg">{"\uD83D\uDCF8"}</span>
              <div>
                <p
                  className="font-sans text-sm font-medium"
                  style={{ color: P.cream }}
                >
                  @comeoffline.blr
                </p>
                <p
                  className="font-mono text-[9px] uppercase tracking-[1px]"
                  style={{ color: P.muted }}
                >
                  instagram
                </p>
              </div>
            </a>

            {/* Email */}
            <a
              href="mailto:hello@comeoffline.in"
              className="group flex items-center gap-3 rounded-xl px-5 py-4 transition-all duration-300"
              style={{
                background: P.cream + "04",
                border: `1px solid ${P.cream}12`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = P.cream + "30";
                e.currentTarget.style.background = P.cream + "08";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = P.cream + "12";
                e.currentTarget.style.background = P.cream + "04";
              }}
            >
              <span className="text-lg">{"\u2709\uFE0F"}</span>
              <div>
                <p
                  className="font-sans text-sm font-medium"
                  style={{ color: P.cream }}
                >
                  hello@comeoffline.in
                </p>
                <p
                  className="font-mono text-[9px] uppercase tracking-[1px]"
                  style={{ color: P.muted }}
                >
                  email
                </p>
              </div>
            </a>
          </div>

          <div className="mt-5 text-center">
            <HandNote rotation={2} style={{ color: P.muted }}>
              DMs are open. we&apos;re friendly.
            </HandNote>
          </div>
        </div>
      </div>
    </section>
  );
}
