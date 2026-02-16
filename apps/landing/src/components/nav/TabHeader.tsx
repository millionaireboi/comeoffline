"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { P } from "@/components/shared/P";

const tabs = [
  { label: "for you", href: "/" },
  { label: "events", href: "/events" },
  { label: "contact", href: "/contact" },
  { label: "for brands", href: "/brands" },
];

export function TabHeader() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(true);
  const [lastScroll, setLastScroll] = useState(0);

  useEffect(() => {
    const h = () => {
      const curr = window.scrollY;
      setVisible(curr < 100 || curr < lastScroll);
      setLastScroll(curr);
    };
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, [lastScroll]);

  // Adapt background — events page is light (cream bg), all others start dark
  const isLightPage = pathname === "/events";

  return (
    <div
      className="fixed top-0 right-0 left-0 z-[500] flex justify-center pt-4 pb-3 transition-all duration-350"
      style={{
        background: isLightPage
          ? `linear-gradient(180deg, ${P.cream}ee 0%, ${P.cream}cc 70%, transparent 100%)`
          : `linear-gradient(180deg, ${P.gateBlack}ee 0%, ${P.gateBlack}cc 70%, transparent 100%)`,
        opacity: visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(-100%)",
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <div
        className="flex gap-0.5 rounded-full p-[3px] backdrop-blur-xl"
        style={{
          background: isLightPage ? P.nearBlack + "08" : P.cream + "08",
          border: `1px solid ${isLightPage ? P.nearBlack + "10" : P.cream + "10"}`,
        }}
      >
        {tabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className="rounded-full border-none font-sans text-xs transition-all duration-250 no-underline"
              style={{
                padding: "7px 14px",
                background: isActive ? (isLightPage ? P.nearBlack : P.cream) : "transparent",
                color: isActive
                  ? (isLightPage ? P.cream : P.gateBlack)
                  : (isLightPage ? P.nearBlack + "70" : P.cream + "70"),
                fontWeight: isActive ? 600 : 400,
                letterSpacing: "0.2px",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
