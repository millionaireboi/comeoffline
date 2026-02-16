"use client";

import { useState } from "react";
import { useInView } from "@/hooks/useInView";
import { P } from "@/components/shared/P";
import { HandNote } from "@/components/shared/HandNote";
import { RotatingSeal } from "@/components/shared/RotatingSeal";
import { apiFetch } from "@/lib/api";

const INTERESTS = [
  "experience zone takeover",
  "product placement / sampling",
  "co-hosted event",
  "community partnership",
  "just exploring",
];

export function BrandForm() {
  const [ref, vis] = useInView();
  const [form, setForm] = useState({ name: "", email: "", brand: "", role: "" });
  const [selectedInterest, setSelectedInterest] = useState("");
  const [honeypot, setHoneypot] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const canSubmit = form.name.trim() && form.email.trim() && form.brand.trim() && status === "idle";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    // Honeypot check
    if (honeypot) return;

    setStatus("submitting");
    setErrorMsg("");

    try {
      const res = await apiFetch<{ id: string }>("/brands", {
        method: "POST",
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          brand: form.brand,
          role: form.role,
          interest: selectedInterest,
        }),
      });

      if (res.success) {
        setStatus("success");
      } else {
        setStatus("error");
        setErrorMsg(res.error || "something went wrong. try again?");
        setTimeout(() => setStatus("idle"), 3000);
      }
    } catch {
      setStatus("error");
      setErrorMsg("network error. try again?");
      setTimeout(() => setStatus("idle"), 3000);
    }
  };

  const updateField = (field: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (status === "success") {
    return (
      <section
        id="brand-form"
        ref={ref as React.RefObject<HTMLElement>}
        className="relative overflow-hidden bg-cream px-5 py-14 sm:px-7 sm:py-18"
      >
        <div className="mx-auto max-w-full sm:max-w-[440px]">
          <div
            className="rounded-2xl p-8 text-center"
            style={{
              background: P.sage + "15",
              border: `1px solid ${P.sage}25`,
            }}
          >
            <h3
              className="mb-2 font-serif text-[28px] font-normal text-near-black"
            >
              we got you.
            </h3>
            <p className="font-sans text-sm leading-[1.7] text-warm-brown">
              someone from our team will slide in within 48 hours.
            </p>
            <div className="mt-4">
              <HandNote rotation={-2} className="text-[13px]" style={{ color: P.sage }}>
                @comeoffline.blr
              </HandNote>
            </div>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      id="brand-form"
      ref={ref as React.RefObject<HTMLElement>}
      className="relative overflow-hidden bg-cream px-5 py-14 sm:px-7 sm:py-18"
    >
      {/* Ghost number */}
      <div
        className="pointer-events-none absolute -top-5 -left-3 font-serif font-normal leading-none select-none"
        style={{
          fontSize: "clamp(140px, 30vw, 220px)",
          color: P.nearBlack + "03",
        }}
      >
        04
      </div>

      {/* Rotating seal */}
      <div
        className="pointer-events-none absolute bottom-8 right-5 transition-opacity duration-800"
        style={{ opacity: vis ? 0.3 : 0, transitionDelay: "0.5s" }}
      >
        <RotatingSeal size={70} />
      </div>

      <div className="relative z-[2] mx-auto max-w-full sm:max-w-[440px]">
        {/* Header */}
        <div
          className="mb-8 transition-all duration-700"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(20px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
          }}
        >
          <span className="font-mono text-[10px] uppercase tracking-[3px] text-muted">
            let&apos;s talk
          </span>
          <h2
            className="mt-3 font-serif font-normal text-near-black leading-[1.2]"
            style={{ fontSize: "clamp(24px, 5.5vw, 32px)" }}
          >
            interested? <span className="italic text-caramel">tell us about your brand.</span>
          </h2>
          <p className="mt-3 font-sans text-sm leading-[1.7] text-warm-brown">
            no sales calls. no 47-slide decks. just a conversation about what makes sense.
          </p>
        </div>

        {/* Form */}
        <form
          onSubmit={handleSubmit}
          className="transition-all duration-700"
          style={{
            opacity: vis ? 1 : 0,
            transform: vis ? "translateY(0)" : "translateY(16px)",
            transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
            transitionDelay: "0.15s",
          }}
        >
          {/* Honeypot */}
          <input
            type="text"
            name="_trap"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
            tabIndex={-1}
            autoComplete="off"
            style={{
              position: "absolute",
              left: "-9999px",
              opacity: 0,
              height: 0,
              width: 0,
              overflow: "hidden",
            }}
          />

          <div className="flex flex-col gap-3">
            {/* Name */}
            <input
              type="text"
              placeholder="your name *"
              value={form.name}
              onChange={updateField("name")}
              className="w-full rounded-xl font-sans text-[14px] text-near-black transition-all duration-300 placeholder:text-muted/50 focus:outline-none"
              style={{
                padding: "14px 16px",
                background: "#FFFFFF",
                border: `1px solid ${P.sand}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = P.caramel;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = P.sand;
              }}
            />

            {/* Email */}
            <input
              type="email"
              placeholder="work email *"
              value={form.email}
              onChange={updateField("email")}
              className="w-full rounded-xl font-sans text-[14px] text-near-black transition-all duration-300 placeholder:text-muted/50 focus:outline-none"
              style={{
                padding: "14px 16px",
                background: "#FFFFFF",
                border: `1px solid ${P.sand}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = P.caramel;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = P.sand;
              }}
            />

            {/* Brand name */}
            <input
              type="text"
              placeholder="brand name *"
              value={form.brand}
              onChange={updateField("brand")}
              className="w-full rounded-xl font-sans text-[14px] text-near-black transition-all duration-300 placeholder:text-muted/50 focus:outline-none"
              style={{
                padding: "14px 16px",
                background: "#FFFFFF",
                border: `1px solid ${P.sand}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = P.caramel;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = P.sand;
              }}
            />

            {/* Role */}
            <input
              type="text"
              placeholder="your role"
              value={form.role}
              onChange={updateField("role")}
              className="w-full rounded-xl font-sans text-[14px] text-near-black transition-all duration-300 placeholder:text-muted/50 focus:outline-none"
              style={{
                padding: "14px 16px",
                background: "#FFFFFF",
                border: `1px solid ${P.sand}`,
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = P.caramel;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = P.sand;
              }}
            />
          </div>

          {/* Interest pills */}
          <div className="mt-5">
            <p
              className="mb-2.5 font-mono text-[9px] uppercase tracking-[2px]"
              style={{ color: P.muted }}
            >
              interested in
            </p>
            <div className="flex flex-wrap gap-2">
              {INTERESTS.map((interest) => {
                const isSelected = selectedInterest === interest;
                return (
                  <button
                    key={interest}
                    type="button"
                    onClick={() => setSelectedInterest(isSelected ? "" : interest)}
                    className="cursor-pointer rounded-full font-sans text-[12px] transition-all duration-300"
                    style={{
                      padding: "8px 16px",
                      background: isSelected ? P.caramel + "18" : "#FFFFFF",
                      border: `1px solid ${isSelected ? P.caramel + "50" : P.sand}`,
                      color: isSelected ? P.deepCaramel : P.warmBrown,
                    }}
                  >
                    {interest}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error message */}
          {status === "error" && (
            <p
              className="mt-3 font-hand text-sm"
              style={{ color: P.highlight, animation: "fadeIn 0.3s" }}
            >
              {errorMsg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            className="mt-6 w-full cursor-pointer rounded-full border-none py-4 font-sans text-sm font-medium transition-all duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
            style={{
              background: P.nearBlack,
              color: P.cream,
            }}
          >
            {status === "submitting" ? "sending..." : "slide into our DMs \u2192"}
          </button>
        </form>

        {/* HandNote */}
        <div
          className="mt-4 transition-opacity duration-600"
          style={{ opacity: vis ? 1 : 0, transitionDelay: "0.6s" }}
        >
          <HandNote rotation={-3} className="text-[13px]" style={{ color: P.caramel + "60" }}>
            we respond faster than your agency.
          </HandNote>
        </div>
      </div>
    </section>
  );
}
