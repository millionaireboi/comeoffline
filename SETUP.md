# Come Offline — Setup Guide

## Prerequisites
- Node.js 18+ and npm
- Firebase project
- Google Cloud account (for Gemini API)

---

## 1. Environment Setup

### A. Copy `.env.example` to `.env`
```bash
cp .env.example .env
```

### B. Firebase Configuration

1. **Create Firebase Project:**
   - Go to [Firebase Console](https://console.firebase.google.com/)
   - Create new project: "comeoffline" (or your name)

2. **Enable Authentication:**
   - Authentication → Get Started
   - Enable Email/Password provider

3. **Create Firestore Database:**
   - Firestore Database → Create Database
   - Start in **test mode** (change to production rules later)
   - Choose your region (asia-south1 for India)

4. **Get Web App Config:**
   - Project Settings → General → Your apps → Web app
   - Copy the config values to `.env`:
   ```
   NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=comeoffline.firebaseapp.com
   NEXT_PUBLIC_FIREBASE_PROJECT_ID=comeoffline
   NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=comeoffline.appspot.com
   NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123...
   NEXT_PUBLIC_FIREBASE_APP_ID=1:123...
   ```

5. **Download Service Account Key:**
   - Project Settings → Service Accounts
   - Click "Generate New Private Key"
   - Save as `service-account.json` in project root
   - Copy the entire JSON as a **single line** to `.env`:
   ```
   FIREBASE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"comeoffline",...}
   ```

   OR just reference the file path in `apps/api/src/config/firebase-admin.ts`

6. **Enable Cloud Messaging:**
   - Project Settings → Cloud Messaging
   - Copy Web Push Certificate (VAPID key) to `.env`:
   ```
   NEXT_PUBLIC_FIREBASE_VAPID_KEY=BH7a...
   ```

### C. Gemini API (Chatbot)

1. **Get Gemini API Key:**
   - Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Sign in with Google account
   - Click "Create API Key"
   - Copy the key to `.env`:
   ```
   GOOGLE_AI_API_KEY=AIza...
   ```

2. **Model Used:** `gemini-2.0-flash-exp` (fast, cheap, conversational)

### D. Web Push (VAPID Keys)

Generate VAPID keys for push notifications:

```bash
npx web-push generate-vapid-keys
```

Copy the output to `.env`:
```
WEB_PUSH_VAPID_PUBLIC_KEY=BH7a...
WEB_PUSH_VAPID_PRIVATE_KEY=abc123...
```

### E. URLs

For local development:
```
NEXT_PUBLIC_API_URL=http://localhost:8080
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
```

---

## 2. Install Dependencies

```bash
npm install
```

---

## 3. Create Admin User

### Option A: Create via Firebase Console
1. Go to Firebase Console → Authentication → Users
2. Click "Add User"
3. Email: `admin@comeoffline.com` (or your email)
4. Password: (set a strong password)

### Option B: Sign up through your app
1. Start the landing page: `npm run dev`
2. Use chatbot to create an account
3. Note the email you used

### Grant Admin Privileges

Run the admin script:

```bash
node scripts/make-admin.js admin@comeoffline.com
```

Expected output:
```
✅ Successfully granted admin privileges to admin@comeoffline.com
   User ID: abc123...
   The user needs to sign out and sign back in for changes to take effect.
```

**Important:** Sign out and sign back in for the admin claim to take effect.

---

## 4. Start the Apps

### Development (all apps):
```bash
npm run dev
```

This starts:
- **Landing:** http://localhost:3000
- **App (PWA):** http://localhost:3001
- **Admin:** http://localhost:3002
- **API:** http://localhost:8080

### Individual apps:
```bash
npm run dev --filter=landing    # Landing page only
npm run dev --filter=app        # PWA only
npm run dev --filter=admin      # Admin panel only
npm run dev --filter=api        # API only
```

---

## 5. Admin Panel Access

The admin panel (`http://localhost:3002`) currently has **no auth UI**. Options:

### Option A: Add Firebase Auth UI (Quick)

Add this to `apps/admin/src/app/page.tsx`:

```tsx
import { useAuth } from "@/hooks/useAuth"; // You'll need to create this or copy from app

export default function Home() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <LoginScreen />; // Create a simple login form

  // Rest of admin UI...
}
```

### Option B: Use Same Firebase Auth as Main App

Sign in through the main app (`http://localhost:3001`) with your admin account, then open admin panel in the same browser (shares Firebase session).

### Option C: Direct Firebase Auth (Temporary)

Use browser console:
```js
// On http://localhost:3002
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
const auth = getAuth();
signInWithEmailAndPassword(auth, 'admin@comeoffline.com', 'your-password');
```

---

## 6. Create Your First Event

1. Sign in to admin panel as admin
2. Go to "events" tab
3. Click "create event"
4. Fill in:
   - Title, tagline, description
   - Date, time, total spots
   - Venue details (area, name, address)
   - Pickup points (if using ticketing)
   - **Ticket tiers** (or toggle "free event")
5. Click "publish"
6. Event now visible in PWA feed!

---

## 7. Create Seed Invite Codes

1. Admin panel → "invite-codes" tab
2. Click "create codes"
3. Set quantity (1-100)
4. Add label (e.g., "Founding 50")
5. Click "generate codes"
6. Copy codes and share with first users!

---

## 8. Test the Full Flow

### User Journey:
1. Visit landing page: `http://localhost:3000`
2. Enter invite code → redirected to PWA
3. Install PWA → onboarding acceptance screen
4. See events feed → buy ticket (tiered) or RSVP (free)
5. Countdown to event → venue revealed
6. Day-of screen with QR code
7. Admin scans QR to check in
8. After event: reconnect window (48hr)
9. Memories screen next morning

### Admin Journey:
1. Create event with tiers
2. Check-in tab: scan QR codes
3. Validation tab: review provisional users
4. Content tab: upload memories + send push notifications
5. Dashboard: see stats

---

## 9. Chatbot Configuration

The chatbot system prompt is stored in Firestore:

1. **Default Prompt:** Located in `apps/api/src/services/chat.service.ts`
2. **Admin Override:**
   - Admin panel → "settings" tab
   - Update "Chatbot System Prompt"
   - Stored in `settings/chatbot` Firestore doc

### Vibe Check Flow (Landing Page):
The chatbot on the landing page is configured to:
1. Greet the user
2. Ask 2-3 personality/vibe questions
3. Collect name + Instagram handle
4. Make pass/fail decision
5. On pass: create provisional account + redirect to PWA

Edit the prompt in admin settings to adjust the vibe check criteria.

---

## 10. Firestore Indexes (Important!)

You'll need to create composite indexes for queries. Firebase will prompt you with error messages containing direct links to create them.

Common indexes needed:
- `vouch_codes`: `owner_id` + `created_at` (DESC)
- `tickets`: `user_id` + `event_id`
- `connections`: `event_id` + `from_user_id`
- `rsvps`: `event_id` + `user_id`

When you see an index error in the API logs, click the link in the error message to auto-create the index.

---

## Troubleshooting

### "Firebase app already initialized"
- Restart dev server
- Check that `typeof window !== "undefined"` guards are in place

### "CORS error"
- Check `ALLOWED_ORIGINS` in `.env` includes your frontend URLs
- Restart API server after env changes

### "Admin access required"
- Sign out and sign back in after running `make-admin.js`
- Check Firebase Auth token in browser console: `auth.currentUser.getIdTokenResult()` should show `admin: true` in claims

### Chatbot not responding
- Check `GOOGLE_AI_API_KEY` is set in `.env`
- Check API logs for Gemini errors
- Verify API key is valid at https://aistudio.google.com/

### PWA not installing
- Must use HTTPS in production
- Manifest.json served correctly
- Service worker registered (`/sw.js`)

---

## Production Deployment

See `DEPLOYMENT.md` for Cloud Run + Firebase Hosting setup.

---

## Next Steps

- [ ] Add auth UI to admin panel
- [ ] Upload logo/icons (192x192, 512x512) for PWA manifest
- [ ] Set up Razorpay for real payments (replace mock payment flow)
- [ ] Configure Firestore security rules (currently test mode)
- [ ] Set up Cloud Functions for scheduled tasks (cleanup, reminders)
- [ ] Add email/SMS notifications (Twilio, SendGrid)

---

**Need help?** Check the code comments or reach out!
