"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import { TableRowSkeleton } from "@/components/Skeleton";

interface ReportUser {
  id: string;
  name: string;
  handle: string;
  status?: string;
}

interface Report {
  id: string;
  context: string;
  details: string;
  status: "open" | "resolved" | "dismissed";
  created_at: string;
  resolved_at?: string | null;
  event_title?: string | null;
  reported_user: ReportUser | null;
  reporter: ReportUser | null;
}

const STATUS_COLORS: Record<string, string> = {
  open: "text-terracotta bg-terracotta/10",
  resolved: "text-sage bg-sage/10",
  dismissed: "text-muted bg-white/5",
};

/**
 * Member-safety review queue. Members file reports from attendee/connection
 * surfaces (POST /api/reports); this is where the operator sees and acts on
 * them — resolve, dismiss, or deactivate the reported member on the spot.
 */
export function ReportsTab() {
  const { getIdToken } = useAuth();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [filter, setFilter] = useState<string>("open");
  const [actionStatus, setActionStatus] = useState("");
  const [confirmDeactivate, setConfirmDeactivate] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const flash = (msg: string) => {
    setActionStatus(msg);
    setTimeout(() => setActionStatus(""), 3000);
  };

  const fetchReports = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/reports?status=${filter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "fetch failed");
      setReports(data.data || []);
    } catch (err) {
      console.error("Failed to fetch reports:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filter, getIdToken]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  async function updateStatus(id: string, status: "resolved" | "dismissed" | "open") {
    setBusy(id);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/reports/${id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("update failed");
      flash(`report ${status}`);
      fetchReports();
    } catch (err) {
      console.error("Failed to update report:", err);
      flash("couldn't update report — try again");
    } finally {
      setBusy(null);
    }
  }

  async function deactivateMember(report: Report) {
    if (!report.reported_user) return;
    setConfirmDeactivate(null);
    setBusy(report.id);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/members/${report.reported_user.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: "inactive" }),
      });
      if (!res.ok) throw new Error("deactivate failed");
      // Deactivating implies the report was acted on
      await updateStatus(report.id, "resolved");
      flash(`${report.reported_user.name} deactivated · report resolved`);
    } catch (err) {
      console.error("Failed to deactivate member:", err);
      flash("couldn't deactivate member — try again");
      setBusy(null);
    }
  }

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex flex-wrap gap-2">
        {["open", "resolved", "dismissed", "all"].map((f) => (
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
        <div className="space-y-1">{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}</div>
      ) : error ? (
        <div className="rounded-xl border border-terracotta/20 bg-terracotta/5 px-4 py-6 text-center">
          <p className="mb-3 font-mono text-sm text-terracotta">couldn&apos;t load reports</p>
          <button onClick={fetchReports} className="rounded-lg bg-white/5 px-4 py-2 font-mono text-[11px] text-cream">
            retry
          </button>
        </div>
      ) : reports.length === 0 ? (
        <div className="rounded-xl border border-dashed border-white/10 py-10 text-center">
          <span className="mb-2 block text-2xl">🛡️</span>
          <p className="font-mono text-sm text-muted">
            {filter === "open" ? "no open reports — all clear" : `no ${filter === "all" ? "" : filter + " "}reports`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-[1px] ${STATUS_COLORS[r.status]}`}>
                    {r.status}
                  </span>
                  <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-muted">
                    {r.context}
                  </span>
                  {r.reported_user?.status === "inactive" && (
                    <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[10px] text-sage">
                      member already deactivated
                    </span>
                  )}
                </div>
                <span className="font-mono text-[10px] text-muted">
                  {new Date(r.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <p className="font-sans text-[15px] text-cream">
                <span className="font-medium">{r.reported_user?.name || "unknown member"}</span>
                {r.reported_user?.handle && <span className="ml-1.5 font-mono text-[11px] text-muted">@{r.reported_user.handle.replace(/^@/, "")}</span>}
              </p>
              <p className="mt-0.5 font-mono text-[11px] text-muted">
                reported by {r.reporter?.name || "unknown"}
                {r.event_title && <> · at {r.event_title}</>}
              </p>
              {r.details && (
                <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 font-sans text-[13px] leading-relaxed text-cream/80">
                  {r.details}
                </p>
              )}

              {/* Actions */}
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {r.status === "open" ? (
                  <>
                    {confirmDeactivate === r.id ? (
                      <>
                        <span className="font-mono text-[11px] text-terracotta">deactivate {r.reported_user?.name}?</span>
                        <button
                          onClick={() => deactivateMember(r)}
                          disabled={busy === r.id}
                          className="rounded-lg bg-terracotta px-3 py-1.5 font-mono text-[11px] text-white disabled:opacity-50"
                        >
                          yes, deactivate
                        </button>
                        <button
                          onClick={() => setConfirmDeactivate(null)}
                          className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[11px] text-muted"
                        >
                          cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => updateStatus(r.id, "resolved")}
                          disabled={busy === r.id}
                          className="rounded-lg bg-sage/15 px-3 py-1.5 font-mono text-[11px] text-sage disabled:opacity-50"
                        >
                          resolve
                        </button>
                        <button
                          onClick={() => updateStatus(r.id, "dismissed")}
                          disabled={busy === r.id}
                          className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[11px] text-muted disabled:opacity-50"
                        >
                          dismiss
                        </button>
                        {r.reported_user && r.reported_user.status !== "inactive" && (
                          <button
                            onClick={() => setConfirmDeactivate(r.id)}
                            disabled={busy === r.id}
                            className="rounded-lg border border-terracotta/25 bg-terracotta/5 px-3 py-1.5 font-mono text-[11px] text-terracotta disabled:opacity-50"
                          >
                            deactivate member
                          </button>
                        )}
                      </>
                    )}
                  </>
                ) : (
                  <button
                    onClick={() => updateStatus(r.id, "open")}
                    disabled={busy === r.id}
                    className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[11px] text-muted disabled:opacity-50"
                  >
                    reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
