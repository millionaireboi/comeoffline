import Link from "next/link";
import { P } from "@/components/shared/P";

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center px-5"
      style={{ background: P.gateBlack }}
    >
      <span
        className="mb-4 font-serif font-normal"
        style={{ fontSize: "clamp(80px, 20vw, 140px)", color: P.muted + "15", lineHeight: 1 }}
      >
        404
      </span>
      <h1
        className="mb-2 font-serif text-[28px] font-normal"
        style={{ color: P.cream }}
      >
        this page went offline.
      </h1>
      <p className="mb-6 font-sans text-sm" style={{ color: P.muted }}>
        looks like you wandered somewhere that doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="rounded-full px-6 py-3 font-sans text-sm font-medium no-underline transition-opacity hover:opacity-80"
        style={{ background: P.cream, color: P.gateBlack }}
      >
        go home
      </Link>
    </div>
  );
}
