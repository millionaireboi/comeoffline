"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import { toast } from "@/lib/toast";

export function SettingsTab() {
  const { getIdToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSettings() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const chatRes = await fetch(`${API_URL}/api/admin/settings/chatbot`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const chatData = await chatRes.json();
        if (chatData.data) setPrompt(chatData.data.system_prompt || "");
      } catch (err) {
        console.error("Failed to fetch settings:", err);
        toast.error("couldn't load settings — refresh to retry");
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, [getIdToken]);

  async function saveChatbot() {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/settings/chatbot`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ system_prompt: prompt }),
      });
      if (res.ok) toast.success("chatbot personality updated");
      else toast.error("couldn't save — try again");
    } catch (err) {
      console.error("saveChatbot failed:", err);
      toast.error("couldn't save — check connection");
    }
  }

  if (loading) {
    return <p className="py-8 text-center font-mono text-sm text-muted">loading settings...</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">chatbot personality</h3>
        <p className="mb-3 font-mono text-[10px] text-muted">
          system prompt sent to the chatbot. changes take effect immediately.
        </p>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          rows={12}
          className="mb-4 w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 font-mono text-[12px] leading-relaxed text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
        />
        <button onClick={saveChatbot} className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">
          save chatbot personality
        </button>
      </section>
    </div>
  );
}
