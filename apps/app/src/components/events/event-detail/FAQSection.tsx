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

// Default cold-buyer objection-handling FAQ — mirrors the public landing event
// page so visitors who deep-link straight into the app get the same answers.
// TODO: wire this to event metadata so per-event FAQ can be authored in admin.
const DEFAULT_FAQ: FAQItem[] = [
  {
    q: "what time?",
    a: "7am to 12pm. five hours of move, groove, and brunch.",
  },
  {
    q: "where is it?",
    a: "two spots in Whitefield — workout + dance at Swaasthya Fitness & Physiotherapy, brunch at Kavu nearby. exact directions for both drop on WhatsApp before the event.",
  },
  {
    q: "coming solo?",
    a: "you come solo and go back with memories. that's the whole point.",
  },
  {
    q: "what do I bring?",
    a: "yourself and the energy. we'll handle everything else.",
  },
  {
    q: "refunds?",
    a: "no refunds — your spot, your brunch, your DJ slot are all reserved the moment you book. exception: if we don't approve your entry, you get a full refund.",
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
