"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@comeoffline/ui";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import { ImageUpload } from "@/components/ImageUpload";

interface EventOption {
  id: string;
  title: string;
  date: string;
  status: string;
}

interface NotificationRecord {
  id: string;
  title: string;
  body: string;
  audience: string;
  sent_count: number;
  failed_count: number;
  sent_at: string;
}

function NotificationComposer() {
  const { getIdToken } = useAuth();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState("");
  const [history, setHistory] = useState<NotificationRecord[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setHistory(data.data);
    } catch (err) {
      console.error("Failed to fetch notification history:", err);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (showHistory) fetchHistory();
  }, [showHistory, fetchHistory]);

  async function handleSend() {
    if (!title || !body) return;
    setSending(true);
    setResult("");
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/notifications`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, audience }),
      });
      const data = await res.json();
      if (data.success) {
        setResult(`Sent to ${data.data.sent} users (${data.data.failed} failed)`);
        setTitle("");
        setBody("");
        if (showHistory) fetchHistory();
      } else {
        setResult(`Error: ${data.error}`);
      }
    } catch (err) {
      setResult(`Network error: ${err}`);
    } finally {
      setSending(false);
      setTimeout(() => setResult(""), 5000);
    }
  }

  const AUDIENCE_LABELS: Record<string, string> = {
    all: "all users",
    active: "active members",
    provisional: "provisional users",
  };

  return (
    <section className="rounded-xl border border-white/5 p-5">
      <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">push notifications</h3>

      {result && (
        <div className="mb-4 rounded-lg bg-caramel/10 px-4 py-2.5 font-mono text-[11px] text-caramel">
          {result}
        </div>
      )}

      <div className="space-y-3">
        <div>
          <label className="mb-1 block font-mono text-[9px] text-muted">audience</label>
          <select
            value={audience}
            onChange={(e) => setAudience(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
          >
            <option value="all">All users</option>
            <option value="active">Active members only</option>
            <option value="provisional">Provisional users only</option>
          </select>
          <p className="mt-1 font-mono text-[9px] text-muted/50">
            or paste an event ID to target its ticket holders
          </p>
        </div>

        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Notification title..."
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
        />

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Notification body..."
          rows={3}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
        />

        <div className="flex items-center gap-3">
          <button
            onClick={handleSend}
            disabled={sending || !title || !body}
            className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {sending ? "sending..." : "send now"}
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="font-mono text-[10px] text-muted hover:text-cream"
          >
            {showHistory ? "hide history" : "show history"}
          </button>
        </div>
      </div>

      {showHistory && history.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-[1px] text-muted">recent notifications</p>
          {history.map((n) => (
            <div key={n.id} className="rounded-lg bg-white/5 px-4 py-3">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-sans text-[13px] font-medium text-cream">{n.title}</p>
                  <p className="font-mono text-[11px] text-cream/60">{n.body}</p>
                </div>
                <span className="shrink-0 rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] text-muted">
                  {AUDIENCE_LABELS[n.audience] || n.audience}
                </span>
              </div>
              <p className="mt-2 font-mono text-[9px] text-muted/50">
                {new Date(n.sent_at).toLocaleString()} &middot; {n.sent_count} sent, {n.failed_count} failed
              </p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export function ContentTab() {
  const { getIdToken } = useAuth();
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [eventId, setEventId] = useState("");
  const [polaroidUrl, setPolaroidUrl] = useState("");
  const [polaroidCaption, setPolaroidCaption] = useState("");
  const [polaroidWho, setPolaroidWho] = useState("");
  const [quoteText, setQuoteText] = useState("");
  const [quoteContext, setQuoteContext] = useState("");
  const [statsAttended, setStatsAttended] = useState("");
  const [statsPhones, setStatsPhones] = useState("");
  const [statsDrinks, setStatsDrinks] = useState("");
  const [statsHours, setStatsHours] = useState("");
  const [status, setStatus] = useState("");

  // Fetch events for dropdown
  useEffect(() => {
    async function fetchEvents() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/events`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) setEvents(data.data);
      } catch (err) {
        console.error("Failed to fetch events:", err);
      } finally {
        setLoadingEvents(false);
      }
    }
    fetchEvents();
  }, [getIdToken]);

  async function addPolaroid() {
    if (!eventId || !polaroidUrl) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/events/${eventId}/polaroids`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: polaroidUrl, caption: polaroidCaption, who: polaroidWho }),
      });
      if (res.ok) {
        setStatus("Polaroid added!");
        setPolaroidUrl("");
        setPolaroidCaption("");
        setPolaroidWho("");
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  async function addQuote() {
    if (!eventId || !quoteText) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/events/${eventId}/quotes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ quote: quoteText, context: quoteContext }),
      });
      if (res.ok) {
        setStatus("Quote added!");
        setQuoteText("");
        setQuoteContext("");
      }
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  async function updateStats() {
    if (!eventId) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/events/${eventId}/stats`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          attended: parseInt(statsAttended) || 0,
          phones: parseInt(statsPhones) || 0,
          drinks: parseInt(statsDrinks) || 0,
          hours: statsHours || "0",
        }),
      });
      if (res.ok) setStatus("Stats updated!");
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">select event</label>
        {loadingEvents ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-muted">
            Loading events...
          </div>
        ) : events.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-muted">
            No events found. Create an event first.
          </div>
        ) : (
          <select
            value={eventId}
            onChange={(e) => setEventId(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
          >
            <option value="">Choose an event...</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({formatDate(event.date)}) • {event.status}
              </option>
            ))}
          </select>
        )}
      </div>

      {status && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">{status}</div>
      )}

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">add polaroid</h3>
        <div className="space-y-3">
          <ImageUpload
            value={polaroidUrl}
            onChange={setPolaroidUrl}
            pathPrefix="events/polaroids"
            label="upload polaroid"
          />
          <div className="flex gap-3">
            <input type="text" value={polaroidCaption} onChange={(e) => setPolaroidCaption(e.target.value)} placeholder="Caption..." className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
            <input type="text" value={polaroidWho} onChange={(e) => setPolaroidWho(e.target.value)} placeholder="Who..." className="w-32 rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
          <button onClick={addPolaroid} className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">add polaroid</button>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">add overheard quote</h3>
        <div className="space-y-3">
          <input type="text" value={quoteText} onChange={(e) => setQuoteText(e.target.value)} placeholder="Quote..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          <input type="text" value={quoteContext} onChange={(e) => setQuoteContext(e.target.value)} placeholder="Context..." className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          <button onClick={addQuote} className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">add quote</button>
        </div>
      </section>

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">event stats</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">attended</label>
            <input type="number" value={statsAttended} onChange={(e) => setStatsAttended(e.target.value)} placeholder="0" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">phones locked</label>
            <input type="number" value={statsPhones} onChange={(e) => setStatsPhones(e.target.value)} placeholder="0" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">drinks served</label>
            <input type="number" value={statsDrinks} onChange={(e) => setStatsDrinks(e.target.value)} placeholder="0" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">hours offline</label>
            <input type="text" value={statsHours} onChange={(e) => setStatsHours(e.target.value)} placeholder="0" className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none" />
          </div>
        </div>
        <button onClick={updateStats} className="mt-4 rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">update stats</button>
      </section>

      <NotificationComposer />
    </div>
  );
}
