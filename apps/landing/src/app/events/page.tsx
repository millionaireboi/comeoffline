import { redirect } from "next/navigation";

// Events ARE the homepage now — keep /events working for old links and ads,
// but send everyone to /. Event detail pages (/events/[id]) still resolve.
export default function EventsPage() {
  redirect("/");
}
