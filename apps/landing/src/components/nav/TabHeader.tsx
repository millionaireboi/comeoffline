"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
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
  const isHomePage = pathname === "/";
  const [scrolledPastHero, setScrolledPastHero] = useState(false);

  useEffect(() => {
    if (!isHomePage) return;
    const h = () => setScrolledPastHero(window.scrollY > 300);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, [isHomePage]);

  // Show logo always on non-home pages, only after scroll on home
  const showLogo = isHomePage ? scrolledPastHero : true;

  // Adapt background — events page is light (cream bg), all others start dark
  const isLightPage = pathname === "/events";

  return (
    <div
      className="fixed top-0 right-0 left-0 z-[500] flex justify-center pt-4 pb-3 transition-all duration-300"
      style={{
        background: isLightPage
          ? `linear-gradient(180deg, ${P.cream}ee 0%, ${P.cream}cc 70%, transparent 100%)`
          : `linear-gradient(180deg, ${P.gateBlack}ee 0%, ${P.gateBlack}cc 70%, transparent 100%)`,
      }}
    >
      <div className="flex items-center gap-3">
        <Link
          href="/"
          className="overflow-hidden transition-all duration-500 ease-out"
          style={{
            width: showLogo ? "auto" : "0px",
            opacity: showLogo ? 0.8 : 0,
            transform: showLogo ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.9)",
            maxWidth: showLogo ? "120px" : "0px",
          }}
        >
          <Image
            src="/logo.png"
            alt="come offline logo"
            width={0}
            height={24}
            sizes="100vw"
            style={{ width: "auto", height: "24px", filter: isLightPage ? "invert(1) hue-rotate(180deg)" : "none" }}
          />
        </Link>
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
                  padding: "10px 16px",
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
    </div>
  );
}
