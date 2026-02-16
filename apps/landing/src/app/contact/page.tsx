import { ContactForm } from "@/components/contact/ContactForm";
import { Footer } from "@/components/shared/Footer";

export const dynamic = "force-dynamic";

export default function ContactPage() {
  return (
    <>
      <ContactForm />
      <Footer />
    </>
  );
}
