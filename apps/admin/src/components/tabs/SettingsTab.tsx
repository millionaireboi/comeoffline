"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";

export function SettingsTab() {
  const { getIdToken } = useAuth();
  const [prompt, setPrompt] = useState("");
  const [codesFirst, setCodesFirst] = useState("");
  const [codesRepeat, setCodesRepeat] = useState("");
  const [reconnectHours, setReconnectHours] = useState("");
  const [noshowPenalty, setNoshowPenalty] = useState("no_vouch");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  useEffect(() => {
    async function fetchSettings() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const [chatRes, vouchRes] = await Promise.all([
          fetch(`${API_URL}/api/admin/settings/chatbot`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`${API_URL}/api/admin/settings/vouch`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const chatData = await chatRes.json();
        const vouchData = await vouchRes.json();

        if (chatData.data) setPrompt(chatData.data.system_prompt || "");
        if (vouchData.data) {
          setCodesFirst(String(vouchData.data.codes_first ?? 2));
          setCodesRepeat(String(vouchData.data.codes_repeat ?? 2));
          setReconnectHours(String(vouchData.data.reconnect_hours ?? 48));
          setNoshowPenalty(vouchData.data.noshow_penalty || "no_vouch");
        }
      } catch (err) {
        console.error("Failed to fetch settings:", err);
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
      if (res.ok) setStatus("Chatbot personality updated!");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  async function saveVouch() {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/settings/vouch`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          codes_first: parseInt(codesFirst) || 2,
          codes_repeat: parseInt(codesRepeat) || 2,
          reconnect_hours: parseInt(reconnectHours) || 48,
          noshow_penalty: noshowPenalty,
        }),
      });
      if (res.ok) setStatus("Vouch settings updated!");
      setTimeout(() => setStatus(""), 3000);
    } catch (err) {
      setStatus(`Error: ${err}`);
    }
  }

  if (loading) {
    return <p className="py-8 text-center font-mono text-sm text-muted">loading settings...</p>;
  }

  return (
    <div className="max-w-2xl space-y-8">
      {status && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">{status}</div>
      )}

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

      <section className="rounded-xl border border-white/5 p-5">
        <h3 className="mb-4 font-mono text-[11px] uppercase tracking-[2px] text-cream">vouch settings</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">codes for first event</label>
            <input type="number" value={codesFirst} onChange={(e) => setCodesFirst(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">codes for repeat events</label>
            <input type="number" value={codesRepeat} onChange={(e) => setCodesRepeat(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">reconnect window (hours)</label>
            <input type="number" value={reconnectHours} onChange={(e) => setReconnectHours(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none" />
          </div>
          <div>
            <label className="mb-1 block font-mono text-[9px] text-muted">no-show penalty</label>
            <select value={noshowPenalty} onChange={(e) => setNoshowPenalty(e.target.value)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none">
              <option value="no_vouch">no vouch codes</option>
              <option value="warning">warning</option>
              <option value="suspension">suspension</option>
            </select>
          </div>
        </div>
        <button onClick={saveVouch} className="mt-4 rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium text-near-black transition-opacity hover:opacity-80">
          save vouch settings
        </button>
      </section>
    </div>
  );
}
