"use client";

import { useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { TableRowSkeleton } from "@/components/Skeleton";
import { EventPicker } from "@/components/EventPicker";
import type { DiscountCode, DiscountType, Event } from "@comeoffline/types";

export function DiscountsTab({ eventId: lockedEventId }: { eventId?: string } = {}) {
  const { data: allCodes, loading, refetch } = useApi<DiscountCode[]>("/api/admin/discounts", {
    dedupingInterval: 30 * 1000,
  });
  // Locked (event-workspace) mode shows only codes that can apply at this
  // event: codes scoped to it plus global ones.
  const codes = lockedEventId
    ? allCodes?.filter((dc) => !dc.event_id || dc.event_id === lockedEventId) ?? null
    : allCodes;
  const { data: events } = useApi<Event[]>("/api/admin/events", {
    dedupingInterval: 2 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<DiscountType>("percent");
  const [value, setValue] = useState("");
  const [eventId, setEventId] = useState(lockedEventId ?? "");
  const [maxUses, setMaxUses] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [creating, setCreating] = useState(false);

  const [actioningCode, setActioningCode] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const resetForm = () => {
    setCode("");
    setType("percent");
    setValue("");
    setEventId(lockedEventId ?? "");
    setMaxUses("");
    setExpiresAt("");
  };

  const handleCreate = async () => {
    const numValue = Number(value);
    if (!code.trim() || !numValue) {
      toast.error("code and value are required");
      return;
    }
    setCreating(true);
    try {
      const selectedEvent = events?.find((e) => e.id === eventId);
      await apiClient.post("/api/admin/discounts", {
        code: code.trim(),
        type,
        value: numValue,
        event_id: eventId || null,
        event_title: selectedEvent?.title || null,
        max_uses: maxUses ? Number(maxUses) : null,
        // datetime-local gives a local timestamp — send as ISO
        expires_at: expiresAt ? new Date(expiresAt).toISOString() : null,
      });
      toast.success(`code ${code.trim().toUpperCase()} created`);
      resetForm();
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to create code");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (dc: DiscountCode) => {
    setActioningCode(dc.code);
    try {
      await apiClient.put(`/api/admin/discounts/${dc.code}`, { active: !dc.active });
      toast.success(`${dc.code} ${dc.active ? "paused" : "activated"}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "update failed");
    } finally {
      setActioningCode(null);
    }
  };

  const handleDelete = async (dc: DiscountCode) => {
    setActioningCode(dc.code);
    try {
      await apiClient.delete(`/api/admin/discounts/${dc.code}`);
      toast.success(`${dc.code} deleted`);
      setConfirmDelete(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "delete failed");
    } finally {
      setActioningCode(null);
    }
  };

  const copyCode = (c: string) => {
    navigator.clipboard.writeText(c).then(
      () => toast.success(`${c} copied`),
      () => toast.error("couldn't copy"),
    );
  };

  const discountLabel = (dc: DiscountCode) =>
    dc.type === "percent" ? `${dc.value}% off` : `₹${dc.value} off`;

  const isExpired = (dc: DiscountCode) => !!dc.expires_at && new Date(dc.expires_at) < new Date();
  const isDepleted = (dc: DiscountCode) => dc.max_uses != null && dc.uses >= dc.max_uses;

  const statusOf = (dc: DiscountCode): { label: string; color: string } => {
    if (!dc.active) return { label: "paused", color: "#9B8E82" };
    if (isExpired(dc)) return { label: "expired", color: "#B85C4A" };
    if (isDepleted(dc)) return { label: "depleted", color: "#B85C4A" };
    return { label: "active", color: "#A8B5A0" };
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[12px] text-cream placeholder:text-muted focus:border-caramel/50 focus:outline-none";
  const labelClass = "mb-1 block font-mono text-[10px] uppercase tracking-[1px] text-muted";

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[1px] text-muted">
          discount codes {codes ? `· ${codes.length}` : ""}
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80"
        >
          {showForm ? "cancel" : "+ new code"}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>code</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="FRIENDS20"
                maxLength={32}
                className={inputClass}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>type</label>
                <select value={type} onChange={(e) => setType(e.target.value as DiscountType)} className={inputClass}>
                  <option value="percent">% off</option>
                  <option value="flat">₹ off</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>{type === "percent" ? "percent" : "amount (₹)"}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder={type === "percent" ? "20" : "200"}
                  min={1}
                  max={type === "percent" ? 100 : undefined}
                  className={inputClass}
                />
              </div>
            </div>
            {lockedEventId ? null : (
              <div>
                <label className={labelClass}>event scope</label>
                <EventPicker
                  value={eventId}
                  onChange={setEventId}
                  emptyLabel="all events"
                  selectClassName={inputClass}
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelClass}>max uses</label>
                <input
                  type="number"
                  value={maxUses}
                  onChange={(e) => setMaxUses(e.target.value)}
                  placeholder="unlimited"
                  min={1}
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass}>expires</label>
                <input
                  type="datetime-local"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !code.trim() || !value}
            className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {creating ? "creating..." : "create code"}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-1">{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}</div>
      ) : !codes || codes.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">
          no discount codes yet — create one to give people money off at checkout
        </p>
      ) : (
        <div className="space-y-3">
          {codes.map((dc) => {
            const status = statusOf(dc);
            return (
              <div key={dc.code} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyCode(dc.code)}
                        title="copy code"
                        className="font-mono text-[15px] font-medium tracking-[1px] text-cream transition-colors hover:text-caramel"
                      >
                        {dc.code}
                      </button>
                      <span className="rounded-full bg-caramel/10 px-2.5 py-0.5 font-mono text-[10px] text-caramel">
                        {discountLabel(dc)}
                      </span>
                      <span
                        className="rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase"
                        style={{ color: status.color, background: `${status.color}15` }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] text-muted">
                      {dc.event_id ? (dc.event_title || dc.event_id) : "all events"}
                      {" · "}
                      {dc.uses}{dc.max_uses != null ? `/${dc.max_uses}` : ""} used
                      {dc.expires_at && ` · expires ${new Date(dc.expires_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleActive(dc)}
                      disabled={actioningCode === dc.code}
                      className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream disabled:opacity-40"
                    >
                      {dc.active ? "pause" : "activate"}
                    </button>
                    {confirmDelete === dc.code ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(dc)}
                          disabled={actioningCode === dc.code}
                          className="rounded-lg bg-[#B85C4A] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                        >
                          confirm
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted hover:text-cream"
                        >
                          keep
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(dc.code)}
                        className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-[#B85C4A]"
                      >
                        delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
