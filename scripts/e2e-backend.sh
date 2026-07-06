#!/usr/bin/env bash
# Come Offline — one-command backend e2e.
# Starts Firebase emulators (auth + firestore) and an isolated API instance
# on port 8090 with WhatsApp/PostHog/FB-conversions disabled, runs the test
# suite in scripts/e2e-backend.mjs, then tears everything down.
#
# Requirements: Java (brew install openjdk), .env at repo root.
# Note: the paid-flow test creates a real ₹1 Razorpay payment link (never paid,
# auto-expires in 16 min). Firestore/Auth never touch prod — emulators only.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

export PATH="/opt/homebrew/opt/openjdk/bin:$PATH"
FIRESTORE_PORT=8089
AUTH_PORT=9099
API_PORT=8090
PROJECT_ID="$(grep -o '^NEXT_PUBLIC_FIREBASE_PROJECT_ID=.*' .env | cut -d= -f2)"

cleanup() {
  echo "── tearing down ──"
  [[ -n "${API_PID:-}" ]] && kill "$API_PID" 2>/dev/null || true
  [[ -n "${EMU_PID:-}" ]] && kill "$EMU_PID" 2>/dev/null || true
  sleep 2
  # Sweep orphaned children precisely by port (the subshell kill can leave the
  # tsx child alive; firebase-tools leaves java children). Never pkill by name —
  # that could hit the real dev API.
  lsof -ti "tcp:$API_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  lsof -ti "tcp:$FIRESTORE_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
  lsof -ti "tcp:$AUTH_PORT" 2>/dev/null | xargs kill 2>/dev/null || true
}
trap cleanup EXIT

echo "── starting emulators (project: $PROJECT_ID) ──"
npx firebase-tools emulators:start --only auth,firestore --project "$PROJECT_ID" >/tmp/co-e2e-emulators.log 2>&1 &
EMU_PID=$!

for i in $(seq 1 45); do
  a=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$AUTH_PORT" 2>/dev/null || true)
  f=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$FIRESTORE_PORT" 2>/dev/null || true)
  [[ "$a" == "200" && "$f" == "200" ]] && break
  [[ "$i" == "45" ]] && { echo "emulators failed to start — see /tmp/co-e2e-emulators.log"; exit 1; }
  sleep 2
done
echo "emulators up"

echo "── starting isolated API on :$API_PORT ──"
(
  cd apps/api
  FIRESTORE_EMULATOR_HOST="127.0.0.1:$FIRESTORE_PORT" \
  FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:$AUTH_PORT" \
  PORT="$API_PORT" NODE_ENV=development \
  WHATSAPP_ACCESS_TOKEN="" WHATSAPP_PHONE_NUMBER_ID="" WHATSAPP_WABA_ID="" \
  NEXT_PUBLIC_POSTHOG_KEY="" FB_PIXEL_ID="" FB_CONVERSIONS_API_TOKEN="" \
  npx tsx src/index.ts >/tmp/co-e2e-api.log 2>&1
) &
API_PID=$!

for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$API_PORT/api/health" 2>/dev/null || true)
  [[ "$code" == "200" ]] && break
  [[ "$i" == "30" ]] && { echo "API failed to start — see /tmp/co-e2e-api.log"; exit 1; }
  sleep 1
done
echo "API up"

echo "── running e2e suite ──"
FIRESTORE_EMULATOR_HOST="127.0.0.1:$FIRESTORE_PORT" \
FIREBASE_AUTH_EMULATOR_HOST="127.0.0.1:$AUTH_PORT" \
node scripts/e2e-backend.mjs
