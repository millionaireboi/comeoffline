import { Footer } from "@/components/shared/Footer";
import { P } from "@/components/shared/P";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "privacy policy — come offline.",
  description: "How come offline collects, uses, and protects your information.",
  openGraph: {
    title: "privacy policy — come offline.",
    description: "How come offline collects, uses, and protects your information.",
    url: "https://comeoffline.com/privacy",
    siteName: "come offline.",
    images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: "privacy policy come offline." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "privacy policy — come offline.",
    description: "How come offline collects, uses, and protects your information.",
    images: ["/Comeoffline socials.png"],
  },
  alternates: {
    canonical: "https://comeoffline.com/privacy",
  },
};

const LAST_UPDATED = "April 28, 2026";

export default function PrivacyPage() {
  return (
    <>
      <main
        className="bg-gate-black px-7 py-16 sm:px-10 sm:py-24"
        style={{ color: P.cream }}
      >
        <div className="mx-auto max-w-2xl">
          <p
            className="font-mono text-[10px] uppercase tracking-[3px]"
            style={{ color: P.muted }}
          >
            legal
          </p>
          <h1 className="mt-4 font-serif text-4xl tracking-tight sm:text-5xl">
            privacy policy
          </h1>
          <p
            className="mt-3 font-mono text-[11px] tracking-[1px]"
            style={{ color: P.muted }}
          >
            last updated {LAST_UPDATED}
          </p>

          <div
            className="mt-12 space-y-10 text-[15px] leading-relaxed sm:text-base"
            style={{ color: P.sand }}
          >
            <Section title="who we are">
              <p>
                come offline is an invite-only IRL community based in Bengaluru, India. This policy describes how we collect, use, and protect personal information when you visit{" "}
                <a href="https://comeoffline.com" className="underline" style={{ color: P.caramel }}>
                  comeoffline.com
                </a>
                , attend our events, or interact with our messages.
              </p>
              <p>
                For any questions about this policy or your data, write to{" "}
                <a href="mailto:hello@comeoffline.com" className="underline" style={{ color: P.caramel }}>
                  hello@comeoffline.com
                </a>
                .
              </p>
            </Section>

            <Section title="information we collect">
              <p>We collect only what we need to run the community and events:</p>
              <List
                items={[
                  "Identity: name, phone number, email, profile photo, social handles you choose to share",
                  "Application data: answers to the join form, vouches, invite codes",
                  "Event activity: RSVPs, ticket purchases, check-ins, memories you contribute, connections you make",
                  "Device data: IP address, browser type, device type, basic analytics events (page views, taps)",
                  "Payment data: handled by Razorpay — we do not store full card or UPI details",
                  "Messaging data: WhatsApp phone number and message delivery status, when you receive event communications from us",
                ]}
              />
            </Section>

            <Section title="how we use your information">
              <List
                items={[
                  "Decide on applications and issue invites",
                  "Run events: confirm RSVPs, share venue details, check you in, surface memories afterwards",
                  "Send service messages over WhatsApp, SMS, or email about events you've signed up for",
                  "Improve the experience: understand what's working, fix what isn't",
                  "Keep the community safe: prevent abuse, enforce community guidelines, handle no-shows",
                  "Comply with legal obligations and respond to lawful requests",
                ]}
              />
              <p>
                We do not sell your personal information. We do not use your data for third-party advertising.
              </p>
            </Section>

            <Section title="who we share data with">
              <p>We share data only with service providers we rely on to operate, under written agreements:</p>
              <List
                items={[
                  "Firebase (Google Cloud) — authentication, database, file storage",
                  "Razorpay — payments processing",
                  "Meta / WhatsApp Business — sending event communications",
                  "PostHog — product analytics",
                  "Email providers — transactional email",
                  "Cloud hosting providers — running the website and APIs",
                ]}
              />
              <p>
                We may also share information when required by law, to protect rights or safety, or if come offline merges with or transfers operations to another entity (in which case we'll notify you).
              </p>
            </Section>

            <Section title="data retention">
              <p>
                We keep account information while your membership is active and for a reasonable period afterwards in case you return. Event records (RSVPs, check-ins, memories) are kept as part of community history. We delete or anonymize data when it's no longer needed for the purposes above, or when you ask us to (subject to legal retention requirements).
              </p>
            </Section>

            <Section title="your rights">
              <p>You can:</p>
              <List
                items={[
                  "Access the personal data we hold about you",
                  "Correct anything that's wrong",
                  "Delete your account and personal data, subject to limits set by law and for safety",
                  "Object to or restrict certain uses of your data",
                  "Export your data in a portable format",
                  "Withdraw consent for marketing or non-essential communications at any time",
                  "Opt out of WhatsApp messages by replying STOP",
                ]}
              />
              <p>
                To exercise any of these, email{" "}
                <a href="mailto:hello@comeoffline.com" className="underline" style={{ color: P.caramel }}>
                  hello@comeoffline.com
                </a>
                . We respond within a reasonable period and at the latest within timelines set by applicable law.
              </p>
            </Section>

            <Section title="security">
              <p>
                We use industry-standard safeguards: encryption in transit, access controls, signed tokens for tickets, and regular reviews. No system is perfectly secure — if we ever experience a breach affecting your data, we'll notify you and the relevant authorities as required.
              </p>
            </Section>

            <Section title="children">
              <p>
                come offline is for adults. We do not knowingly collect personal data from anyone under 18. If you believe a minor has shared data with us, write to us and we'll delete it.
              </p>
            </Section>

            <Section title="international transfers">
              <p>
                Our service providers (Google, Meta, Razorpay, etc.) may process data outside India. Where we transfer data internationally, we rely on standard contractual protections to keep it safe.
              </p>
            </Section>

            <Section title="changes to this policy">
              <p>
                We may update this policy as our practices evolve. The "last updated" date at the top reflects the latest version. For material changes we'll notify you by email or in-app notice before they take effect.
              </p>
            </Section>

            <Section title="contact">
              <p>
                Questions, concerns, or requests:{" "}
                <a href="mailto:hello@comeoffline.com" className="underline" style={{ color: P.caramel }}>
                  hello@comeoffline.com
                </a>
                .
              </p>
            </Section>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2
        className="font-serif text-2xl tracking-tight"
        style={{ color: P.cream }}
      >
        {title}
      </h2>
      <div className="mt-4 space-y-4">{children}</div>
    </section>
  );
}

function List({ items }: { items: string[] }) {
  return (
    <ul className="ml-5 list-disc space-y-2">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
