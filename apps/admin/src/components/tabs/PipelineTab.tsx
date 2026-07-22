"use client";

import { useMemo, useState } from "react";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { TableRowSkeleton } from "@/components/Skeleton";

/**
 * Creator acquisition pipeline — reachout → pitched → onboarded /
 * not interested. The creator-ops person's home tab: prospect contacts,
 * an append-only notes log, and stage moves. Once someone's onboarded,
 * the actual creator setup happens in the creators tab.
 */

const STAGES = [
  { key: "reachout", label: "reached out", emoji: "📤" },
  { key: "pitched", label: "pitched", emoji: "🤝" },
  { key: "onboarded", label: "onboarded", emoji: "✅" },
  { key: "not_interested", label: "not interested", emoji: "🚫" },
] as const;

type StageKey = (typeof STAGES)[number]["key"];

interface Prospect {
  id: string;
  name: string;
  ig_handle: string | null;
  phone: string | null;
  email: string | null;
  followers: string | null;
  stage: StageKey;
  notes: { text: string; at: string; by: string | null }[];
  creator_handle: string | null;
  updated_at: string;
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[12px] text-cream placeholder:text-muted focus:border-caramel/50 focus:outline-none";
const labelClass = "mb-1 block font-mono text-[10px] uppercase tracking-[1px] text-muted";
const btnClass =
  "rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream disabled:opacity-40";

function ProspectCard({ prospect, onChanged }: { prospect: Prospect; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [newNote, setNewNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  const move = async (stage: StageKey) => {
    setBusy(true);
    try {
      await apiClient.put(`/api/admin/prospects/${prospect.id}`, { stage });
      if (stage === "onboarded") {
        toast.success(`${prospect.name} onboarded 🎉 — now set them up in the creators tab`);
      } else {
        toast.success(`${prospect.name} → ${STAGES.find((s) => s.key === stage)?.label}`);
      }
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "move failed");
    } finally {
      setBusy(false);
    }
  };

  const addNote = async () => {
    if (!newNote.trim()) return;
    setBusy(true);
    try {
      await apiClient.post(`/api/admin/prospects/${prospect.id}/notes`, { text: newNote.trim() });
      setNewNote("");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "couldn't add note");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    try {
      await apiClient.delete(`/api/admin/prospects/${prospect.id}`);
      toast.success(`${prospect.name} removed`);
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "delete failed");
    } finally {
      setBusy(false);
    }
  };

  const lastNote = prospect.notes[prospect.notes.length - 1];
  const nextMoves: { to: StageKey; label: string }[] =
    prospect.stage === "reachout"
      ? [
          { to: "pitched", label: "pitched →" },
          { to: "not_interested", label: "not interested" },
        ]
      : prospect.stage === "pitched"
        ? [
            { to: "onboarded", label: "onboarded ✓" },
            { to: "not_interested", label: "not interested" },
          ]
        : prospect.stage === "not_interested"
          ? [{ to: "reachout", label: "↺ retry later" }]
          : [];

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[13px] font-medium text-cream">{prospect.name}</span>
            {prospect.followers && (
              <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[9px] text-muted">
                {prospect.followers} followers
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-[10px] text-muted">
            {prospect.ig_handle && (
              <a
                href={`https://instagram.com/${prospect.ig_handle.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-caramel"
              >
                @{prospect.ig_handle.replace(/^@/, "")}
              </a>
            )}
            {prospect.phone && (
              <>
                {prospect.ig_handle && " · "}
                <a href={`https://wa.me/${prospect.phone.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer">
                  {prospect.phone}
                </a>
              </>
            )}
            {prospect.email && `${prospect.ig_handle || prospect.phone ? " · " : ""}${prospect.email}`}
          </p>
          {lastNote && !notesOpen && (
            <p className="mt-1.5 truncate font-mono text-[10px] text-muted/70">“{lastNote.text}”</p>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {nextMoves.map((m) => (
            <button
              key={m.to}
              onClick={() => move(m.to)}
              disabled={busy}
              className={m.to === "onboarded" || m.to === "pitched" ? `${btnClass} !text-caramel` : btnClass}
            >
              {m.label}
            </button>
          ))}
          <button onClick={() => setNotesOpen((o) => !o)} className={btnClass}>
            notes{prospect.notes.length > 0 ? ` · ${prospect.notes.length}` : ""}
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={remove}
                disabled={busy}
                className="rounded-lg bg-[#B85C4A] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-white hover:opacity-80"
              >
                confirm
              </button>
              <button onClick={() => setConfirmDelete(false)} className={btnClass}>
                keep
              </button>
            </>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className={`${btnClass} hover:!text-[#B85C4A]`}>
              ✕
            </button>
          )}
        </div>
      </div>

      {notesOpen && (
        <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
          {prospect.notes.length === 0 && <p className="font-mono text-[10px] text-muted">no notes yet</p>}
          {[...prospect.notes].reverse().map((n, i) => (
            <p key={i} className="font-mono text-[10px] text-muted">
              <span className="text-muted/60">
                {new Date(n.at).toLocaleDateString("en-IN", { day: "numeric", month: "short" })} ·{" "}
              </span>
              {n.text}
            </p>
          ))}
          <div className="flex gap-2">
            <input
              type="text"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addNote()}
              placeholder="add a note — call outcome, next step, vibe…"
              className={inputClass}
            />
            <button onClick={addNote} disabled={busy || !newNote.trim()} className={`${btnClass} shrink-0`}>
              add
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export function PipelineTab() {
  const { data: prospects, loading, refetch } = useApi<Prospect[]>("/api/admin/prospects", {
    dedupingInterval: 15 * 1000,
  });

  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [ig, setIg] = useState("");
  const [phone, setPhone] = useState("");
  const [followers, setFollowers] = useState("");
  const [note, setNote] = useState("");
  const [creating, setCreating] = useState(false);

  const byStage = useMemo(() => {
    const map = new Map<StageKey, Prospect[]>(STAGES.map((s) => [s.key, []]));
    for (const p of prospects ?? []) map.get(p.stage)?.push(p);
    return map;
  }, [prospects]);

  const handleCreate = async () => {
    if (!name.trim()) {
      toast.error("name is required");
      return;
    }
    setCreating(true);
    try {
      await apiClient.post("/api/admin/prospects", {
        name: name.trim(),
        ig_handle: ig.trim() || undefined,
        phone: phone.trim() || undefined,
        followers: followers.trim() || undefined,
        note: note.trim() || undefined,
      });
      toast.success(`${name.trim()} added to the pipeline`);
      setName("");
      setIg("");
      setPhone("");
      setFollowers("");
      setNote("");
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to add prospect");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[1px] text-muted">
          creator pipeline{" "}
          {prospects &&
            `· ${STAGES.map((s) => `${byStage.get(s.key)?.length ?? 0} ${s.label}`).join(" · ")}`}
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80"
        >
          {showForm ? "cancel" : "+ prospect"}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="who are we wooing?" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>instagram handle</label>
              <input type="text" value={ig} onChange={(e) => setIg(e.target.value)} placeholder="their.handle" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>phone / whatsapp</label>
              <input type="text" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+91…" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>followers (rough)</label>
              <input type="text" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="25k" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>first note (optional)</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="dm'd on 22 jul — makes third-place content, warm reply"
                className={inputClass}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !name.trim()}
            className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {creating ? "adding…" : "add to pipeline"}
          </button>
        </div>
      )}

      {loading ? (
        <div className="space-y-1">{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}</div>
      ) : !prospects || prospects.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">
          empty pipeline — add the first creator you’re reaching out to
        </p>
      ) : (
        STAGES.map((stage) => {
          const list = byStage.get(stage.key) ?? [];
          if (list.length === 0) return null;
          return (
            <div key={stage.key} className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
                {stage.emoji} {stage.label} · {list.length}
              </p>
              {list.map((p) => (
                <ProspectCard key={p.id} prospect={p} onChanged={refetch} />
              ))}
            </div>
          );
        })
      )}
    </div>
  );
}
