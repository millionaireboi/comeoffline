import { ContactForm } from "@/components/contact/ContactForm";
import { Footer } from "@/components/shared/Footer";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "contact — come offline.",
  description: "Get in touch with come offline. Events, partnerships, press, or just say hi.",
};

export default function ContactPage() {
  return (
    <>
      <ContactForm />
      <Footer />
    </>
  );
}
