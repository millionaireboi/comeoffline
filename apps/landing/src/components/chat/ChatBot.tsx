"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { P, API_URL, APP_URL } from "@/components/shared/P";
import { useChat } from "./ChatProvider";

export function ChatBot() {
  const { chatOpen, closeChat, messages, setMessages } = useChat();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [vibeCheckPassed, setVibeCheckPassed] = useState(false);
  const [handoffToken, setHandoffToken] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const vibeDataRef = useRef<{ name: string; instagram: string; answers: { question: string; answer: string }[] }>({
    name: "",
    instagram: "",
    answers: [],
  });

  useEffect(() => {
    if (chatOpen && messages.length === 0) {
      setTimeout(() => {
        setMessages([
          { role: "assistant", text: "hey. so you want in? \u{1F440}" },
          { role: "assistant", text: "tell me \u2014 got a code from someone, or trying to prove you belong?" },
        ]);
        setQuickReplies(["i have a code", "no code, prove me"]);
      }, 600);
    }
  }, [chatOpen, messages.length, setMessages]);

  // Auto-scroll messages to bottom
  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  // Abort in-flight requests when chat closes
  useEffect(() => {
    if (!chatOpen) {
      abortRef.current?.abort();
      abortRef.current = null;
    }
  }, [chatOpen]);

  // Lock body scroll when chat is open
  useEffect(() => {
    if (!chatOpen) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [chatOpen]);

  // Handle virtual keyboard on mobile
  // When keyboard opens, visualViewport shrinks and may scroll.
  // We position the entire chat overlay to match the visual viewport.
  const updateViewport = useCallback(() => {
    const vv = window.visualViewport;
    if (!vv || !panelRef.current) return;

    const root = document.documentElement;
    root.style.setProperty("--chat-vh", `${vv.height}px`);
    root.style.setProperty("--chat-vt", `${vv.offsetTop}px`);

    // Scroll to latest message when keyboard resizes
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, []);

  useEffect(() => {
    if (!chatOpen) return;
    const vv = window.visualViewport;
    if (vv) {
      vv.addEventListener("resize", updateViewport);
      vv.addEventListener("scroll", updateViewport);
      updateViewport();
    }
    return () => {
      if (vv) {
        vv.removeEventListener("resize", updateViewport);
        vv.removeEventListener("scroll", updateViewport);
      }
      document.documentElement.style.removeProperty("--chat-vh");
      document.documentElement.style.removeProperty("--chat-vt");
    };
  }, [chatOpen, updateViewport]);

  const send = async (text: string) => {
    if (!text.trim() || loading) return;
    const newMsgs = [...messages, { role: "user", text }];
    setMessages(newMsgs);
    setInput("");
    setQuickReplies([]);
    setLoading(true);
    const controller = new AbortController();
    abortRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const res = await fetch(`${API_URL}/api/chat/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.text.replace(/\[VIBE_CHECK_(?:PASSED|FAILED)\]/g, ""),
          })),
        }),
      });
      const data = await res.json();

      // Handle rate limiting
      if (res.status === 429) {
        setMessages((prev) => [...prev, { role: "assistant", text: "you're typing faster than i can think. chill for a sec and try again \u{1F605}" }]);
        setLoading(false);
        clearTimeout(timeout);
        return;
      }

      // Handle other API errors
      if (!res.ok || !data.success) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.error || "hmm, something went weird. try again?" }]);
        setLoading(false);
        clearTimeout(timeout);
        return;
      }

      const reply = data.data?.message || "hmm, something went weird. try again?";

      const passed = reply.includes("[VIBE_CHECK_PASSED]");
      const failed = reply.includes("[VIBE_CHECK_FAILED]");
      const cleanReply = reply
        .replace("[VIBE_CHECK_PASSED]", "")
        .replace("[VIBE_CHECK_FAILED]", "")
        .trim();

      const parts = cleanReply.split("\n").filter((p: string) => p.trim());
      for (let i = 0; i < parts.length; i++) {
        await new Promise((r) => setTimeout(r, 350));
        setMessages((prev) => [...prev, { role: "assistant", text: parts[i] }]);
      }

      // Extract name and instagram by matching bot questions to user responses
      // Walk the conversation pairs: each assistant message followed by the next user message
      const allMsgs = newMsgs;
      const namePatterns = /\b(name|call you|who are you)\b/i;
      const instaPatterns = /\b(insta|instagram|handle|ig)\b/i;

      for (let idx = 0; idx < allMsgs.length - 1; idx++) {
        const msg = allMsgs[idx];
        const nextMsg = allMsgs[idx + 1];
        if (msg.role !== "assistant" || nextMsg.role !== "user") continue;

        // Bot asked for name → next user message is the name
        if (namePatterns.test(msg.text) && !vibeDataRef.current.name) {
          vibeDataRef.current.name = nextMsg.text.trim();
        }
        // Bot asked for instagram → next user message is the handle
        if (instaPatterns.test(msg.text) && !vibeDataRef.current.instagram) {
          const raw = nextMsg.text.trim();
          // Normalize: strip @ prefix and any surrounding text
          const match = raw.match(/@?([\w.]+)/);
          vibeDataRef.current.instagram = match ? match[1] : raw;
        }
      }

      // Build Q&A pairs for vibe answers (skip name/instagram responses)
      const qaPairs: { question: string; answer: string }[] = [];
      for (let idx = 0; idx < allMsgs.length - 1; idx++) {
        const msg = allMsgs[idx];
        const nextMsg = allMsgs[idx + 1];
        if (msg.role !== "assistant" || nextMsg.role !== "user") continue;
        // Skip the initial greeting messages and name/instagram exchanges
        if (namePatterns.test(msg.text) || instaPatterns.test(msg.text)) continue;
        qaPairs.push({ question: msg.text, answer: nextMsg.text });
      }
      vibeDataRef.current.answers = qaPairs;

      if (passed) {

        try {
          const entryRes = await fetch(`${API_URL}/api/auth/chatbot-entry`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: vibeDataRef.current.name || "new face",
              instagram_handle: vibeDataRef.current.instagram || undefined,
              vibe_answers: vibeDataRef.current.answers,
            }),
          });
          const entryData = await entryRes.json();
          if (entryData.success && entryData.data?.handoff_token) {
            setVibeCheckPassed(true);
            setHandoffToken(entryData.data.handoff_token);
          } else if (entryData.error === "vibe_check_failed") {
            // Backend scoring overrode Gemini's pass
            await new Promise((r) => setTimeout(r, 500));
            setMessages((prev) => [...prev, { role: "assistant", text: "hmm actually, on second thought..." }]);
            await new Promise((r) => setTimeout(r, 800));
            setMessages((prev) => [...prev, { role: "assistant", text: "not quite the vibe we're looking for right now. but hey, you can always try again." }]);
            setTimeout(() => setQuickReplies(["let me try again"]), 1000);
          }
        } catch {
          setMessages((prev) => [...prev, { role: "assistant", text: "hmm, something went wrong creating your account. try the code path instead?" }]);
        }
      }

      if (failed) {
        setTimeout(() => {
          setQuickReplies(["let me try again"]);
        }, 1000);
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setMessages((prev) => [...prev, { role: "assistant", text: "that took too long. try again?" }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: "oops, brain glitch. say that again?" }]);
      }
    } finally {
      clearTimeout(timeout);
    }
    setLoading(false);
  };

  const handleGoToApp = () => {
    if (handoffToken) {
      window.location.href = `${APP_URL}/?token=${handoffToken}&source=chatbot&status=provisional`;
    }
  };

  if (!chatOpen) return null;

  return (
    <div
      className="fixed inset-x-0 z-[1000] flex flex-col justify-end overflow-hidden"
      style={{
        top: "var(--chat-vt, 0px)",
        height: "var(--chat-vh, 100dvh)",
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeChat();
      }}
    >
      {/* Backdrop */}
      <div
        onClick={closeChat}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />

      {/* Chat panel — fills available space on mobile, capped on desktop */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Chat with come offline bot"
        className="relative flex flex-col overflow-hidden rounded-t-3xl bg-gate-black"
        style={{
          maxHeight: "100%",
          border: `1px solid ${P.muted}15`,
          borderBottom: "none",
          animation: "fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header — fixed at top */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-3"
          style={{ borderBottom: `1px solid ${P.muted}12` }}
        >
          <div>
            <span className="font-sans text-[15px] font-semibold text-cream">come offline bot</span>
            <span className="block font-mono text-[10px] text-sage">online {"\u00B7"} judging you</span>
          </div>
          <button
            onClick={closeChat}
            aria-label="Close chat"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none text-base text-muted"
            style={{ background: P.cream + "10" }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Messages — scrollable, takes remaining space */}
        <div
          ref={scrollRef}
          className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto overscroll-contain px-5 py-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className="max-w-[85%]"
              style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
            >
              <div
                className="px-4 py-2.5 font-sans text-[15px] leading-[1.5]"
                style={{
                  borderRadius: m.role === "user" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                  background: m.role === "user" ? P.cream : P.cream + "08",
                  color: m.role === "user" ? P.gateBlack : P.cream,
                }}
              >
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ alignSelf: "flex-start" }}>
              <div
                className="rounded-[18px_18px_18px_4px] px-4 py-3"
                style={{ background: P.cream + "08" }}
              >
                <div className="flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-muted"
                      style={{ animation: `pulse 1s ease ${i * 0.15}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick replies */}
        {quickReplies.length > 0 && (
          <div className="flex shrink-0 flex-wrap gap-2 px-5 pb-2">
            {quickReplies.map((q, i) => (
              <button
                key={i}
                onClick={() => send(q)}
                className="cursor-pointer rounded-full font-sans text-[13px] text-caramel transition-all duration-200 hover:bg-caramel/10"
                style={{
                  padding: "8px 16px",
                  border: `1px solid ${P.caramel}40`,
                  background: P.caramel + "08",
                }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Vibe check passed CTA */}
        {vibeCheckPassed && handoffToken && (
          <div className="shrink-0 px-5 py-3" style={{ animation: "fadeSlideUp 0.4s ease" }}>
            <button
              onClick={handleGoToApp}
              className="w-full cursor-pointer rounded-2xl border-none py-4 font-sans text-[15px] font-semibold transition-all duration-300 hover:opacity-90"
              style={{ background: P.sage, color: "#fff" }}
            >
              see what&apos;s coming up {"\u2192"}
            </button>
          </div>
        )}

        {/* Input — pinned at bottom */}
        <div
          className="flex shrink-0 items-center gap-2.5 px-4 py-2"
          style={{
            borderTop: `1px solid ${P.muted}12`,
            paddingBottom: "max(8px, env(safe-area-inset-bottom, 8px))",
          }}
        >
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="say something..."
            maxLength={500}
            autoComplete="off"
            autoCapitalize="off"
            enterKeyHint="send"
            className="flex-1 rounded-full font-sans text-cream outline-none"
            style={{
              fontSize: "16px",
              padding: "10px 16px",
              border: `1px solid ${P.muted}20`,
              background: P.cream + "06",
            }}
          />
          <button
            onClick={() => send(input)}
            aria-label="Send message"
            className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-cream font-sans text-sm font-semibold text-gate-black"
          >
            {"\u2191"}
          </button>
        </div>
      </div>
    </div>
  );
}
