"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@comeoffline/ui";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { instrumentSerif, API_URL } from "@/lib/constants";
import { TableRowSkeleton } from "@/components/Skeleton";
import type { Event } from "@comeoffline/types";

interface ValidationQueueItem {
  user_id: string;
  name: string;
  handle: string;
  entry_path: string;
  vibe_tag: string;
  vibe_check_answers: Array<{ question: string; answer: string }>;
  second_chance: boolean;
  events_attended: number;
  signals: {
    reconnect_count: number;
    poll_score: number;
    check_in_time?: string;
    admin_notes: string[];
  };
}

export function ValidationTab() {
  const { getIdToken } = useAuth();
  const { data: events } = useApi<Event[]>("/api/admin/events");
  const [queue, setQueue] = useState<ValidationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState("");
  const [noteUserId, setNoteUserId] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [eventId, setEventId] = useState("");

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const url = eventId
        ? `${API_URL}/api/admin/validation-queue?event_id=${eventId}`
        : `${API_URL}/api/admin/validation-queue`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setQueue(data.data);
    } catch (err) {
      console.error("Failed to fetch validation queue:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId, getIdToken]);

  useEffect(() => {
    fetchQueue();
  }, [fetchQueue]);

  async function handleValidate(userId: string, decision: string) {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/users/${userId}/validate`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ decision, event_id: eventId || undefined }),
      });
      if (res.ok) {
        setActionStatus(`User ${decision === "approved" ? "approved" : decision === "another_chance" ? "given another chance" : "revoked"}!`);
        fetchQueue();
        setTimeout(() => setActionStatus(""), 3000);
      }
    } catch (err) {
      setActionStatus(`Error: ${err}`);
    }
  }

  async function addNote(userId: string) {
    if (!noteText || !eventId) return;
    try {
      const token = await getIdToken();
      if (!token) return;
      await fetch(`${API_URL}/api/admin/events/${eventId}/notes`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_id: userId, note: noteText }),
      });
      setNoteUserId(null);
      setNoteText("");
      fetchQueue();
    } catch (err) {
      console.error("Failed to add note:", err);
      setActionStatus("Failed to add note");
      setTimeout(() => setActionStatus(""), 3000);
    }
  }

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div>
        <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
          filter by event (optional)
        </label>
        <select
          value={eventId}
          onChange={(e) => setEventId(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
        >
          <option value="">All events</option>
          {(events || []).map((e) => (
            <option key={e.id} value={e.id}>
              {e.title} ({formatDate(e.date)}) • {e.status}
            </option>
          ))}
        </select>
      </div>

      {actionStatus && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">
          {actionStatus}
        </div>
      )}

      <p className="font-mono text-[10px] text-muted">
        {queue.length} provisional user{queue.length !== 1 ? "s" : ""} pending validation
      </p>

      {loading ? (
        <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}</div>
      ) : queue.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">
          no provisional users in queue
        </p>
      ) : (
        <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.user_id}
              className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]"
            >
              <button
                onClick={() => setExpandedId(expandedId === item.user_id ? null : item.user_id)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-lavender/20 font-serif text-sm text-lavender">
                    {item.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-sans text-sm font-medium text-cream">{item.name}</p>
                    <p className="font-mono text-[10px] text-muted">
                      @{item.handle} &middot; via {item.entry_path}
                      {item.second_chance && " &middot; 2nd chance"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-full bg-sage/15 px-2 py-0.5 font-mono text-[9px] text-sage">
                      {item.signals.reconnect_count} reconnects
                    </span>
                    <span className="rounded-full bg-caramel/15 px-2 py-0.5 font-mono text-[9px] text-caramel">
                      {item.signals.poll_score}% approval
                    </span>
                  </div>
                </div>
              </button>

              {expandedId === item.user_id && (
                <div className="border-t border-white/5 px-5 pb-5 pt-4 space-y-4">
                  {/* Signals */}
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className={`${instrumentSerif.className} text-xl text-cream`}>
                        {item.signals.reconnect_count}
                      </p>
                      <p className="font-mono text-[9px] text-muted">reconnects</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className={`${instrumentSerif.className} text-xl text-cream`}>
                        {item.signals.poll_score}%
                      </p>
                      <p className="font-mono text-[9px] text-muted">poll score</p>
                    </div>
                    <div className="rounded-lg bg-white/5 p-3 text-center">
                      <p className={`${instrumentSerif.className} text-xl text-cream`}>
                        {item.events_attended}
                      </p>
                      <p className="font-mono text-[9px] text-muted">events</p>
                    </div>
                  </div>

                  {/* Vibe answers */}
                  {item.vibe_check_answers.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted">
                        vibe check answers
                      </p>
                      {item.vibe_check_answers.map((a, i) => (
                        <div key={i} className="mb-2">
                          <p className="font-mono text-[9px] text-muted">{a.question}</p>
                          <p className="font-sans text-[12px] text-cream/80">{a.answer}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Admin notes */}
                  {item.signals.admin_notes.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[10px] uppercase tracking-[1px] text-muted">notes</p>
                      {item.signals.admin_notes.map((note, i) => (
                        <p key={i} className="mb-1 font-sans text-[12px] text-cream/60">
                          &bull; {note}
                        </p>
                      ))}
                    </div>
                  )}

                  {/* Add note */}
                  {noteUserId === item.user_id ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={noteText}
                        onChange={(e) => setNoteText(e.target.value)}
                        placeholder="Add a note..."
                        className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-cream placeholder:text-muted/30 focus:outline-none"
                      />
                      <button
                        onClick={() => addNote(item.user_id)}
                        className="rounded-lg bg-white/10 px-3 py-2 font-mono text-[10px] text-cream"
                      >
                        save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setNoteUserId(item.user_id)}
                      className="font-mono text-[10px] text-caramel hover:underline"
                    >
                      + add note
                    </button>
                  )}

                  {/* Action buttons */}
                  <div className="flex flex-col gap-2 pt-2 sm:flex-row sm:gap-3">
                    <button
                      onClick={() => handleValidate(item.user_id, "approved")}
                      className="rounded-lg bg-sage px-5 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80"
                    >
                      approve
                    </button>
                    {!item.second_chance && (
                      <button
                        onClick={() => handleValidate(item.user_id, "another_chance")}
                        className="rounded-lg bg-caramel/30 px-5 py-2.5 font-mono text-[11px] font-medium text-caramel transition-opacity hover:opacity-80"
                      >
                        another chance
                      </button>
                    )}
                    <button
                      onClick={() => handleValidate(item.user_id, "revoked")}
                      className="rounded-lg bg-terracotta/20 px-5 py-2.5 font-mono text-[11px] font-medium text-terracotta transition-opacity hover:opacity-80"
                    >
                      revoke
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
