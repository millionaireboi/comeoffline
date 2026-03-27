import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "events — come offline.",
  description:
    "Browse upcoming phone-free events in Bangalore. House parties, secret dinners, and creative sessions by come offline.",
  openGraph: {
    title: "events — come offline.",
    description:
      "Browse upcoming phone-free events in Bangalore. House parties, secret dinners, and creative sessions by come offline.",
    url: "https://comeoffline.com/events",
    siteName: "come offline.",
    images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: "come offline. events" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "events — come offline.",
    description:
      "Browse upcoming phone-free events in Bangalore. House parties, secret dinners, and creative sessions by come offline.",
    images: ["/Comeoffline socials.png"],
  },
  alternates: {
    canonical: "https://comeoffline.com/events",
  },
};

export default function EventsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
