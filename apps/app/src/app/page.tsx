"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useAppStore } from "@/store/useAppStore";
import { InstallGate } from "@/components/gates/InstallGate";
import { TheGate } from "@/components/gates/TheGate";
import { AcceptanceScreen } from "@/components/gates/AcceptanceScreen";
import { EventFeed } from "@/components/events/EventFeed";
import { CountdownScreen } from "@/components/events/CountdownScreen";
import { VenueReveal } from "@/components/events/VenueReveal";
import { DayOfScreen } from "@/components/events/DayOfScreen";
import { GoDarkScreen } from "@/components/events/GoDarkScreen";
import { MemoriesScreen } from "@/components/events/MemoriesScreen";
import { ReconnectScreen } from "@/components/events/ReconnectScreen";
import { VouchScreen } from "@/components/events/VouchScreen";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { InAppChat } from "@/components/chat/InAppChat";
import { BottomNav } from "@/components/shared/BottomNav";

export default function Home() {
  const { loading } = useAuth();
  const { isStandalone } = usePWAInstall();
  const stage = useAppStore((s) => s.stage);
  const user = useAppStore((s) => s.user);
  const [chatOpen, setChatOpen] = useState(false);

  // Loading state
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gate-black">
        <div className="text-center">
          <h1 className="font-serif text-4xl tracking-tight text-cream" style={{ letterSpacing: "-1px" }}>
            come offline
          </h1>
          <p className="mt-3 font-mono text-[11px] uppercase tracking-[4px] text-muted/40">
            loading...
          </p>
        </div>
      </main>
    );
  }

  // PWA install gate — only show on mobile browsers (not standalone)
  if (!isStandalone) {
    return <InstallGate />;
  }

  // Show bottom nav on authenticated stages
  const showNav = user && !["gate", "accepted", "install"].includes(stage);

  // Route based on stage
  let screen: React.ReactNode;
  switch (stage) {
    case "gate":
      screen = <TheGate />;
      break;
    case "accepted":
      screen = <AcceptanceScreen />;
      break;
    case "feed":
      screen = <EventFeed />;
      break;
    case "countdown":
      screen = <CountdownScreen />;
      break;
    case "reveal":
      screen = <VenueReveal />;
      break;
    case "dayof":
      screen = <DayOfScreen />;
      break;
    case "godark":
      screen = <GoDarkScreen />;
      break;
    case "memories":
      screen = <MemoriesScreen />;
      break;
    case "reconnect":
      screen = <ReconnectScreen />;
      break;
    case "vouch":
      screen = <VouchScreen />;
      break;
    case "profile":
      screen = <ProfileScreen />;
      break;
    default:
      screen = <TheGate />;
  }

  return (
    <>
      {screen}
      {showNav && <BottomNav onChatOpen={() => setChatOpen(true)} />}
      {chatOpen && <InAppChat onClose={() => setChatOpen(false)} />}
    </>
  );
}
