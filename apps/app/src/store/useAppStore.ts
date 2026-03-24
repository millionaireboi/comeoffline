import { create } from "zustand";
import type { User, Event, RSVP, Ticket, OnboardingSource } from "@comeoffline/types";

export type AppStage =
  | "install"
  | "gate"
  | "accepted"
  | "profile_setup"
  | "app_education"
  | "sign_quiz"
  | "feed"
  | "countdown"
  | "reveal"
  | "dayof"
  | "godark"
  | "memories"
  | "reconnect"
  | "vouch"
  | "profile"
  | "poll"
  | "bookings";

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Navigation
  stage: AppStage;
  setStage: (stage: AppStage) => void;

  // Onboarding source (tracks which entry path the user came from)
  onboardingSource: OnboardingSource | null;
  setOnboardingSource: (source: OnboardingSource | null) => void;

  // Active event context
  currentEvent: Event | null;
  setCurrentEvent: (event: Event | null) => void;

  // Active RSVP (legacy, for free events)
  activeRsvp: RSVP | null;
  setActiveRsvp: (rsvp: RSVP | null) => void;

  // Active Ticket (for ticketed events)
  activeTicket: Ticket | null;
  setActiveTicket: (ticket: Ticket | null) => void;

  // Events feed cache (persists across stage transitions)
  events: Event[];
  setEvents: (events: Event[]) => void;

  // Profile completion mode (triggered from "finish it" nudge)
  profileCompleteMode: boolean;
  setProfileCompleteMode: (mode: boolean) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  stage: "gate",
  setStage: (stage) => set({ stage }),

  onboardingSource: null,
  setOnboardingSource: (source) => set({ onboardingSource: source }),

  currentEvent: null,
  setCurrentEvent: (event) => set({ currentEvent: event }),

  activeRsvp: null,
  setActiveRsvp: (rsvp) => set({ activeRsvp: rsvp }),

  activeTicket: null,
  setActiveTicket: (ticket) => set({ activeTicket: ticket }),

  events: [],
  setEvents: (events) => set({ events }),

  profileCompleteMode: false,
  setProfileCompleteMode: (mode) => set({ profileCompleteMode: mode }),
}));
