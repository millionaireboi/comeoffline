"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
import { TableRowSkeleton } from "@/components/Skeleton";

interface VouchCodeUsage {
  user_id: string;
  user_name?: string;
  used_at: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
}

interface VouchCode {
  id: string;
  code: string;
  type: "single" | "multi" | "unlimited";
  status: "active" | "paused" | "expired" | "depleted";
  rules: { max_uses: number | null; expires_at?: string; valid_from?: string };
  uses: number;
  used_by: VouchCodeUsage[];
  label?: string;
  description?: string;
  created_at: string;
  created_by_admin?: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "#6B7A63",
  paused: "#D4A574",
  expired: "#9B8E82",
  depleted: "#C4704D",
};

const TYPE_LABELS: Record<string, string> = {
  single: "single",
  multi: "multi",
  unlimited: "unlimited",
};

export function InviteCodesTab() {
  const { data: codes, loading, error, refetch } = useApi<VouchCode[]>("/api/admin/vouch-codes", {
    refreshInterval: 0,
  });
  const [creating, setCreating] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");

  // Form state
  const [codeType, setCodeType] = useState<"single" | "multi" | "unlimited">("single");
  const [count, setCount] = useState("10");
  const [maxUses, setMaxUses] = useState("10");
  const [customCode, setCustomCode] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [validFrom, setValidFrom] = useState("");

  async function handleCopyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const input = document.createElement("input");
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleCopyAllActive() {
    const activeList = codes?.filter((c) => c.status === "active").map((c) => c.code) ?? [];
    if (activeList.length === 0) return;
    try {
      await navigator.clipboard.writeText(activeList.join("\n"));
    } catch {
      const input = document.createElement("textarea");
      input.value = activeList.join("\n");
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
    }
    setCopiedCode("ALL");
    setTimeout(() => setCopiedCode(null), 2000);
  }

  async function handleCreate() {
    if (codeType === "single") {
      const countNum = parseInt(count, 10);
      if (!countNum || countNum < 1 || countNum > 100) {
        alert("Count must be between 1 and 100");
        return;
      }
    }

    setCreating(true);
    try {
      await apiClient.post("/api/admin/vouch-codes/create", {
        type: codeType,
        count: codeType === "single" ? parseInt(count, 10) : 1,
        label: label.trim() || undefined,
        description: description.trim() || undefined,
        custom_code: customCode.trim() || undefined,
        rules: {
          max_uses: codeType === "single" ? 1 : codeType === "multi" ? parseInt(maxUses, 10) : null,
          ...(expiresAt && { expires_at: new Date(expiresAt).toISOString() }),
          ...(validFrom && { valid_from: new Date(validFrom).toISOString() }),
        },
      });

      // Reset form
      setCount("10");
      setMaxUses("10");
      setCustomCode("");
      setLabel("");
      setDescription("");
      setExpiresAt("");
      setValidFrom("");
      setShowForm(false);
      await refetch();
    } catch (err) {
      console.error("Failed to create codes:", err);
      const error = err as Error & { data?: { error?: string } };
      alert(error.data?.error || error.message || "Failed to create codes");
    } finally {
      setCreating(false);
    }
  }

  async function handleTogglePause(code: VouchCode) {
    const newStatus = code.status === "paused" ? "active" : "paused";
    try {
      await apiClient.put(`/api/admin/vouch-codes/${code.id}`, { status: newStatus });
      await refetch();
    } catch (err) {
      console.error("Failed to update code:", err);
    }
  }

  async function handleDelete(codeId: string) {
    try {
      await apiClient.delete(`/api/admin/vouch-codes/${codeId}`);
      setDeleteConfirm(null);
      await refetch();
    } catch (err) {
      console.error("Failed to delete code:", err);
    }
  }

  // Stats
  const totalCodes = codes?.length ?? 0;
  const activeCodes = codes?.filter((c) => c.status === "active").length ?? 0;
  const pausedCodes = codes?.filter((c) => c.status === "paused").length ?? 0;
  const depletedCodes = codes?.filter((c) => c.status === "depleted").length ?? 0;
  const totalUses = codes?.reduce((sum, c) => sum + c.uses, 0) ?? 0;

  // Filtered codes
  const filtered = codes?.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return c.code.toLowerCase().includes(q) || (c.label || "").toLowerCase().includes(q);
    }
    return true;
  }) ?? [];

  function getUsageLabel(code: VouchCode) {
    if (code.type === "unlimited") return `${code.uses} used`;
    if (code.type === "single") return code.uses > 0 ? "used" : "unused";
    return `${code.uses}/${code.rules.max_uses} used`;
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-mono text-sm uppercase tracking-[2px] text-cream">
            vouch codes
          </h2>
          <p className="mt-1 font-mono text-[11px] text-muted">
            manage invite and promo codes for your community
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="rounded-xl bg-caramel px-4 py-2 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-80"
        >
          {showForm ? "cancel" : "create codes"}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-xl border border-highlight/20 bg-highlight/5 p-4">
          <p className="font-mono text-xs text-highlight">
            {error.message.includes('Rate limited') || error.message.includes('quota')
              ? 'Rate limited. Showing cached data. Refreshes automatically.'
              : error.message}
          </p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3">
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">total</p>
          <p className="mt-1 font-mono text-2xl text-cream">{totalCodes}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">active</p>
          <p className="mt-1 font-mono text-2xl text-cream">{activeCodes}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">paused</p>
          <p className="mt-1 font-mono text-2xl text-cream">{pausedCodes}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">depleted</p>
          <p className="mt-1 font-mono text-2xl text-cream">{depletedCodes}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
          <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">total uses</p>
          <p className="mt-1 font-mono text-2xl text-cream">{totalUses}</p>
        </div>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
          {/* Type selector */}
          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              code type
            </label>
            <div className="flex gap-2">
              {(["single", "multi", "unlimited"] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setCodeType(t)}
                  className={`rounded-lg px-4 py-2 font-mono text-[11px] transition-colors ${
                    codeType === t
                      ? "bg-caramel text-gate-black"
                      : "border border-white/10 text-muted hover:text-cream"
                  }`}
                >
                  {t === "single" ? "single use (batch)" : t === "multi" ? "multi-use" : "unlimited"}
                </button>
              ))}
            </div>
          </div>

          {/* Batch count for single, max uses for multi */}
          {codeType === "single" && (
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
                quantity (1-100)
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={count}
                onChange={(e) => setCount(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
              />
            </div>
          )}

          {codeType === "multi" && (
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
                max uses
              </label>
              <input
                type="number"
                min="2"
                value={maxUses}
                onChange={(e) => setMaxUses(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
              />
            </div>
          )}

          {/* Custom code (only for single-code creation) */}
          {(codeType === "multi" || codeType === "unlimited") && (
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
                custom code (optional)
              </label>
              <input
                type="text"
                value={customCode}
                onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                placeholder="e.g., COMEOFFLINE"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              label (optional)
            </label>
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Founding 50, Press Kit, Launch Event"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
              description (optional)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal note about this code"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
            />
          </div>

          {/* Date fields */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
                valid from (optional)
              </label>
              <input
                type="datetime-local"
                value={validFrom}
                onChange={(e) => setValidFrom(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block font-mono text-[11px] uppercase tracking-[2px] text-muted">
                expires at (optional)
              </label>
              <input
                type="datetime-local"
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleCreate}
            disabled={creating}
            className="w-full rounded-xl bg-caramel px-4 py-3 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-80 disabled:opacity-50"
          >
            {creating ? "creating..." : "generate codes"}
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search codes..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
        >
          <option value="all">all</option>
          <option value="active">active</option>
          <option value="paused">paused</option>
          <option value="depleted">depleted</option>
          <option value="expired">expired</option>
        </select>
        {activeCodes > 0 && (
          <button
            onClick={handleCopyAllActive}
            className="shrink-0 rounded-xl border border-white/10 px-4 py-2.5 font-mono text-[11px] text-muted transition-colors hover:border-caramel/30 hover:text-cream"
          >
            {copiedCode === "ALL" ? "copied" : `copy all active`}
          </button>
        )}
      </div>

      <p className="font-mono text-[10px] text-muted">
        {filtered.length} code{filtered.length !== 1 ? "s" : ""}
      </p>

      {/* Codes List */}
      {loading ? (
        <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}</div>
      ) : !codes || codes.length === 0 ? (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-8 text-center">
          <p className="font-mono text-sm text-muted">no codes created yet</p>
          <p className="mt-2 font-mono text-[11px] text-muted/50">
            create your first batch to start inviting members
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((code) => (
            <div key={code.id} className="rounded-xl border border-white/5 bg-white/[0.02]">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[code.status] || "#9B8E82" }}
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm text-cream">{code.code}</p>
                      <span
                        className="rounded-full px-1.5 py-0.5 font-mono text-[8px] uppercase"
                        style={{
                          color: STATUS_COLORS[code.status],
                          background: (STATUS_COLORS[code.status] || "#9B8E82") + "15",
                        }}
                      >
                        {TYPE_LABELS[code.type]}
                      </span>
                    </div>
                    {code.label && (
                      <p className="mt-0.5 font-mono text-[10px] text-muted/50">{code.label}</p>
                    )}
                    <div className="mt-1 flex items-center gap-3">
                      <p className="font-mono text-[10px] text-muted">{getUsageLabel(code)}</p>
                      {/* Progress bar for multi-use */}
                      {code.type === "multi" && code.rules.max_uses && (
                        <div className="h-1 w-16 overflow-hidden rounded-full bg-white/5">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${Math.min(100, (code.uses / code.rules.max_uses) * 100)}%`,
                              backgroundColor: STATUS_COLORS[code.status],
                            }}
                          />
                        </div>
                      )}
                      {code.rules.expires_at && (
                        <p className="font-mono text-[9px] text-muted/40">
                          expires {new Date(code.rules.expires_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopyCode(code.code)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-caramel/30 hover:text-cream"
                  >
                    {copiedCode === code.code ? "copied" : "copy"}
                  </button>

                  {(code.status === "active" || code.status === "paused") && (
                    <button
                      onClick={() => handleTogglePause(code)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-caramel/30 hover:text-cream"
                    >
                      {code.status === "paused" ? "resume" : "pause"}
                    </button>
                  )}

                  {code.used_by.length > 0 && (
                    <button
                      onClick={() => setExpandedCode(expandedCode === code.id ? null : code.id)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-caramel/30 hover:text-cream"
                    >
                      {expandedCode === code.id ? "hide" : `${code.uses} uses`}
                    </button>
                  )}

                  {deleteConfirm === code.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(code.id)}
                        className="rounded-lg bg-danger/20 px-3 py-1.5 font-mono text-[10px] text-danger transition-colors hover:bg-danger/30"
                      >
                        confirm
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] text-muted"
                      >
                        cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(code.id)}
                      className="rounded-lg border border-white/10 px-3 py-1.5 font-mono text-[10px] text-muted transition-colors hover:border-danger/30 hover:text-danger"
                    >
                      delete
                    </button>
                  )}

                  <div className="text-right">
                    <p className="font-mono text-[10px] text-muted/50">
                      {new Date(code.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>

              {/* Usage log */}
              {expandedCode === code.id && code.used_by.length > 0 && (
                <div className="border-t border-white/5 px-4 py-3">
                  <p className="mb-2 font-mono text-[9px] uppercase tracking-[1px] text-muted">usage log</p>
                  <div className="space-y-1.5">
                    {code.used_by.map((usage, i) => (
                      <div key={i} className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2">
                        <div className="flex items-center gap-3">
                          <p className="font-mono text-[11px] text-cream">
                            {usage.user_name || usage.user_id.slice(0, 12) + "..."}
                          </p>
                          {usage.source && (
                            <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[8px] text-muted">
                              {usage.source}
                            </span>
                          )}
                          {usage.utm_source && (
                            <span className="rounded-full bg-lavender/10 px-2 py-0.5 font-mono text-[8px] text-lavender">
                              utm: {usage.utm_source}
                            </span>
                          )}
                        </div>
                        <p className="font-mono text-[9px] text-muted/50">
                          {new Date(usage.used_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
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
