"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { TableRowSkeleton } from "@/components/Skeleton";

/**
 * Team member management — founder-only. Members sign in to this same ops
 * dashboard with email/password; their role decides which tabs they see
 * (nav-side) and which APIs answer (server-side, the part that matters).
 */

interface TeamMember {
  uid: string;
  email: string;
  name: string;
  role: string;
  added_at: string;
}

const ROLE_OPTIONS = [
  {
    value: "creator_ops",
    label: "creator acquisition",
    desc: "pipeline · creators · links · discounts — no payouts, no member data, no events",
  },
];

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[12px] text-cream placeholder:text-muted focus:border-caramel/50 focus:outline-none";
const labelClass = "mb-1 block font-mono text-[10px] uppercase tracking-[1px] text-muted";

export function TeamTab() {
  const { data: team, loading, refetch } = useApi<TeamMember[]>("/api/admin/team", {
    dedupingInterval: 30 * 1000,
  });

  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState(ROLE_OPTIONS[0].value);
  const [tempPassword, setTempPassword] = useState("");
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!email.trim().includes("@")) {
      toast.error("a valid email is required");
      return;
    }
    setAdding(true);
    try {
      await apiClient.post("/api/admin/team", {
        email: email.trim(),
        name: name.trim() || undefined,
        role,
        temp_password: tempPassword.trim() || undefined,
      });
      toast.success(`${email.trim()} added — they sign in at this dashboard's /login`);
      setEmail("");
      setName("");
      setTempPassword("");
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to add team member");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (m: TeamMember) => {
    try {
      await apiClient.delete(`/api/admin/team/${m.uid}`);
      toast.success(`${m.name} removed — access ends on their next token refresh`);
      setConfirmRemove(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "remove failed");
    }
  };

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[1px] text-muted">
          team {team ? `· ${team.length}` : ""}
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80"
        >
          {showForm ? "cancel" : "+ add member"}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>email (their login)</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="person@team.com" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="their name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>role</label>
              <select value={role} onChange={(e) => setRole(e.target.value)} className={inputClass}>
                {ROLE_OPTIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 font-mono text-[9px] text-muted">
                {ROLE_OPTIONS.find((r) => r.value === role)?.desc}
              </p>
            </div>
            <div>
              <label className={labelClass}>temp password (only if they have no account yet)</label>
              <input
                type="text"
                value={tempPassword}
                onChange={(e) => setTempPassword(e.target.value)}
                placeholder="8+ chars — share it safely"
                className={inputClass}
              />
            </div>
          </div>
          <button
            onClick={handleAdd}
            disabled={adding || !email.trim()}
            className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {adding ? "adding…" : "add member"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-1">{Array.from({ length: 2 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}</div>
      ) : !team || team.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">
          no team members yet — add your creator-acquisition person and they get a scoped dashboard
        </p>
      ) : (
        <div className="space-y-3">
          {team.map((m) => (
            <div key={m.uid} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/[0.02] p-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[14px] text-cream">{m.name}</span>
                  <span className="rounded-full bg-caramel/10 px-2.5 py-0.5 font-mono text-[10px] text-caramel">
                    {ROLE_OPTIONS.find((r) => r.value === m.role)?.label ?? m.role}
                  </span>
                </div>
                <p className="mt-1 font-mono text-[10px] text-muted">
                  {m.email} · added {new Date(m.added_at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                </p>
              </div>
              {confirmRemove === m.uid ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleRemove(m)}
                    className="rounded-lg bg-[#B85C4A] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-white hover:opacity-80"
                  >
                    confirm
                  </button>
                  <button
                    onClick={() => setConfirmRemove(null)}
                    className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted hover:text-cream"
                  >
                    keep
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmRemove(m.uid)}
                  className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-[#B85C4A]"
                >
                  remove
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
