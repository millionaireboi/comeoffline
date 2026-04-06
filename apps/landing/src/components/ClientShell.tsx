"use client";

import { useState, useEffect, Suspense } from "react";
import { PostHogProvider, FacebookPixel } from "@comeoffline/analytics";
import { ChatProvider } from "@/components/chat/ChatProvider";
import { ChatBot } from "@/components/chat/ChatBot";
import { FloatingChatButton } from "@/components/chat/FloatingChatButton";
import { TabHeader } from "@/components/nav/TabHeader";

export function ClientShell({ children }: { children: React.ReactNode }) {
  const [scrolled, setScrolled] = useState(false);

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
          <TabHeader />
          <div className="overflow-x-hidden">
            {children}
          </div>
          <FloatingChatButton visible={scrolled} />
          <ChatBot />
        </ChatProvider>
      </PostHogProvider>
    </Suspense>
  );
}
