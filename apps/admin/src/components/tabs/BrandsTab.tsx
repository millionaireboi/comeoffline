"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import type { BrandInquiry, BrandInquiryStatus } from "@comeoffline/types";

export function BrandsTab() {
  const { getIdToken } = useAuth();
  const [inquiries, setInquiries] = useState<BrandInquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState("");

  const fetchInquiries = useCallback(async () => {
    setLoading(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const url = filter === "all"
        ? `${API_URL}/api/admin/brands`
        : `${API_URL}/api/admin/brands?status=${filter}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.data) setInquiries(data.data);
    } catch (err) {
      console.error("Failed to fetch brand inquiries:", err);
    } finally {
      setLoading(false);
    }
  }, [filter, getIdToken]);

  useEffect(() => {
    fetchInquiries();
  }, [fetchInquiries]);

  async function handleStatusUpdate(id: string, status: BrandInquiryStatus) {
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/brands/${id}/status`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        setActionStatus(`Updated to ${status}`);
        fetchInquiries();
        setTimeout(() => setActionStatus(""), 3000);
      }
    } catch (err) {
      setActionStatus(`Error: ${err}`);
    }
  }

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex flex-wrap gap-2">
        {["all", "new", "contacted", "in_progress", "closed"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`rounded-lg px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] transition-colors sm:px-4 sm:py-2 sm:text-[11px] ${
              filter === f ? "bg-caramel text-near-black" : "bg-white/5 text-muted hover:text-cream"
            }`}
          >
            {f.replace("_", " ")}
          </button>
        ))}
      </div>

      {actionStatus && (
        <div className="rounded-xl bg-caramel/10 px-4 py-3 font-mono text-[12px] text-caramel">{actionStatus}</div>
      )}

      {loading ? (
        <p className="py-8 text-center font-mono text-sm text-muted">loading...</p>
      ) : inquiries.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">no {filter === "all" ? "" : filter.replace("_", " ") + " "}inquiries</p>
      ) : (
        <div className="space-y-3">
          {inquiries.map((inq) => (
            <div key={inq.id} className="overflow-hidden rounded-xl border border-white/5 bg-white/[0.02]">
              <button
                onClick={() => setExpandedId(expandedId === inq.id ? null : inq.id)}
                className="flex w-full items-center justify-between p-5 text-left"
              >
                <div>
                  <p className="font-sans text-sm font-medium text-cream">{inq.brand}</p>
                  <p className="mt-0.5 font-mono text-[10px] text-muted">
                    {inq.name} &middot; {inq.email} &middot; {new Date(inq.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className="rounded-full px-2.5 py-1 font-mono text-[9px] uppercase"
                  style={{
                    color: inq.status === "new" ? "#D4A574" : inq.status === "contacted" ? "#A8B5A0" : inq.status === "in_progress" ? "#B8A9C9" : "#9B8E82",
                    background: inq.status === "new" ? "#D4A57415" : inq.status === "contacted" ? "#A8B5A015" : inq.status === "in_progress" ? "#B8A9C915" : "#9B8E8215",
                  }}
                >
                  {inq.status.replace("_", " ")}
                </span>
              </button>

              {expandedId === inq.id && (
                <div className="border-t border-white/5 px-5 pb-5 pt-4">
                  <div className="space-y-3">
                    <div>
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-[1px] text-muted">role</p>
                      <p className="font-sans text-sm text-cream/80">{inq.role || "—"}</p>
                    </div>
                    <div>
                      <p className="mb-1 font-mono text-[10px] uppercase tracking-[1px] text-muted">interest</p>
                      <p className="font-sans text-sm text-cream/80">{inq.interest || "—"}</p>
                    </div>
                    {inq.notes && (
                      <div>
                        <p className="mb-1 font-mono text-[10px] uppercase tracking-[1px] text-muted">notes</p>
                        <p className="font-sans text-sm text-cream/80">{inq.notes}</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {inq.status !== "contacted" && (
                      <button onClick={() => handleStatusUpdate(inq.id, "contacted")} className="rounded-lg bg-sage px-4 py-2 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80">contacted</button>
                    )}
                    {inq.status !== "in_progress" && (
                      <button onClick={() => handleStatusUpdate(inq.id, "in_progress")} className="rounded-lg bg-lavender/80 px-4 py-2 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80">in progress</button>
                    )}
                    {inq.status !== "closed" && (
                      <button onClick={() => handleStatusUpdate(inq.id, "closed")} className="rounded-lg bg-white/10 px-4 py-2 font-mono text-[11px] font-medium text-muted transition-opacity hover:opacity-80">close</button>
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
