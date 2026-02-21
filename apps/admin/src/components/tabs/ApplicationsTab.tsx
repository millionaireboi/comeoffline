"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import { TableRowSkeleton } from "@/components/Skeleton";

interface Application {
  id: string;
  name: string;
  answers: Array<{ question: string; answer: string }>;
  status: string;
  submitted_at: string;
  invite_code?: string;
}

export function ApplicationsTab() {
  const { getIdToken } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("pending");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState("");

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/applications?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setApplications(data.data);
    } catch (err) {
      console.error("Failed to fetch applications:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, getIdToken]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function handleAction(id: string, action: "approve" | "reject") {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/applications/${id}/${action}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        setActionStatus(`Application ${action}d!`);
        fetchApplications();
        setTimeout(() => setActionStatus(""), 3000);
      }
    } catch (err) {
      setActionStatus(`Error: ${err}`);
    }
  }

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex flex-wrap gap-2">
        {["pending", "approved", "rejected"].map((f) => (
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
      ) : applications.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">no {filter} applications</p>
      ) : (
        <div className="space-y-3">
          {applications.map((app) => (
            <div key={app.id} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
              <button
                onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div>
                  <p className="font-sans text-sm font-medium text-cream">{app.name}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">
                    {new Date(app.submitted_at).toLocaleDateString()} &middot; {app.answers.length} answers
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                  style={{
                    color: app.status === "pending" ? "#D4A574" : app.status === "approved" ? "#6B7A63" : "#D4836B",
                    background: app.status === "pending" ? "#D4A57415" : app.status === "approved" ? "#6B7A6315" : "#D4836B15",
                  }}
                >
                  {app.status}
                </span>
              </button>

              {expandedId === app.id && (
                <div className="border-t border-white/5 px-5 pb-5 pt-4">
                  <div className="space-y-4">
                    {app.answers.map((a, i) => (
                      <div key={i}>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-[1px] text-muted">{a.question}</p>
                        <p className="font-sans text-sm text-cream/80">{a.answer}</p>
                      </div>
                    ))}
                  </div>
                  {app.invite_code && (
                    <div className="mt-4 rounded-lg bg-sage/10 px-4 py-3">
                      <p className="font-mono text-[11px] text-sage">invite code: <strong>{app.invite_code}</strong></p>
                    </div>
                  )}
                  {app.status === "pending" && (
                    <div className="mt-5 flex gap-3">
                      <button onClick={() => handleAction(app.id, "approve")} className="rounded-lg bg-sage px-5 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80">approve</button>
                      <button onClick={() => handleAction(app.id, "reject")} className="rounded-lg bg-terracotta/80 px-5 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80">reject</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
