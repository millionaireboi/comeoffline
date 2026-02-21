"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import { TableRowSkeleton } from "@/components/Skeleton";
import type { ContactSubmission, ContactSubmissionStatus } from "@comeoffline/types";

export function ContactTab() {
  const { getIdToken } = useAuth();
  const [submissions, setSubmissions] = useState<ContactSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState("");

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const url = filter === "all"
        ? `${API_URL}/api/admin/contact`
        : `${API_URL}/api/admin/contact?status=${filter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setSubmissions(data.data);
    } catch (err) {
      console.error("Failed to fetch contacts:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, getIdToken]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  async function handleStatusUpdate(id: string, status: ContactSubmissionStatus) {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/contact/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setActionStatus(`Marked as ${status}`);
        fetchSubmissions();
        setTimeout(() => setActionStatus(""), 3000);
      }
    } catch (err) {
      setActionStatus(`Error: ${err}`);
    }
  }

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex flex-wrap gap-2">
        {["all", "unread", "read", "replied"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] transition-colors sm:px-4 sm:py-2 sm:text-[11px] ${
              filter === f ? "bg-caramel text-near-black" : "bg-white/5 text-muted hover:text-cream"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {actionStatus && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">{actionStatus}</div>
      )}

      {loading ? (
        <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}</div>
      ) : submissions.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">no {filter === "all" ? "" : filter + " "}submissions</p>
      ) : (
        <div className="space-y-3">
          {submissions.map((sub) => (
            <div key={sub.id} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
              <button
                onClick={() => setExpandedId(expandedId === sub.id ? null : sub.id)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div>
                  <p className="font-sans text-sm font-medium text-cream">{sub.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">
                    {sub.email} &middot; {new Date(sub.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                  style={{
                    color: sub.status === "unread" ? "#D4A574" : sub.status === "read" ? "#A8B5A0" : "#B8A9C9",
                    background: sub.status === "unread" ? "#D4A57415" : sub.status === "read" ? "#A8B5A015" : "#B8A9C915",
                  }}
                >
                  {sub.status}
                </span>
              </button>

              {expandedId === sub.id && (
                <div className="border-t border-white/5 px-5 pb-5 pt-4">
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-[1px] text-muted">message</p>
                      <p className="font-sans text-sm leading-relaxed text-cream/80">{sub.message}</p>
                    </div>
                  </div>
                  <div className="mt-5 flex gap-3">
                    {sub.status === "unread" && (
                      <button onClick={() => handleStatusUpdate(sub.id, "read")} className="rounded-lg bg-sage px-5 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80">mark read</button>
                    )}
                    {sub.status !== "replied" && (
                      <button onClick={() => handleStatusUpdate(sub.id, "replied")} className="rounded-lg bg-lavender/80 px-5 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80">mark replied</button>
                    )}
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
