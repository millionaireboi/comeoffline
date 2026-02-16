import { create } from "zustand";
import type { User, Event, RSVP, Ticket } from "@comeoffline/types";

export type AppStage =
  | "install"
  | "gate"
  | "accepted"
  | "feed"
  | "countdown"
  | "reveal"
  | "dayof"
  | "godark"
  | "memories"
  | "reconnect"
  | "vouch"
  | "profile"
  | "poll";

interface AppState {
  // Auth
  user: User | null;
  setUser: (user: User | null) => void;

  // Navigation
  stage: AppStage;
  setStage: (stage: AppStage) => void;

  // Active event context
  currentEvent: Event | null;
  setCurrentEvent: (event: Event | null) => void;

  // Active RSVP (legacy, for free events)
  activeRsvp: RSVP | null;
  setActiveRsvp: (rsvp: RSVP | null) => void;

  // Active Ticket (for ticketed events)
  activeTicket: Ticket | null;
  setActiveTicket: (ticket: Ticket | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),

  stage: "gate",
  setStage: (stage) => set({ stage }),

  currentEvent: null,
  setCurrentEvent: (event) => set({ currentEvent: event }),

  activeRsvp: null,
  setActiveRsvp: (rsvp) => set({ activeRsvp: rsvp }),

  activeTicket: null,
  setActiveTicket: (ticket) => set({ activeTicket: ticket }),
}));
