# Come Offline — User Flow Document

> Full platform audit: what's built, what's wired, and what's left.

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Landing Page Flows](#2-landing-page-flows)
3. [Main App Flows](#3-main-app-flows)
4. [Admin Dashboard Flows](#4-admin-dashboard-flows)
5. [API Coverage](#5-api-coverage)
6. [What's Built (Complete)](#6-whats-built-complete)
7. [What's Partially Built](#7-whats-partially-built)
8. [What's Missing / Left To Build](#8-whats-missing--left-to-build)

---

## 1. Platform Overview

| Component | Stack | Port | Status |
|-----------|-------|------|--------|
| Landing | Next.js 15, React 19, Tailwind v4 | 3000 | Built |
| Main App | Next.js 15, React 19, Zustand, Firebase | 3001 | Built |
| Admin | Next.js 15, React 19, Tailwind v4 | 3002 | Built |
| API | Express 4.21, Firebase Admin, Claude API | 8080 | Built |
| Firebase | Auth + Firestore + Storage | — | Configured |

**Monorepo packages:** `brand` (colors, fonts, animations), `types` (shared TS interfaces), `firebase` (client SDK), `ui` (stub), `eslint-config`, `tsconfig`

---

## 2. Landing Page Flows

### Flow 2.1 — First Visit (Marketing Funnel)

```
User lands on comeoffline.blr
        │
        ▼
┌─────────────────────────────┐
│         HERO SECTION         │
│  "come offline."             │
│  Typewriter subtitle         │
│  Rotating seal, film grain   │
│                              │
│  [i have a code]             │
│  [no code? prove yourself]   │
└─────────────────────────────┘
        │
        ▼  (scroll)
┌─────────────────────────────┐
│  Marquee: "invite only •     │
│  real people • no phones"    │
├─────────────────────────────┤
│  WHAT IS THIS                │
│  Polaroid carousel (4 cards) │
├─────────────────────────────┤
│  HOW IT WORKS (4 steps)      │
│  1. get invited              │
│  2. RSVP + wait              │
│  3. show up, go dark         │
│  4. connect after            │
├─────────────────────────────┤
│  GOLDEN TICKET (venue card)  │
├─────────────────────────────┤
│  STATS: 38 humans, 0 phones, │
│  127 mimosas, 95% show rate  │
├─────────────────────────────┤
│  OVERHEARD (testimonials x3) │
├─────────────────────────────┤
│  EVENTS (2 upcoming w/ bars) │
├─────────────────────────────┤
│  FINAL CTA                   │
│  [i have a code]             │
│  [prove yourself →]          │
├─────────────────────────────┤
│  FOOTER: @comeoffline.blr   │
└─────────────────────────────┘
```

**Status: BUILT** — All sections render, scroll animations via IntersectionObserver, all decorative components functional.

### Flow 2.2 — Code Entry (Landing)

```
User clicks "i have a code"
        │
        ▼
  Input field appears (uppercase, max chars)
        │
        ▼
  Types code → presses Enter
        │
        ├── Code ≥ 4 chars → ✅ "welcome in. taking you to the app..."
        │                      (alert: redirect to app.comeoffline.blr)
        │
        └── Code < 4 chars → ❌ "hmm, that's not it." + shake animation
```

**Status: PARTIALLY BUILT**
- Client-side validation works (length check only)
- Redirect is a placeholder `alert()` — not wired to actual navigation or API validation

### Flow 2.3 — Chatbot Vibe Check (Landing)

```
User clicks "no code? prove yourself"
        │
        ▼
┌────────────────────────────┐
│  CHATBOT (bottom sheet)     │
│                             │
│  System: "got a code from   │
│  someone, or trying to      │
│  prove you belong?"         │
│                             │
│  [i have a code]            │
│  [no code, prove me]        │
│                             │
│  User types message         │
│       │                     │
│       ▼                     │
│  POST /api/chat             │
│  Bot responds (multi-line)  │
│  ... conversation continues │
└────────────────────────────┘
```

**Status: BUILT** — Chat sends messages to API, receives Claude responses, displays with typing animation. Rate limited at 20 msgs/hr.

**What's missing:** No mechanism to actually "pass the vibe check" and receive a code from the chatbot. The bot can chat but can't grant access.

---

## 3. Main App Flows

### Flow 3.1 — PWA Install Gate

```
User opens app.comeoffline.blr in browser
        │
        ▼
  usePWAInstall() checks display-mode
        │
        ├── Already installed (standalone) → Skip to Gate
        │
        └── Not installed
            │
            ├── iOS → Show manual instructions
            │         (Share → Add to Home Screen)
            │
            └── Android → Show install button
                          (beforeinstallprompt or manual)
```

**Status: BUILT** — InstallGate component renders with platform-specific instructions. PWA metadata configured in layout (manifest, theme-color, apple-web-app).

**What's missing:** No actual `manifest.json` file found in public directory. Service worker not implemented.

### Flow 3.2 — Invite Code Entry (App)

```
┌────────────────────────────┐
│        THE GATE             │
│                             │
│  "someone thinks you're     │
│   worth meeting IRL"        │
│   (typewriter effect)       │
│                             │
│  [ ENTER CODE ] (12 char)   │
│  [ UNLOCK → ]               │
│                             │
│  Failed attempts:           │
│  - Shake animation          │
│  - 8 random rejection msgs  │
│  - After 3 fails: hint text │
│                             │
│  On valid code:             │
│  - Confetti animation 🎉    │
│  - POST /api/auth/validate  │
│  - Firebase custom token    │
│  - Login + fetch user doc   │
│  → Navigate to Acceptance   │
└────────────────────────────┘
```

**Status: BUILT** — Full flow works end-to-end: code validation → Firebase auth → user creation → stage transition.

### Flow 3.3 — Onboarding (Acceptance Screen)

```
┌────────────────────────────┐
│    WELCOME TO THE CLUB      │
│                             │
│  Phase 1: Emoji float 🎉   │
│  Phase 2: Community rules   │
│    🤝 Be kind, real         │
│    🎯 Every person curated  │
│    📵 Phone-free events     │
│    ✨ Face-to-face first    │
│  Phase 3: CTA slides up    │
│                             │
│  [show me what's happening →]│
│  → Sets has_seen_welcome    │
│  → Navigate to Feed         │
└────────────────────────────┘
```

**Status: BUILT** — Phased animations render, button navigates to feed.

**What's missing:** `has_seen_welcome` is not persisted to Firestore on button click (only checked client-side via Zustand).

### Flow 3.4 — Event Discovery

```
┌────────────────────────────┐
│  EVENT FEED                 │
│  GlitchText header (7 puns)│
│                             │
│  GET /api/events            │
│       │                     │
│       ▼                     │
│  ┌──────────────────┐       │
│  │ Event Card        │      │
│  │ 🎪 Title + Tag    │      │
│  │ Date, Time        │      │
│  │ Spots bar (X/Y)   │      │
│  │ "pickup included"  │     │
│  └──────────────────┘       │
│  ┌──────────────────┐       │
│  │ Coming Soon card  │      │
│  └──────────────────┘       │
│                             │
│  ── Bottom Nav ──           │
│  🎪 Events  💬 Chat  👤 Me │
└────────────────────────────┘
```

**Status: BUILT** — Fetches events from API, renders cards with accent colors, spots bar, tags.

### Flow 3.5 — Event Detail + RSVP

```
  Tap Event Card
        │
        ▼
┌────────────────────────────┐
│  EVENT DETAIL (bottom sheet)│
│                             │
│  Description                │
│  Zones grid (🎵🍽️🎨...)    │
│  What's included (bullets)  │
│  Dress code                 │
│  Spots remaining            │
│                             │
│  [i'm in →]                 │
│       │                     │
│       ▼                     │
│  POST /api/events/:id/rsvp  │
│  (Firestore transaction)    │
│  → spots_taken incremented  │
│  → RSVP doc created         │
│  → Navigate to Countdown    │
└────────────────────────────┘
```

**Status: BUILT** — Detail sheet renders, RSVP creates atomic transaction, stage transitions correctly. Sold out events disable the button.

### Flow 3.6 — Countdown to Event

```
┌────────────────────────────┐
│  COUNTDOWN SCREEN           │
│                             │
│  ✓ RSVP Accepted badge     │
│                             │
│  DD : HH : MM : SS          │
│  (updates every 1 second)   │
│                             │
│  Venue reveal progress bar  │
│  ████████░░░░░░ 62%         │
│                             │
│  Daily disconnect quote     │
│  "too much. close the app." │
│                             │
│  [venue sealed 🔒]          │
│  (tap to peek reveal)       │
└────────────────────────────┘
```

**Status: BUILT** — Live countdown, progress bar, quotes rotate daily. Demo button skips to reveal.

**What's missing:** Auto-transition to VenueReveal when `venue_reveal_date` passes (currently manual via button).

### Flow 3.7 — Venue Reveal (Scratch Card)

```
┌────────────────────────────┐
│  VENUE REVEAL               │
│                             │
│  Phase 1: SEALED            │
│  ┌────────────────────┐     │
│  │ ░░░░░░░░░░░░░░░░░░ │    │
│  │ ░░ SCRATCH HERE ░░░ │    │
│  │ ░░░░░░░░░░░░░░░░░░ │    │
│  └────────────────────┘     │
│  Scratch percentage: 23%    │
│                             │
│  Phase 2: REVEALING (≥45%)  │
│  ✨ Sparkle animation       │
│                             │
│  Phase 3: REVEALED          │
│  ┌────────────────────┐     │
│  │ 🎫 GOLDEN TICKET    │    │
│  │ Venue: The Courtyard │   │
│  │ Area: Indiranagar    │   │
│  │ Date: Feb 14, 2026   │   │
│  │ Pickup: 4:15 PM      │   │
│  └────────────────────┘     │
│                             │
│  "last approved phone use"  │
│  📸 hint to screenshot      │
│  [can't wait →]             │
│  → Navigate to DayOf        │
└────────────────────────────┘
```

**Status: BUILT** — Canvas-based scratch interaction works (mouse + touch), percentage detection triggers reveal at 45%, golden ticket card renders venue details.

### Flow 3.8 — Day Of Event

```
┌────────────────────────────┐
│  DAY OF                     │
│  ● LIVE (pulsing)           │
│                             │
│  "Today's the day"          │
│  Event title + emoji + time │
│                             │
│  📍 Venue card              │
│  📍 Pickup location & time  │
│  👗 Dress code reminder     │
│                             │
│  [i'm ready, pick me up]    │
│  "last chance to use phone" │
│  → Navigate to GoDark       │
└────────────────────────────┘
```

**Status: BUILT** — Static display of event info, CTA navigates to go-dark mode.

**What's missing:** No actual ride/pickup coordination. No push notification for pickup arrival.

### Flow 3.9 — Go Dark (Phone-Free Mode)

```
┌────────────────────────────┐
│  GO DARK                    │
│                             │
│  🌙 (breathing animation)  │
│                             │
│  "Enjoy tonight."           │
│  "Your ride is on the way." │
│  "The rest happens offline."│
│                             │
│  [demo: skip to morning]    │
│  → Navigate to Memories     │
└────────────────────────────┘
```

**Status: BUILT** — Renders dark screen with moon animation. Demo button for testing.

**What's missing:** No actual phone-lock mechanism. No DND/focus mode integration. No way to detect event completion to auto-transition.

### Flow 3.10 — Post-Event Memories

```
┌────────────────────────────┐
│  MEMORIES                   │
│                             │
│  GET /api/events/:id/memories│
│       │                     │
│       ▼                     │
│  Stats Grid (2x2)           │
│  👥 38 attended              │
│  📵 38 phones locked         │
│  🍹 127 drinks served        │
│  ⏰ 5 hours offline          │
│                             │
│  📸 Polaroid Gallery (2-col)│
│  - Random rotation          │
│  - Caption + credit         │
│  - Tap → lightbox           │
│                             │
│  💬 Overheard Quotes         │
│  - Quote cards with context │
│                             │
│  [reconnect with people]    │
│  [claim your vouch codes]   │
└────────────────────────────┘
```

**Status: BUILT** — Fetches memories from API, renders polaroids with lightbox, quotes, and stats. Empty state handled.

### Flow 3.11 — Reconnect (Mutual Matching)

```
┌────────────────────────────┐
│  RECONNECT                  │
│                             │
│  GET /api/events/:id/attendees│
│       │                     │
│       ▼                     │
│  ┌──────────────────┐       │
│  │ 🟢 Aisha         │       │
│  │ @aisha_blr        │      │
│  │ the connector     │      │
│  │ [connect]         │      │
│  └──────────────────┘       │
│       │                     │
│  Tap connect                │
│       │                     │
│  POST /api/events/:id/connect│
│       │                     │
│  ┌── mutual: false ──┐      │
│  │  Button → "sent ✓" │     │
│  └───────────────────┘      │
│                             │
│  ┌── mutual: true ───┐      │
│  │  🎉 MUTUAL MATCH!  │     │
│  │  "you & Aisha"     │     │
│  │  @aisha_ig          │    │
│  │  [Nice ✌️]          │    │
│  └───────────────────┘      │
└────────────────────────────┘
```

**Status: BUILT** — Attendee list, connect button, mutual detection, Instagram reveal on mutual, celebration modal.

**What's missing:** 48-hour reconnect window is stored but not enforced on the frontend. No expiry UI.

### Flow 3.12 — Vouch Codes

```
┌────────────────────────────┐
│  VOUCH CODES                │
│                             │
│  [claim your vouch codes]   │
│  POST /api/vouch-codes/claim│
│  (2 codes per event)        │
│       │                     │
│       ▼                     │
│  "from this event" section  │
│  ┌──────────────────┐       │
│  │ •••••••••• [tap]  │      │
│  │ OFF-AB2D3X [copy] │      │
│  └──────────────────┘       │
│                             │
│  "other codes" section      │
│  ┌──────────────────┐       │
│  │ OFF-XY9Z2K (used) │      │
│  └──────────────────┘       │
└────────────────────────────┘
```

**Status: BUILT** — Claim, reveal, copy-to-clipboard all work. Used codes shown as greyed out.

### Flow 3.13 — User Profile

```
┌────────────────────────────┐
│  PROFILE                    │
│                             │
│  GET /api/users/me          │
│       │                     │
│       ▼                     │
│  Avatar + Name + Handle     │
│  Vibe tag badge             │
│  Member since date          │
│                             │
│  Instagram handle           │
│  [@handle] [edit] → inline  │
│  PUT /api/users/me          │
│                             │
│  Stats (2x2)                │
│  🎪 Events  🤝 Connections  │
│  ✉️ Codes   ⭐ Vouched      │
│                             │
│  🏅 Badges (if any)         │
│                             │
│  📋 Event History            │
│  - Event name, date, status │
│                             │
│  Entry path footer          │
│  [logout] (red)             │
└────────────────────────────┘
```

**Status: BUILT** — Full profile display, Instagram edit/save, stats, badges, event history, logout.

### Flow 3.14 — In-App Chat

```
Bottom Nav → 💬 Chat
        │
        ▼
┌────────────────────────────┐
│  IN-APP CHAT (full modal)   │
│                             │
│  System: "Hey — welcome..." │
│                             │
│  Quick replies:             │
│  [what is come offline?]    │
│  [how do i get in?]         │
│  [what happens at events?]  │
│  [i want to prove myself]   │
│                             │
│  POST /api/chat             │
│  Claude Sonnet 4.5          │
│  (configurable system prompt)│
│                             │
│  [type message...] [↑ send] │
└────────────────────────────┘
```

**Status: BUILT** — Chat works end-to-end with Claude API. Quick replies, typing indicator, auto-scroll.

---

## 4. Admin Dashboard Flows

### Flow 4.1 — Dashboard Overview

```
Tab: dashboard
┌────────────────────────────┐
│  4 stat cards (all show "—")│
│  Total Members              │
│  Active Events              │
│  Total RSVPs                │
│  Vouch Codes Used           │
└────────────────────────────┘
```

**Status: PLACEHOLDER** — Cards render but values are hardcoded `"—"`. No API calls.

### Flow 4.2 — Events Management

```
Tab: events
┌────────────────────────────┐
│  "events management —       │
│   coming soon"              │
└────────────────────────────┘
```

**Status: NOT BUILT** — Placeholder text only. API endpoints exist (`GET/POST/PUT /api/admin/events`) but no UI.

### Flow 4.3 — Content Management (Memories)

```
Tab: content
┌────────────────────────────┐
│  Event ID: [___________]    │
│                             │
│  📸 Add Polaroid            │
│  URL, Caption, Who          │
│  [add polaroid]             │
│                             │
│  💬 Add Overheard Quote      │
│  Quote, Context             │
│  [add quote]                │
│                             │
│  📊 Update Event Stats       │
│  Attended, Phones, Drinks,  │
│  Hours                      │
│  [update stats]             │
└────────────────────────────┘
```

**Status: BUILT** — All three forms work, POST/PUT to API, success/error feedback.

### Flow 4.4 — Application Review

```
Tab: applications
┌────────────────────────────┐
│  Filter: [pending] [approved]│
│         [rejected]           │
│                             │
│  GET /api/admin/applications│
│       │                     │
│       ▼                     │
│  ┌──────────────────┐       │
│  │ Applicant Name    │      │
│  │ Date · N answers  │      │
│  │ ● pending         │      │
│  │                   │      │
│  │ (expanded)        │      │
│  │ Q: question       │      │
│  │ A: answer         │      │
│  │                   │      │
│  │ [approve] [reject]│      │
│  └──────────────────┘       │
│                             │
│  On approve:                │
│  → Creates PROVED-xxx code  │
│  → Shows code in card       │
└────────────────────────────┘
```

**Status: BUILT** — Filter, expand, approve/reject all functional. Invite code generated on approval.

### Flow 4.5 — Member Directory

```
Tab: members
┌────────────────────────────┐
│  Search: [___________]      │
│  Showing X members          │
│                             │
│  GET /api/admin/members     │
│       │                     │
│       ▼                     │
│  ┌──────────────────┐       │
│  │ 🟠 Aisha          │      │
│  │ @aisha · connector │     │
│  │ ● active           │     │
│  │ invite code         │    │
│  └──────────────────┘       │
└────────────────────────────┘
```

**Status: BUILT** — Fetches members, client-side search, entry path labels.

### Flow 4.6 — Settings

```
Tab: settings
┌────────────────────────────┐
│  🤖 Chatbot Personality     │
│  [textarea: system prompt]  │
│  [save]                     │
│                             │
│  ✉️ Vouch Settings           │
│  Codes for first event: [2] │
│  Codes for repeat: [2]      │
│  Reconnect window: [48] hrs │
│  No-show penalty: [dropdown]│
│  [save]                     │
└────────────────────────────┘
```

**Status: BUILT** — Both settings sections load and save to API.

---

## 5. API Coverage

### Endpoints Built & Wired to Frontend

| Endpoint | Method | Used By | Status |
|----------|--------|---------|--------|
| `/api/health` | GET | — | ✅ Built |
| `/api/auth/validate-code` | POST | App (TheGate) | ✅ Wired |
| `/api/events` | GET | App (EventFeed) | ✅ Wired |
| `/api/events/:id` | GET | App | ✅ Built |
| `/api/events/:id/rsvp` | POST | App (EventDetail) | ✅ Wired |
| `/api/events/:id/rsvp` | GET | App | ✅ Built |
| `/api/events/:id/rsvp/:id` | DELETE | App | ✅ Built, not wired |
| `/api/events/:id/memories` | GET | App (Memories) | ✅ Wired |
| `/api/events/:id/attendees` | GET | App (Reconnect) | ✅ Wired |
| `/api/events/:id/connect` | POST | App (Reconnect) | ✅ Wired |
| `/api/users/me` | GET | App (Profile) | ✅ Wired |
| `/api/users/me` | PUT | App (Profile) | ✅ Wired |
| `/api/vouch-codes` | GET | App (Vouch) | ✅ Wired |
| `/api/vouch-codes/claim` | POST | App (Vouch) | ✅ Wired |
| `/api/chat` | POST | Landing + App | ✅ Wired |
| `/api/applications` | POST | — | ✅ Built, not wired |
| `/api/admin/applications` | GET | Admin | ✅ Wired |
| `/api/admin/applications/:id/approve` | PUT | Admin | ✅ Wired |
| `/api/admin/applications/:id/reject` | PUT | Admin | ✅ Wired |
| `/api/admin/members` | GET | Admin | ✅ Wired |
| `/api/admin/events` | GET/POST/PUT | Admin | ✅ Built, not wired |
| `/api/admin/events/:id/polaroids` | POST | Admin (Content) | ✅ Wired |
| `/api/admin/events/:id/quotes` | POST | Admin (Content) | ✅ Wired |
| `/api/admin/events/:id/stats` | PUT | Admin (Content) | ✅ Wired |
| `/api/admin/settings/chatbot` | GET/PUT | Admin (Settings) | ✅ Wired |
| `/api/admin/settings/vouch` | GET/PUT | Admin (Settings) | ✅ Wired |

---

## 6. What's Built (Complete)

### Landing Page
- [x] Full marketing funnel with 10+ sections
- [x] Scroll animations (IntersectionObserver)
- [x] Decorative components (stickers, stamps, seals, polaroids)
- [x] Animated stat counters
- [x] Social proof ticker
- [x] Event capacity bars
- [x] Chatbot bottom sheet with Claude API integration
- [x] Floating chat button on scroll
- [x] Responsive design with fluid typography
- [x] Film grain texture overlay
- [x] Full color palette and typography system (4 fonts)

### Main App
- [x] PWA install gate (iOS + Android detection)
- [x] Invite code validation → Firebase auth → user creation
- [x] Onboarding acceptance screen with phased animations
- [x] Event feed with cards, spots bars, accent colors
- [x] Event detail bottom sheet with zones, includes, dress code
- [x] RSVP with atomic Firestore transactions
- [x] Countdown timer (live, updates every second)
- [x] Venue reveal progress bar
- [x] Canvas scratch card (mouse + touch)
- [x] Golden ticket reveal animation
- [x] Day-of event screen with venue + pickup info
- [x] Go dark screen (phone-free mode UI)
- [x] Post-event memories (polaroids, quotes, stats)
- [x] Photo lightbox
- [x] Reconnect: attendee list, one-way connect, mutual matching
- [x] Instagram reveal on mutual connection
- [x] Vouch code claiming (2 per event), reveal, copy
- [x] User profile with stats, badges, event history
- [x] Instagram handle editing
- [x] In-app chat with Claude (quick replies, typing indicator)
- [x] Bottom navigation (Events, Chat, Profile)
- [x] Stage-based navigation (Zustand state machine)
- [x] Logout flow
- [x] Noise/grain texture overlay on all screens
- [x] GlitchText rotating puns

### Admin
- [x] 6-tab navigation (dashboard, events, content, applications, members, settings)
- [x] Content management (add polaroids, quotes, update stats)
- [x] Application review (filter, expand, approve/reject)
- [x] Auto-generated invite codes for approved applicants (PROVED-xxx)
- [x] Member directory with search
- [x] Chatbot system prompt configuration
- [x] Vouch settings management

### API
- [x] Full REST API with 25+ endpoints
- [x] Firebase Auth middleware (user + admin)
- [x] Atomic RSVP transactions
- [x] Mutual connection matching
- [x] Vouch code generation (OFF-XXXXXX format, no confusing chars)
- [x] Claude chat integration with rate limiting (20/hr)
- [x] Configurable chatbot personality
- [x] Application submission, review, and approval pipeline
- [x] All admin CRUD endpoints

---

## 7. What's Partially Built

| Feature | What Exists | What's Missing |
|---------|-------------|----------------|
| **Landing code entry** | Client-side validation UI | Not wired to API. Redirect is `alert()`. Should call `/api/auth/validate-code` and redirect to app |
| **PWA manifest** | Layout metadata (manifest link, theme-color) | Actual `manifest.json` file not in `/public`. Service worker not implemented |
| **Onboarding persistence** | `has_seen_welcome` checked in stage logic | Not persisted to Firestore on acceptance (only local state) |
| **Countdown → Reveal transition** | Manual button to advance | Should auto-transition when `venue_reveal_date` passes |
| **RSVP cancellation** | API endpoint built (`DELETE /api/events/:id/rsvp/:id`) | No cancel button in the app UI |
| **Admin dashboard stats** | 4 stat cards rendered | Values are `"—"` — not fetched from API |
| **Admin events management** | API endpoints built (CRUD) | No UI — shows "coming soon" |
| **Prove-yourself pipeline** | Application API + admin review UI | Landing chatbot can't trigger application submission. No form to collect name + answers |
| **Reconnect window expiry** | `window_expires` stored (48hr) | Not enforced on frontend. No UI showing time remaining |
| **Event status transitions** | API endpoint to update status | No automated lifecycle (draft → upcoming → live → completed) |

---

## 8. What's Missing / Left To Build

### High Priority (Core Experience)

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 1 | **Landing → App redirect** | Wire landing code entry to API validation + actual redirect to app subdomain | Small |
| 2 | **manifest.json + Service Worker** | Create PWA manifest with icons, splash screens. Add basic SW for offline shell | Medium |
| 3 | **Prove-Yourself form** | Landing chatbot → structured Q&A → `POST /api/applications` → admin reviews → code issued | Medium |
| 4 | **Auto stage transitions** | Countdown → Reveal (on date), DayOf → GoDark (on event start), GoDark → Memories (on event end) | Medium |
| 5 | **Admin event CRUD UI** | Create, edit, publish events from admin dashboard. UI for the existing API | Medium |
| 6 | **Admin dashboard stats** | Wire up real data: total members, active events, RSVPs, codes used | Small |
| 7 | **Persist onboarding state** | PUT `has_seen_welcome: true` to Firestore when user accepts rules | Small |

### Medium Priority (Polish & Reliability)

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 8 | **Push notifications** | FCM setup: venue reveal reminder, event day reminder, pickup arrival, post-event nudge | Large |
| 9 | **RSVP cancellation UI** | Cancel button on countdown screen, confirmation dialog, refund spot | Small |
| 10 | **Reconnect timer** | Show "X hours left to connect" countdown, disable connect after 48hr window | Small |
| 11 | **Error handling & retries** | Network error toasts, retry buttons, offline queue for mutations | Medium |
| 12 | **Loading skeletons** | Replace "loading..." text with skeleton placeholders across all screens | Small |
| 13 | **Image upload (polaroids)** | Admin currently enters URLs manually. Add Firebase Storage upload | Medium |
| 14 | **Pickup point selection** | Let users pick their pickup point during RSVP (currently auto-assigns first) | Small |
| 15 | **Event capacity updates** | Real-time spots remaining (currently static after page load) | Small |

### Lower Priority (Growth & Scale)

| # | Feature | Description | Effort |
|---|---------|-------------|--------|
| 16 | **Admin auth** | Login page for admin dashboard (currently unprotected on frontend) | Medium |
| 17 | **Email notifications** | Welcome email, RSVP confirmation, venue reveal email, post-event recap | Large |
| 18 | **Analytics** | Event performance, funnel metrics, chatbot conversion rate | Medium |
| 19 | **Waitlist** | For sold-out events: join waitlist, notify on cancellation | Medium |
| 20 | **Shared UI package** | Extract common components (buttons, cards, modals) to `packages/ui` | Medium |
| 21 | **Photo upload by attendees** | Let attendees upload their own event photos to memories | Medium |
| 22 | **Badge system** | Define and auto-award badges (first event, 5 events, social butterfly, etc.) | Medium |
| 23 | **Multiple events support** | Currently the app tracks one `currentEvent`. Support attending multiple future events | Medium |
| 24 | **Payment/ticketing** | Paid events: Razorpay/Stripe integration for ticket purchases | Large |
| 25 | **Referral tracking** | Track which vouch codes lead to active members (attribution chain) | Medium |
| 26 | **Content moderation** | Review chat logs, flag inappropriate messages, ban users | Medium |
| 27 | **SEO & meta tags** | Dynamic OG images, event-specific landing pages | Medium |
| 28 | **Deployment** | CI/CD pipeline, staging environment, production deployment (Vercel + Cloud Run) | Large |

---

## Appendix: Database Collections

```
Firestore
├── users/
│   └── {uid}                    → User profile, badges, status
├── events/
│   └── {eventId}               → Event details, stats, venue
│       ├── rsvps/{rsvpId}      → RSVP records
│       ├── polaroids/{id}      → Photo memories
│       └── quotes/{id}         → Overheard quotes
├── vouch_codes/
│   └── {codeId}                → Invite/vouch codes
├── applications/
│   └── {appId}                 → Prove-yourself applications
├── connections/
│   └── {connId}                → User connections (mutual matching)
└── settings/
    ├── chatbot                 → System prompt
    ├── vouch                   → Vouch code config
    └── rate_limit:{uid}        → Chat rate limits
```

---

*Generated: Feb 15, 2026*
