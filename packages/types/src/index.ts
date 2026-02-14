// ── User ──────────────────────────────────────────

export interface VibeCheckAnswer {
  question: string;
  answer: string;
}

export interface Badge {
  id: string;
  name: string;
  emoji: string;
  earned_at: string;
  event_id?: string;
}

export type EntryPath = "invite" | "vouch" | "prove";
export type UserStatus = "active" | "pending" | "suspended";

export interface User {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  instagram_handle?: string;
  invite_code_used: string;
  vouched_by?: string;
  entry_path: EntryPath;
  vibe_check_answers: VibeCheckAnswer[];
  badges: Badge[];
  status: UserStatus;
  has_seen_welcome: boolean;
  fcm_token?: string;
  created_at: string;
}

// ── Event ─────────────────────────────────────────

export interface Zone {
  icon: string;
  name: string;
  desc: string;
}

export interface PickupPoint {
  name: string;
  time: string;
  capacity: number;
  lat?: number;
  lng?: number;
}

export type EventStatus = "draft" | "upcoming" | "sold_out" | "live" | "completed";

export interface Event {
  id: string;
  title: string;
  tagline: string;
  description: string;
  date: string;
  time: string;
  total_spots: number;
  spots_taken: number;
  accent: string;
  accent_dark: string;
  emoji: string;
  tag: string;
  zones: Zone[];
  dress_code: string;
  includes: string[];
  venue_name?: string;
  venue_area?: string;
  venue_address?: string;
  venue_reveal_date: string;
  pickup_points: PickupPoint[];
  status: EventStatus;
}

// ── RSVP ──────────────────────────────────────────

export type RSVPStatus = "confirmed" | "cancelled" | "attended" | "no_show";

export interface RSVP {
  id: string;
  user_id: string;
  event_id: string;
  pickup_point: string;
  status: RSVPStatus;
  rsvp_at: string;
}

// ── Connection ────────────────────────────────────

export interface Connection {
  id: string;
  event_id: string;
  from_user_id: string;
  to_user_id: string;
  mutual: boolean;
  window_expires: string;
}

// ── VouchCode ─────────────────────────────────────

export type VouchCodeStatus = "unused" | "used" | "expired";

export interface VouchCode {
  id: string;
  code: string;
  owner_id: string;
  used_by_id?: string;
  status: VouchCodeStatus;
  earned_from_event: string;
}

// ── Application ───────────────────────────────────

export type ApplicationStatus = "pending" | "approved" | "rejected";

export interface Application {
  id: string;
  user_id: string;
  name: string;
  answers: VibeCheckAnswer[];
  status: ApplicationStatus;
  reviewed_by?: string;
  submitted_at: string;
}

// ── Memories ──────────────────────────────────────

export interface Polaroid {
  id: string;
  url: string;
  caption: string;
  who: string;
  color: string;
  rotation: number;
}

export interface OverheardQuote {
  id: string;
  quote: string;
  context: string;
}

export interface EventStats {
  attended: number;
  phones: number;
  drinks: number;
  hours: string;
}

export interface Memories {
  polaroids: Polaroid[];
  quotes: OverheardQuote[];
  stats: EventStats;
}

// ── Admin ─────────────────────────────────────────

export type AdminRole = "super_admin" | "event_manager" | "community_manager";

export interface AdminUser {
  id: string;
  email: string;
  role: AdminRole;
  totp_secret?: string;
}

// ── Settings ──────────────────────────────────────

export interface ChatbotSettings {
  system_prompt: string;
}

export interface VouchSettings {
  codes_first: number;
  codes_repeat: number;
  reconnect_hours: number;
  noshow_penalty: "no_vouch" | "warning" | "suspension";
}

export interface NotificationTemplate {
  trigger: string;
  message: string;
  timing: string;
}

// ── API ───────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
