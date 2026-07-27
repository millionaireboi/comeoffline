"use client";

/**
 * WhatsApp replies inbox — inbound messages from members and campaign recipients.
 * A Cloud API number has no phone-app inbox, so this is the only place replies
 * are visible. Free-form replies work inside WhatsApp's 24h customer-service
 * window; outside it the API returns a friendly "window closed" error.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";

interface Conversation {
  phone: string;
  profile_name?: string | null;
  user_id?: string | null;
  user_name?: string | null;
  last_message_text?: string;
  last_message_at?: string;
  last_direction?: "in" | "out";
  unread_count?: number;
  opted_out?: boolean;
}

interface ThreadMessage {
  id: string;
  direction: "in" | "out";
  type: string;
  text: string;
  at: string;
}

function displayName(c: Conversation): string {
  return c.user_name || c.profile_name || `+${c.phone}`;
}

function timeAgo(iso?: string): string {
  if (!iso) return "";
  const mins = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

export function WhatsAppRepliesTab() {
  const { getIdToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const authedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
      });
      return res.json();
    },
    [getIdToken],
  );

  const fetchConversations = useCallback(async () => {
    try {
      const data = await authedFetch("/api/admin/whatsapp/inbox");
      if (!data.success) throw new Error(data.error || "Failed to load inbox");
      setConversations(data.data.conversations || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 30_000);
    return () => clearInterval(interval);
  }, [fetchConversations]);

  if (loading) return <p className="p-6 font-mono text-[11px] text-muted">loading inbox...</p>;

  return (
    <div className="space-y-4 p-2 sm:p-6">
      <header>
        <h2 className="font-serif text-2xl tracking-tight text-cream">WhatsApp replies</h2>
        <p className="mt-1 font-mono text-[11px] text-muted">
          replies to campaigns and notifications land here — free-form replies work for 24h
          after their last message. people who reply STOP are auto-excluded from future campaigns.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-coral/40 bg-coral/10 p-3 font-mono text-[11px] text-coral">
          {error}
        </div>
      )}

      {conversations.length === 0 && !error && (
        <p className="font-mono text-[11px] text-muted">
          No conversations yet — they&apos;ll appear as soon as someone replies.
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        <div className="space-y-1.5">
          {conversations.map((c) => (
            <button
              key={c.phone}
              onClick={() => setSelected(c.phone)}
              className={`w-full rounded-xl border p-3 text-left transition-colors ${
                selected === c.phone
                  ? "border-caramel/40 bg-caramel/5"
                  : "border-white/5 bg-near-black hover:border-white/10"
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="truncate font-serif text-[14px] text-cream">{displayName(c)}</span>
                {(c.unread_count ?? 0) > 0 && (
                  <span className="rounded-full bg-caramel px-1.5 py-0.5 font-mono text-[9px] text-gate-black">
                    {c.unread_count}
                  </span>
                )}
                {c.opted_out && (
                  <span className="rounded-full bg-coral/20 px-1.5 py-0.5 font-mono text-[8px] uppercase text-coral">
                    opted out
                  </span>
                )}
                <span className="ml-auto shrink-0 font-mono text-[9px] text-muted">
                  {timeAgo(c.last_message_at)}
                </span>
              </div>
              <p className="mt-1 truncate font-mono text-[10px] text-muted">
                {c.last_direction === "out" ? "you: " : ""}
                {c.last_message_text}
              </p>
            </button>
          ))}
        </div>

        {selected ? (
          <ThreadView
            key={selected}
            phone={selected}
            authedFetch={authedFetch}
            onActivity={fetchConversations}
          />
        ) : (
          conversations.length > 0 && (
            <p className="hidden self-center justify-self-center font-mono text-[11px] text-muted lg:block">
              pick a conversation
            </p>
          )
        )}
      </div>
    </div>
  );
}

function ThreadView({
  phone,
  authedFetch,
  onActivity,
}: {
  phone: string;
  authedFetch: (path: string, init?: RequestInit) => Promise<any>;
  onActivity: () => void;
}) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchThread = useCallback(async () => {
    const data = await authedFetch(`/api/admin/whatsapp/inbox/${phone}`);
    if (data.success) {
      setConversation(data.data.conversation);
      setMessages(data.data.messages || []);
    }
  }, [authedFetch, phone]);

  useEffect(() => {
    fetchThread().then(onActivity); // opening marks it read — refresh badges
    const interval = setInterval(fetchThread, 15_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchThread]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  async function send() {
    const text = reply.trim();
    if (!text || sending) return;
    setSending(true);
    setNotice("");
    try {
      const data = await authedFetch(`/api/admin/whatsapp/inbox/${phone}/reply`, {
        method: "POST",
        body: JSON.stringify({ text }),
      });
      if (!data.success) {
        setNotice(data.error || "Send failed");
        return;
      }
      setReply("");
      await fetchThread();
      onActivity();
    } catch (err) {
      setNotice(err instanceof Error ? err.message : String(err));
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="flex max-h-[70vh] flex-col rounded-xl border border-white/5 bg-near-black">
      <div className="flex items-center gap-2 border-b border-white/5 p-3">
        <span className="font-serif text-[15px] text-cream">
          {conversation ? displayName(conversation) : `+${phone}`}
        </span>
        <span className="font-mono text-[10px] text-muted">+{phone}</span>
        {conversation?.user_id && (
          <span className="rounded-full bg-sage/15 px-2 py-0.5 font-mono text-[8px] uppercase text-sage">
            member
          </span>
        )}
        {conversation?.opted_out && (
          <span className="rounded-full bg-coral/20 px-2 py-0.5 font-mono text-[8px] uppercase text-coral">
            opted out — no campaigns
          </span>
        )}
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto p-3">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.direction === "out" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[80%] rounded-xl px-3 py-2 ${
                m.direction === "out" ? "bg-caramel/15 text-cream" : "bg-white/5 text-sand"
              }`}
            >
              <p className="whitespace-pre-wrap break-words font-mono text-[11px]">{m.text}</p>
              <p className="mt-1 text-right font-mono text-[8px] text-muted">
                {new Date(m.at).toLocaleString("en-IN", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="border-t border-white/5 p-3">
        {notice && (
          <p className="mb-2 rounded-md bg-coral/10 p-2 font-mono text-[10px] text-coral">{notice}</p>
        )}
        <div className="flex gap-2">
          <textarea
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={2}
            placeholder="reply... (enter to send, shift+enter for newline)"
            className="flex-1 resize-none rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-sand"
          />
          <button
            onClick={send}
            disabled={sending || !reply.trim()}
            className="shrink-0 rounded-md bg-caramel px-4 font-mono text-[10px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending ? "..." : "send"}
          </button>
        </div>
      </div>
    </div>
  );
}
