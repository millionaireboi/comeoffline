"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const QUICK_REPLIES = [
  "what is come offline?",
  "how do i get in?",
  "what happens at events?",
  "i want to prove myself",
];

interface InAppChatProps {
  onClose: () => void;
}

export function InAppChat({ onClose }: InAppChatProps) {
  const { getIdToken } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "hey — welcome to come offline. ask me anything about the community, or if you're here to prove yourself, just say the word. ✌️",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || sending) return;

      const userMsg: ChatMessage = { role: "user", content: text.trim() };
      const newMessages = [...messages, userMsg];
      setMessages(newMessages);
      setInput("");
      setSending(true);

      try {
        const token = await getIdToken();
        if (!token) return;

        const data = await apiFetch<{ success: boolean; data: { message: string }; error?: string }>(
          "/api/chat",
          {
            method: "POST",
            token,
            body: JSON.stringify({ messages: newMessages }),
          },
        );

        if (data.data?.message) {
          setMessages((prev) => [...prev, { role: "assistant", content: data.data.message }]);
        }
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : "something went wrong";
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: `oops — ${errorMsg}. try again?` },
        ]);
      } finally {
        setSending(false);
        inputRef.current?.focus();
      }
    },
    [messages, sending, getIdToken],
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="animate-fadeIn fixed inset-0 z-[600] flex flex-col bg-gate-black">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <div>
          <h3 className="font-serif text-lg text-cream">come offline</h3>
          <p className="font-mono text-[10px] text-muted/50">community chatbot</p>
        </div>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-white/5 text-sm text-cream"
        >
          ✕
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-5 py-5"
      >
        <div className="flex flex-col gap-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] rounded-[18px] px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-cream text-near-black"
                    : "bg-white/5 text-cream/90"
                }`}
                style={{
                  borderBottomRightRadius: msg.role === "user" ? "4px" : undefined,
                  borderBottomLeftRadius: msg.role === "assistant" ? "4px" : undefined,
                }}
              >
                <p className="font-sans text-[14px] leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </p>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-[18px] bg-white/5 px-4 py-3" style={{ borderBottomLeftRadius: "4px" }}>
                <div className="flex gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-muted/40" style={{ animation: "pulse 1.2s ease infinite" }} />
                  <div className="h-2 w-2 rounded-full bg-muted/40" style={{ animation: "pulse 1.2s ease 0.2s infinite" }} />
                  <div className="h-2 w-2 rounded-full bg-muted/40" style={{ animation: "pulse 1.2s ease 0.4s infinite" }} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick replies (show only when no user messages yet) */}
      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-2 px-5 pb-3">
          {QUICK_REPLIES.map((reply) => (
            <button
              key={reply}
              onClick={() => sendMessage(reply)}
              className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 font-mono text-[11px] text-cream/70 transition-colors hover:border-caramel/30 hover:text-cream"
            >
              {reply}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <form
        onSubmit={handleSubmit}
        className="border-t border-white/5 px-5 py-4"
      >
        <div className="flex items-center gap-3">
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="say something..."
            disabled={sending}
            className="flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 font-sans text-sm text-cream placeholder:text-muted/30 focus:border-caramel/30 focus:outline-none disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!input.trim() || sending}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-cream font-sans text-sm text-near-black transition-opacity disabled:opacity-30"
          >
            →
          </button>
        </div>
      </form>
    </div>
  );
}
