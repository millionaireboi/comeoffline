"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { instrumentSerif, API_URL } from "@/lib/constants";
import type { Event } from "@comeoffline/types";

interface TicketData {
  id: string;
  user_name?: string;
  user_handle?: string;
  tier_name: string;
  pickup_point: string;
  status: string;
  checked_in_at?: string;
  checked_in_headcount?: number;
  quantity?: number;
}

interface ScanResult {
  success: boolean;
  message: string;
  ticket?: TicketData;
  error_code?: string;
}

interface QueuedCheckIn {
  ticket_id: string;
  event_id: string;
  signature?: string;
  headcount?: number;
  timestamp: string;
  retries: number;
}

// ——— Audio feedback (inline beep via Web Audio API, no external files) ———
function playBeep(success: boolean) {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.value = success ? 880 : 300;
    gain.gain.value = 0.3;
    oscillator.start();
    oscillator.stop(ctx.currentTime + (success ? 0.15 : 0.4));
    // Cleanup
    oscillator.onended = () => ctx.close();
  } catch {
    // Web Audio not available — silent fallback
  }
}

function triggerHaptic() {
  try {
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }
  } catch {
    // Vibration API not available
  }
}

// ——— Offline queue persistence ———
const QUEUE_KEY = "comeoffline_checkin_queue";
const FAILED_QUEUE_KEY = "comeoffline_checkin_failed";

function loadOfflineQueue(): QueuedCheckIn[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveOfflineQueue(queue: QueuedCheckIn[]) {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable
  }
}

function loadFailedQueue(): QueuedCheckIn[] {
  try {
    const raw = localStorage.getItem(FAILED_QUEUE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveFailedQueue(queue: QueuedCheckIn[]) {
  try {
    localStorage.setItem(FAILED_QUEUE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable
  }
}

export function CheckInTab() {
  const { getIdToken } = useAuth();
  const { data: allEvents } = useApi<Event[]>("/api/admin/events", {
    dedupingInterval: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });
  const events = (allEvents || []).filter((e) => e.status === "live" || e.status === "upcoming" || e.status === "listed");
  const [eventId, setEventId] = useState("");
  const [tickets, setTickets] = useState<TicketData[]>([]);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [manualSearch, setManualSearch] = useState("");
  const [ticketIdInput, setTicketIdInput] = useState("");
  const [cameraActive, setCameraActive] = useState(false);
  const [offlineQueue, setOfflineQueue] = useState<QueuedCheckIn[]>(loadOfflineQueue);
  const [failedQueue, setFailedQueue] = useState<QueuedCheckIn[]>(loadFailedQueue);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);
  const scannerRef = useRef<HTMLInputElement>(null);
  const cameraContainerRef = useRef<HTMLDivElement>(null);
  const html5QrScannerRef = useRef<InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null>(null);
  const scanResultTimeoutRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval>>(undefined);

  // ——— Online/offline detection ———
  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // ——— Load tickets for selected event ———
  const fetchTickets = useCallback(async () => {
    if (!eventId) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/tickets/admin/events/${eventId}/tickets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setTickets(data.data);
    } catch {
      // Silently fail — will retry on next poll
    }
  }, [eventId, getIdToken]);

  // Initial load
  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  // ——— Real-time polling every 10s ———
  useEffect(() => {
    if (!eventId) return;
    pollIntervalRef.current = setInterval(fetchTickets, 10_000);
    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, [eventId, fetchTickets]);

  // ——— Flush offline queue when back online ———
  useEffect(() => {
    if (!isOnline || offlineQueue.length === 0) return;

    async function flushQueue() {
      const token = await getIdToken();
      if (!token) return;

      const remaining: QueuedCheckIn[] = [];
      let flushedCount = 0;

      for (const item of offlineQueue) {
        try {
          const res = await fetch(`${API_URL}/api/tickets/check-in`, {
            method: "POST",
            headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({
              ticket_id: item.ticket_id,
              event_id: item.event_id,
              signature: item.signature,
              headcount: item.headcount,
            }),
          });
          const data = await res.json();
          if (data.success || data.error_code === "ALREADY_CHECKED_IN") {
            flushedCount++;
          } else if (item.retries < 3) {
            remaining.push({ ...item, retries: item.retries + 1 });
          } else {
            // Max retries exceeded — persist to failed queue for manual review
            const updatedFailed = [...loadFailedQueue(), item];
            setFailedQueue(updatedFailed);
            saveFailedQueue(updatedFailed);
          }
        } catch {
          remaining.push(item);
        }
      }

      setOfflineQueue(remaining);
      saveOfflineQueue(remaining);

      if (flushedCount > 0) {
        setScanResult({
          success: true,
          message: `Synced ${flushedCount} offline check-in${flushedCount > 1 ? "s" : ""}`,
        });
        fetchTickets();
        if (scanResultTimeoutRef.current) clearTimeout(scanResultTimeoutRef.current);
        scanResultTimeoutRef.current = setTimeout(() => setScanResult(null), 5000);
      }
    }

    flushQueue();
  }, [isOnline, offlineQueue, getIdToken, fetchTickets]);

  // ——— Core check-in handler ———
  const handleCheckIn = useCallback(
    async (ticketId: string, signature?: string, headcount?: number) => {
      // If offline, queue locally
      if (!isOnline) {
        const queueItem: QueuedCheckIn = {
          ticket_id: ticketId,
          event_id: eventId,
          signature,
          headcount,
          timestamp: new Date().toISOString(),
          retries: 0,
        };
        const newQueue = [...offlineQueue, queueItem];
        setOfflineQueue(newQueue);
        saveOfflineQueue(newQueue);
        playBeep(true);
        triggerHaptic();
        setScanResult({ success: true, message: "Queued offline — will sync when back online" });
        if (scanResultTimeoutRef.current) clearTimeout(scanResultTimeoutRef.current);
        scanResultTimeoutRef.current = setTimeout(() => setScanResult(null), 5000);
        return;
      }

      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/tickets/check-in`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            ticket_id: ticketId,
            event_id: eventId,
            signature,
            headcount,
          }),
        });
        const data = await res.json();

        if (data.success) {
          const ticket = data.data;
          const headcountInfo =
            ticket.total_quantity > 1
              ? ` (${ticket.checked_in_headcount}/${ticket.total_quantity} people)`
              : "";
          playBeep(true);
          triggerHaptic();
          setScanResult({
            success: true,
            message: `${ticket.user_name} checked in!${headcountInfo}`,
            ticket,
          });
          fetchTickets();
        } else {
          playBeep(false);
          triggerHaptic();
          setScanResult({
            success: false,
            message: data.error || "Check-in failed",
            ticket: data.data,
            error_code: data.error_code,
          });
        }

        if (scanResultTimeoutRef.current) clearTimeout(scanResultTimeoutRef.current);
        scanResultTimeoutRef.current = setTimeout(() => setScanResult(null), 8000);
      } catch {
        // Network failed mid-request — queue offline
        playBeep(false);
        const queueItem: QueuedCheckIn = {
          ticket_id: ticketId,
          event_id: eventId,
          signature,
          headcount,
          timestamp: new Date().toISOString(),
          retries: 0,
        };
        const newQueue = [...offlineQueue, queueItem];
        setOfflineQueue(newQueue);
        saveOfflineQueue(newQueue);
        setScanResult({ success: false, message: "Network error — queued for retry" });
        if (scanResultTimeoutRef.current) clearTimeout(scanResultTimeoutRef.current);
        scanResultTimeoutRef.current = setTimeout(() => setScanResult(null), 5000);
      }
    },
    [getIdToken, eventId, isOnline, offlineQueue, fetchTickets],
  );

  // ——— Parse QR data and check in ———
  const processQrData = useCallback(
    (raw: string) => {
      let ticketId = raw.trim();
      let signature: string | undefined;

      try {
        const parsed = JSON.parse(ticketId);
        if (parsed.ticket_id) ticketId = parsed.ticket_id;
        if (parsed.sig) signature = parsed.sig;
      } catch {
        // Raw ticket ID — use as-is
      }

      handleCheckIn(ticketId, signature);
    },
    [handleCheckIn],
  );

  // ——— Text input submit ———
  const handleScanSubmit = () => {
    if (!ticketIdInput.trim()) return;
    processQrData(ticketIdInput);
    setTicketIdInput("");
    scannerRef.current?.focus();
  };

  // ——— Camera QR scanner ———
  const startCamera = useCallback(async () => {
    if (!cameraContainerRef.current) return;

    try {
      const { Html5Qrcode } = await import("html5-qrcode");
      const scanner = new Html5Qrcode("qr-camera-viewport");
      html5QrScannerRef.current = scanner;

      // Request camera permission in the same user-gesture call stack (Safari requirement)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      // Stop the temporary stream — html5-qrcode will open its own
      stream.getTracks().forEach((t) => t.stop());

      // Now safe to show container and wait for DOM
      setCameraActive(true);
      await new Promise((r) => setTimeout(r, 100));

      await scanner.start(
        { facingMode: "environment", aspectRatio: { ideal: 1 } },
        {
          fps: 10,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const size = Math.min(viewfinderWidth, viewfinderHeight) * 0.7;
            return { width: Math.floor(size), height: Math.floor(size) };
          },
        },
        (decodedText) => {
          processQrData(decodedText);
          // Brief pause to prevent rapid re-scans of the same code
          scanner.pause(true);
          setTimeout(() => {
            try {
              scanner.resume();
            } catch {
              // Scanner may have been stopped
            }
          }, 2000);
        },
        () => {
          // QR parse error — ignore, camera keeps scanning
        },
      );
    } catch (err) {
      console.error("Camera start failed:", err);
      setCameraActive(false);
      setScanResult({ success: false, message: "Could not access camera. Check permissions." });
      if (scanResultTimeoutRef.current) clearTimeout(scanResultTimeoutRef.current);
      scanResultTimeoutRef.current = setTimeout(() => setScanResult(null), 5000);
    }
  }, [processQrData]);

  const stopCamera = useCallback(async () => {
    if (html5QrScannerRef.current) {
      try {
        await html5QrScannerRef.current.stop();
        html5QrScannerRef.current.clear();
      } catch {
        // Already stopped
      }
      html5QrScannerRef.current = null;
    }
    setCameraActive(false);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (html5QrScannerRef.current) {
        html5QrScannerRef.current.stop().catch(() => {});
      }
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (scanResultTimeoutRef.current) clearTimeout(scanResultTimeoutRef.current);
    };
  }, []);

  // Stop camera when switching events
  useEffect(() => {
    stopCamera();
  }, [eventId, stopCamera]);

  // ——— Derived state ———
  const filteredTickets = manualSearch
    ? tickets.filter(
        (t) =>
          t.user_name?.toLowerCase().includes(manualSearch.toLowerCase()) ||
          t.user_handle?.toLowerCase().includes(manualSearch.toLowerCase()),
      )
    : tickets;

  const checkedIn = tickets.filter((t) => t.status === "checked_in" || t.status === "partially_checked_in").length;
  const confirmedCount = tickets.filter((t) => t.status === "confirmed").length;

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      {/* Online/offline indicator */}
      {!isOnline && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-500/20 px-4 py-3 font-mono text-[11px] text-amber-400">
          <div className="h-2 w-2 rounded-full bg-amber-400" />
          offline — check-ins will be queued and synced when reconnected
          {offlineQueue.length > 0 && (
            <span className="ml-auto rounded-full bg-amber-400/20 px-2 py-0.5 text-amber-300">
              {offlineQueue.length} queued
            </span>
          )}
        </div>
      )}

      {/* Event selector */}
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
          select event
        </label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
        >
          <option value="">Choose event...</option>
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.emoji} {e.title} ({e.status})
            </option>
          ))}
        </select>
      </div>

      {eventId && (
        <>
          {/* Stats bar */}
          <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3">
            <div>
              <p className={`${instrumentSerif.className} text-2xl text-cream`}>{checkedIn}</p>
              <p className="font-mono text-[9px] text-muted">checked in</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className={`${instrumentSerif.className} text-2xl text-cream`}>{confirmedCount}</p>
              <p className="font-mono text-[9px] text-muted">remaining</p>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <p className={`${instrumentSerif.className} text-2xl text-cream`}>{tickets.length}</p>
              <p className="font-mono text-[9px] text-muted">total</p>
            </div>
            <div className="ml-auto h-2 w-32 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-sage transition-all duration-500"
                style={{ width: tickets.length > 0 ? `${(checkedIn / tickets.length) * 100}%` : "0%" }}
              />
            </div>
          </div>

          {/* Offline queue indicator */}
          {offlineQueue.length > 0 && isOnline && (
            <div className="rounded-xl bg-amber-500/10 px-4 py-2 font-mono text-[10px] text-amber-400">
              syncing {offlineQueue.length} queued check-in{offlineQueue.length > 1 ? "s" : ""}...
            </div>
          )}

          {/* Failed check-ins — items that exceeded max retries */}
          {failedQueue.length > 0 && (
            <div className="rounded-xl border border-terracotta/20 bg-terracotta/10 p-4">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-mono text-[11px] font-medium text-terracotta">
                  {failedQueue.length} failed check-in{failedQueue.length > 1 ? "s" : ""}
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      // Move failed items back to offline queue for retry
                      const retryItems = failedQueue.map((item) => ({ ...item, retries: 0 }));
                      const newQueue = [...offlineQueue, ...retryItems];
                      setOfflineQueue(newQueue);
                      saveOfflineQueue(newQueue);
                      setFailedQueue([]);
                      saveFailedQueue([]);
                    }}
                    className="rounded-lg bg-caramel/20 px-3 py-1 font-mono text-[10px] text-caramel hover:bg-caramel/30"
                  >
                    retry all
                  </button>
                  <button
                    onClick={() => {
                      setFailedQueue([]);
                      saveFailedQueue([]);
                    }}
                    className="rounded-lg bg-white/5 px-3 py-1 font-mono text-[10px] text-muted hover:bg-white/10"
                  >
                    dismiss
                  </button>
                </div>
              </div>
              <div className="space-y-1">
                {failedQueue.map((item, i) => (
                  <p key={i} className="font-mono text-[10px] text-terracotta/70">
                    ticket {item.ticket_id.slice(0, 8)}... — queued {new Date(item.timestamp).toLocaleTimeString()}
                  </p>
                ))}
              </div>
            </div>
          )}

          {/* Scan result banner — persistent until dismissed or timeout */}
          {scanResult && (
            <button
              onClick={() => setScanResult(null)}
              className={`w-full rounded-xl p-4 text-left font-mono text-sm transition-all ${
                scanResult.success
                  ? "bg-sage/20 text-sage"
                  : scanResult.error_code === "ALREADY_CHECKED_IN"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-terracotta/20 text-terracotta"
              }`}
            >
              <div className="flex items-start gap-2">
                <span className="text-lg">
                  {scanResult.success ? "\u2705" : scanResult.error_code === "ALREADY_CHECKED_IN" ? "\u26A0\uFE0F" : "\u274C"}
                </span>
                <div>
                  <p className="font-medium">{scanResult.message}</p>
                  {scanResult.ticket && (
                    <p className="mt-1 text-[10px] opacity-70">
                      {scanResult.ticket.tier_name} &middot; {scanResult.ticket.pickup_point}
                      {scanResult.ticket.quantity && scanResult.ticket.quantity > 1 && (
                        <span> &middot; {scanResult.ticket.quantity} people</span>
                      )}
                    </p>
                  )}
                </div>
                <span className="ml-auto text-[9px] opacity-40">tap to dismiss</span>
              </div>
            </button>
          )}

          {/* Camera QR scanner */}
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-cream">
                scan QR code
              </h3>
              <button
                onClick={cameraActive ? stopCamera : startCamera}
                className={`rounded-lg px-3 py-1.5 font-mono text-[10px] transition-all ${
                  cameraActive
                    ? "bg-terracotta/20 text-terracotta hover:bg-terracotta/30"
                    : "bg-caramel/20 text-caramel hover:bg-caramel/30"
                }`}
              >
                {cameraActive ? "stop camera" : "open camera"}
              </button>
            </div>

            {/* Camera viewport */}
            <div
              ref={cameraContainerRef}
              className={`overflow-hidden rounded-lg transition-all ${cameraActive ? "mb-3" : "h-0"}`}
            >
              <div id="qr-camera-viewport" className="w-full" />
            </div>

            {/* Text input fallback */}
            <p className="mb-3 font-mono text-[10px] text-muted">
              {cameraActive ? "or paste the ticket ID below" : "use the camera or paste the ticket ID below"}
            </p>
            <div className="flex gap-2">
              <input
                ref={scannerRef}
                type="text"
                value={ticketIdInput}
                onChange={(e) => setTicketIdInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleScanSubmit()}
                placeholder="Scan or paste ticket ID..."
                autoFocus
                className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
              <button
                onClick={handleScanSubmit}
                className="rounded-lg bg-caramel px-5 py-3 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80"
              >
                check in
              </button>
            </div>
          </div>

          {/* Attendee list */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-cream">
                attendee list
              </h3>
              <input
                type="text"
                value={manualSearch}
                onChange={(e) => setManualSearch(e.target.value)}
                placeholder="Search by name..."
                className="w-56 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
            </div>

            <div className="space-y-2">
              {filteredTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="flex items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4"
                >
                  <div>
                    <p className="font-sans text-sm font-medium text-cream">
                      {ticket.user_name || "Unknown"}
                      {ticket.quantity && ticket.quantity > 1 && (
                        <span className="ml-2 text-[10px] text-muted">
                          ({ticket.checked_in_headcount || 0}/{ticket.quantity})
                        </span>
                      )}
                    </p>
                    <p className="font-mono text-[10px] text-muted">
                      {ticket.tier_name} &middot; {ticket.pickup_point}
                    </p>
                  </div>
                  {ticket.status === "checked_in" ? (
                    <span className="rounded-full bg-sage/15 px-3 py-1 font-mono text-[10px] text-sage">
                      checked in
                    </span>
                  ) : ticket.status === "partially_checked_in" ? (
                    <button
                      onClick={() => handleCheckIn(ticket.id, undefined, 1)}
                      className="rounded-lg bg-amber-500/20 px-3 py-1.5 font-mono text-[10px] text-amber-400 hover:bg-amber-500/30"
                    >
                      +1 more
                    </button>
                  ) : ticket.status === "confirmed" ? (
                    <button
                      onClick={() => handleCheckIn(ticket.id)}
                      className="rounded-lg bg-caramel/20 px-3 py-1.5 font-mono text-[10px] text-caramel hover:bg-caramel/30"
                    >
                      check in
                    </button>
                  ) : (
                    <span className="rounded-full bg-white/5 px-3 py-1 font-mono text-[10px] text-muted">
                      {ticket.status === "cancelled"
                        ? "cancelled"
                        : ticket.status === "pending_payment"
                          ? "unpaid"
                          : ticket.status}
                    </span>
                  )}
                </div>
              ))}
              {filteredTickets.length === 0 && (
                <p className="py-8 text-center font-mono text-[11px] text-muted/40">
                  {manualSearch ? "no matching attendees" : "no tickets yet"}
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
