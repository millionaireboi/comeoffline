"use client";

import { P, APP_URL } from "./P";

export function Footer() {
  return (
    <footer
      className="bg-gate-black px-7 py-9 text-center"
      style={{ borderTop: `1px solid ${P.muted}10` }}
    >
      <p className="font-serif text-base italic" style={{ color: P.muted + "40" }}>
        come offline.
      </p>
      <a
        href={`${APP_URL}/sign-in`}
        className="mt-3 inline-block font-mono text-[10px] uppercase tracking-[2px] transition-opacity hover:opacity-70"
        style={{ color: P.caramel + "60" }}
      >
        member sign in
      </a>
      <p className="mt-2 font-mono text-[9px] tracking-[1px]" style={{ color: P.muted + "25" }}>
        @comeoffline.blr
      </p>
    </footer>
  );
}
