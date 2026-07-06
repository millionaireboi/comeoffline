import { useState } from "react";

interface FAQItem {
  q: string;
  a: string;
}

interface FAQSectionProps {
  items?: FAQItem[];
  accent: string;
  accentDark: string;
}

// Generic fallback FAQ — only answers that are true for EVERY event.
// Per-event specifics (time, venue, what's included) are authored in admin
// via event.faq and passed in as `items`. Never hardcode event details here.
const DEFAULT_FAQ: FAQItem[] = [
  {
    q: "coming solo?",
    a: "you come solo and go back with memories. that's the whole point.",
  },
  {
    q: "what do I bring?",
    a: "yourself and the energy. we'll handle everything else.",
  },
  {
    q: "how do I find the venue?",
    a: "exact directions drop on WhatsApp before the event.",
  },
  {
    q: "refunds?",
    a: "no refunds — everything is reserved and planned around you the moment you book. exception: if we don't approve your entry, you get a full refund.",
  },
];

export function FAQSection({ items, accent: _accent, accentDark }: FAQSectionProps) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const data = items && items.length > 0 ? items : DEFAULT_FAQ;

  return (
    <div className="mb-6">
      <span
        className="mb-2.5 block font-mono text-[10px] uppercase tracking-[2px] text-muted"
      >
        good to know
      </span>
      <div className="border-t border-sand">
        {data.map((item, idx) => {
          const isOpen = openIdx === idx;
          return (
            <div key={idx} className="border-b border-sand">
              <button
                onClick={() => setOpenIdx(isOpen ? null : idx)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-3 bg-transparent py-3.5 text-left"
              >
                <span className="font-sans text-[13px] font-medium text-near-black">
                  {item.q}
                </span>
                <span
                  className="shrink-0 text-[16px] leading-none transition-transform duration-200"
                  style={{
                    color: accentDark,
                    transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                  }}
                >
                  +
                </span>
              </button>
              {isOpen && (
                <p
                  className="mb-3.5 font-sans text-[13px] leading-[1.55] text-warm-brown"
                  style={{ animation: "fadeIn 0.2s ease" }}
                >
                  {item.a}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
