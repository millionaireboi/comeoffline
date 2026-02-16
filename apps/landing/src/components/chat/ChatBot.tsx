"use client";

import { useState, useEffect, useRef } from "react";
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

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const newMsgs = [...messages, { role: "user", text }];
    setMessages(newMsgs);
    setInput("");
    setQuickReplies([]);
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/public`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMsgs.map((m) => ({
            role: m.role === "assistant" ? "assistant" : "user",
            content: m.text,
          })),
        }),
      });
      const data = await res.json();
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

      const userMessages = newMsgs.filter((m) => m.role === "user").map((m) => m.text);
      if (userMessages.length >= 2 && !vibeDataRef.current.name) {
        vibeDataRef.current.name = userMessages[1];
      }
      const assistantMsgs = newMsgs.filter((m) => m.role === "assistant");
      vibeDataRef.current.answers = userMessages.map((answer, i) => ({
        question: assistantMsgs[i]?.text || `question ${i + 1}`,
        answer,
      }));

      if (passed) {
        for (const msg of userMessages) {
          if (msg.startsWith("@") || msg.includes("instagram")) {
            vibeDataRef.current.instagram = msg.replace(/.*@/, "@").split(/\s/)[0];
          }
          if (!msg.startsWith("@") && msg.length > 1 && msg.length < 40 && !vibeDataRef.current.name) {
            vibeDataRef.current.name = msg;
          }
        }

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
          }
        } catch {
          // Account creation failed silently
        }
      }

      if (failed) {
        setTimeout(() => {
          setQuickReplies(["let me try again"]);
        }, 1000);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "oops, brain glitch. say that again?" }]);
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
    <div className="fixed inset-0 z-[1000] flex flex-col justify-end">
      <div
        onClick={closeChat}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
      />
      <div
        className="relative flex max-h-[80vh] flex-col rounded-t-3xl bg-gate-black"
        style={{
          border: `1px solid ${P.muted}15`,
          borderBottom: "none",
          animation: "fadeSlideUp 0.4s cubic-bezier(0.16,1,0.3,1)",
        }}
      >
        {/* Header */}
        <div
          className="flex shrink-0 items-center justify-between px-5 py-4"
          style={{ borderBottom: `1px solid ${P.muted}12` }}
        >
          <div>
            <span className="font-sans text-[15px] font-semibold text-cream">come offline bot</span>
            <span className="block font-mono text-[10px] text-sage">online {"\u00B7"} judging you</span>
          </div>
          <button
            onClick={closeChat}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border-none text-base text-muted"
            style={{ background: P.cream + "10" }}
          >
            {"\u2715"}
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="flex min-h-[200px] max-h-[50vh] flex-1 flex-col gap-2.5 overflow-y-auto px-5 py-4"
        >
          {messages.map((m, i) => (
            <div
              key={i}
              className="max-w-[85%]"
              style={{ alignSelf: m.role === "user" ? "flex-end" : "flex-start" }}
            >
              <div
                className="px-4 py-3 font-sans text-sm leading-[1.5]"
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
          <div className="flex flex-wrap gap-2 px-5 pb-2.5">
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

        {/* Input */}
        <div
          className="flex shrink-0 gap-2.5 px-5 pt-3.5 pb-7"
          style={{ borderTop: `1px solid ${P.muted}12` }}
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && send(input)}
            placeholder="say something..."
            className="flex-1 rounded-[14px] font-sans text-sm text-cream"
            style={{
              padding: "12px 16px",
              border: `1px solid ${P.muted}20`,
              background: P.cream + "06",
            }}
          />
          <button
            onClick={() => send(input)}
            className="cursor-pointer rounded-[14px] border-none bg-cream px-4 py-3 font-sans text-sm font-semibold text-gate-black"
          >
            {"\u2191"}
          </button>
        </div>
      </div>
    </div>
  );
}
