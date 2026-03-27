import { ContactForm } from "@/components/contact/ContactForm";
import { Footer } from "@/components/shared/Footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "contact — come offline.",
  description: "Get in touch with come offline. Events, partnerships, press, or just say hi.",
  openGraph: {
    title: "contact — come offline.",
    description: "Get in touch with come offline. Events, partnerships, press, or just say hi.",
    url: "https://comeoffline.com/contact",
    siteName: "come offline.",
    images: [{ url: "/Comeoffline socials.png", width: 1200, height: 630, alt: "contact come offline." }],
  },
  twitter: {
    card: "summary_large_image",
    title: "contact — come offline.",
    description: "Get in touch with come offline. Events, partnerships, press, or just say hi.",
    images: ["/Comeoffline socials.png"],
  },
  alternates: {
    canonical: "https://comeoffline.com/contact",
  },
};

export default function ContactPage() {
  return (
    <>
      <ContactForm />
      <Footer />
    </>
  );
}
