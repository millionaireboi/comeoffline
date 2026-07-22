"use client";

import { useState, useEffect, Suspense } from "react";
import { usePathname } from "next/navigation";
import { PostHogProvider, FacebookPixel } from "@comeoffline/analytics";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatBot } from "@/components/chat/ChatBot";
import { FloatingChatButton } from "@/components/chat/FloatingChatButton";
import { TabHeader } from "@/components/nav/TabHeader";

// Full-takeover funnel pages: no tab nav, no chatbot — every extra link is an
// exit ramp before the booking CTA. They render their own branding.
// "/hi" also covers /hi/<campaign> subroutes; "/with" covers the creator
// invite pages (/with/<handle>) and "/creators" the program pitch page —
// same reason: every extra nav link is an exit ramp before the CTA.
const TAKEOVER_ROUTES = ["/hi", "/with", "/creators"];

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const isTakeover = TAKEOVER_ROUTES.some((r) => pathname === r || pathname.startsWith(`${r}/`));

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 400);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <Suspense>
      <PostHogProvider appName="landing">
        <FacebookPixel />
        <ChatProvider>
          {!isTakeover && <TabHeader />}
          <div className="overflow-x-hidden">
            {children}
          </div>
          {!isTakeover && <FloatingChatButton visible={scrolled} />}
          {!isTakeover && <ChatBot />}
        </ChatProvider>
      </PostHogProvider>
    </Suspense>
  );
}
