"use client";

import { useState, useEffect } from "react";

// Force dynamic rendering to prevent build-time Firebase initialization issues
export const dynamic = 'force-dynamic';
import { useAuth } from "@/hooks/useAuth";
import { usePWAInstall } from "@/hooks/usePWAInstall";
import { useTokenHandoff } from "@/hooks/useTokenHandoff";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useStage } from "@/hooks/useStage";
import { useAppStore } from "@/store/useAppStore";
import { InstallGate } from "@/components/gates/InstallGate";
import { TheGate } from "@/components/gates/TheGate";
import { SignInScreen } from "@/components/gates/SignInScreen";
import { AcceptanceScreen } from "@/components/gates/AcceptanceScreen";
import { EventFeed } from "@/components/events/EventFeed";
import { CountdownScreen } from "@/components/events/CountdownScreen";
import { VenueReveal } from "@/components/events/VenueReveal";
import { DayOfScreen } from "@/components/events/DayOfScreen";
import { GoDarkScreen } from "@/components/events/GoDarkScreen";
import { MemoriesScreen } from "@/components/events/MemoriesScreen";
import { ReconnectScreen } from "@/components/events/ReconnectScreen";
import { VouchScreen } from "@/components/events/VouchScreen";
import { CommunityPoll } from "@/components/events/CommunityPoll";
import { ProfileScreen } from "@/components/profile/ProfileScreen";
import { InAppChat } from "@/components/chat/InAppChat";
import { BottomNav } from "@/components/shared/BottomNav";

export default function Home() {
  const { loading } = useAuth();
  const { isStandalone } = usePWAInstall();
  const { checking: tokenChecking } = useTokenHandoff();
  usePushNotifications();
  useStage(); // Auto stage transitions based on event dates + ticket/RSVP status
  const stage = useAppStore((s) => s.stage);
  const user = useAppStore((s) => s.user);
  const [chatOpen, setChatOpen] = useState(false);
  const [showSignIn, setShowSignIn] = useState(false);

  // Check URL for /sign-in route
  useEffect(() => {
    if (typeof window !== "undefined") {
      setShowSignIn(window.location.pathname === "/sign-in");
    }
  }, []);

  // Loading state (auth loading or token handoff in progress)
  if (loading || tokenChecking) {
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

  // Inactive user — tasteful exit screen
  if (user && user.status === "inactive") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-gate-black px-8 text-center">
        <span className="mb-6 text-5xl">&#x1F33F;</span>
        <h1 className="font-serif text-3xl tracking-tight text-cream" style={{ letterSpacing: "-1px" }}>
          your chapter has ended
        </h1>
        <p className="mt-4 max-w-[280px] font-sans text-[15px] leading-relaxed text-muted">
          thanks for being part of the community. sometimes the vibe shifts, and that&apos;s okay.
        </p>
        <p className="mt-6 font-mono text-[10px] uppercase tracking-[3px] text-muted/30">
          come offline
        </p>
      </main>
    );
  }

  // Show sign-in screen if /sign-in route
  if (showSignIn && !user) {
    return <SignInScreen onBack={() => {
      if (typeof window !== "undefined") {
        window.history.pushState({}, "", "/");
        setShowSignIn(false);
      }
    }} />;
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
    case "poll":
      screen = <CommunityPoll />;
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
