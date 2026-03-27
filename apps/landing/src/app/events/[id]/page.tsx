import type { Metadata } from "next";
import { EventDetailPage } from "./EventDetailPage";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

interface PublicEvent {
  id: string;
  title: string;
  tagline: string;
  description: string;
  date: string;
  time: string;
  total_spots: number;
  spots_taken: number;
  accent: string;
  accent_dark: string;
  emoji: string;
  tag: string;
  zones: { name: string; icon: string; desc: string }[];
  dress_code: string;
  includes: string[];
  venue_reveal_date?: string;
  status: string;
}

async function getEvent(id: string): Promise<PublicEvent | null> {
  try {
    const res = await fetch(`${API_URL}/api/events/public/${id}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.success ? data.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    return { title: "Event not found — come offline" };
  }

  const title = `${event.title} — come offline`;
  const description = event.tagline || event.description?.slice(0, 160) || "come offline";
  const spotsLeft = event.total_spots - event.spots_taken;

  return {
    title,
    description,
    openGraph: {
      title: `${event.emoji} ${event.title}`,
      description: `${event.date} · ${spotsLeft} spots left\n${description}`,
      url: `https://comeoffline.com/events/${event.id}`,
      siteName: "come offline.",
      type: "website",
      images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: event.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: `${event.emoji} ${event.title}`,
      description: `${event.date} · ${spotsLeft} spots left`,
      images: ["/Comeoffline socials.png"],
    },
    alternates: {
      canonical: `https://comeoffline.com/events/${event.id}`,
    },
  };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const event = await getEvent(id);

  if (!event) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#FAF6F0",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: 48, marginBottom: 16 }}>🔍</p>
          <h1
            className="font-serif"
            style={{ fontSize: 24, color: "#1A1715", marginBottom: 8 }}
          >
            event not found
          </h1>
          <a
            href="/events"
            className="font-mono"
            style={{ fontSize: 12, color: "#9B8E82", textDecoration: "underline" }}
          >
            browse all events →
          </a>
        </div>
      </div>
    );
  }

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: event.title,
    description: event.tagline || event.description?.slice(0, 300),
    startDate: event.date,
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    organizer: {
      "@type": "Organization",
      name: "come offline.",
      url: "https://comeoffline.com",
    },
    location: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: "Bangalore",
        addressCountry: "IN",
      },
    },
    offers: {
      "@type": "Offer",
      availability:
        event.total_spots - event.spots_taken > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/SoldOut",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <EventDetailPage event={event} />
    </>
  );
}
