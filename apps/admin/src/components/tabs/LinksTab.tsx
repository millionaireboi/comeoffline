"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { TableRowSkeleton } from "@/components/Skeleton";
import { LANDING_URL } from "@/lib/constants";
import { GUERRILLA_PAGES, type TrackableLink } from "@comeoffline/types";

const shortUrl = (code: string) => `${LANDING_URL}/l/${code}`;

/** Friendly name when a destination is one of our guerrilla pages. */
function pageLabel(destination: string): string | null {
  const match = GUERRILLA_PAGES.find(
    (p) => destination === p.path || destination.startsWith(`${p.path}?`) || destination.startsWith(`${p.path}/`),
  );
  return match?.label ?? null;
}

/** Sum of hits over the last 7 IST days (poster scans happen in Bangalore). */
function hitsLast7Days(link: TrackableLink): number {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" });
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    total += link.hits_by_day?.[fmt.format(d)] ?? 0;
  }
  return total;
}

/** Inline QR preview + print-ready downloads for one link. */
function QrPanel({ link }: { link: TrackableLink }) {
  const [preview, setPreview] = useState<string | null>(null);
  const url = shortUrl(link.code);

  useEffect(() => {
    // Level-H error correction: posters get rained on and torn
    QRCode.toDataURL(url, { errorCorrectionLevel: "H", margin: 2, width: 240 })
      .then(setPreview)
      .catch(() => toast.error("couldn't generate QR"));
  }, [url]);

  const downloadPng = async () => {
    try {
      const dataUrl = await QRCode.toDataURL(url, { errorCorrectionLevel: "H", margin: 4, width: 2048 });
      triggerDownload(dataUrl, `qr-${link.code}.png`);
    } catch {
      toast.error("couldn't generate PNG");
    }
  };

  const downloadSvg = async () => {
    try {
      const svg = await QRCode.toString(url, { type: "svg", errorCorrectionLevel: "H", margin: 4 });
      const blob = new Blob([svg], { type: "image/svg+xml" });
      const objectUrl = URL.createObjectURL(blob);
      triggerDownload(objectUrl, `qr-${link.code}.svg`);
      URL.revokeObjectURL(objectUrl);
    } catch {
      toast.error("couldn't generate SVG");
    }
  };

  const triggerDownload = (href: string, filename: string) => {
    const a = document.createElement("a");
    a.href = href;
    a.download = filename;
    a.click();
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-5 rounded-lg border border-white/5 bg-white/[0.02] p-4">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt={`QR for ${url}`} className="h-[120px] w-[120px] rounded-md bg-white p-1.5" />
      ) : (
        <div className="h-[120px] w-[120px] animate-pulse rounded-md bg-white/5" />
      )}
      <div className="space-y-2">
        <p className="font-mono text-[10px] text-muted">
          scans open <span className="text-cream">{url}</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={downloadPng}
            className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-cream transition-colors hover:bg-white/10"
          >
            ↓ png (print)
          </button>
          <button
            onClick={downloadSvg}
            className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-cream transition-colors hover:bg-white/10"
          >
            ↓ svg (vector)
          </button>
        </div>
        <p className="font-mono text-[9px] text-muted">
          level-H error correction — survives weathered posters. svg scales to any print size.
        </p>
      </div>
    </div>
  );
}

export function LinksTab() {
  const { data: links, loading, refetch } = useApi<TrackableLink[]>("/api/admin/links", {
    dedupingInterval: 30 * 1000,
  });

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [campaign, setCampaign] = useState("");
  const [page, setPage] = useState(GUERRILLA_PAGES[0].path); // "custom" = freeform destination
  const [customDestination, setCustomDestination] = useState("");
  const [creating, setCreating] = useState(false);

  const [actioningCode, setActioningCode] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [qrOpen, setQrOpen] = useState<string | null>(null);

  // Picking a page auto-tags the destination with this link's code, so the
  // landing page knows which poster the scan came from
  const effectiveDestination = page === "custom" ? customDestination : code ? `${page}?p=${code}` : "";

  const resetForm = () => {
    setCode("");
    setLabel("");
    setCampaign("");
    setPage(GUERRILLA_PAGES[0].path);
    setCustomDestination("");
  };

  const handleCreate = async () => {
    if (!code.trim() || !label.trim() || !effectiveDestination.trim()) {
      toast.error("code, label and destination are required");
      return;
    }
    setCreating(true);
    try {
      await apiClient.post("/api/admin/links", {
        code: code.trim(),
        label: label.trim(),
        campaign: campaign.trim() || null,
        destination: effectiveDestination.trim(),
      });
      toast.success(`${shortUrl(code.trim().toLowerCase())} created`);
      resetForm();
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to create link");
    } finally {
      setCreating(false);
    }
  };

  const handleToggleActive = async (link: TrackableLink) => {
    setActioningCode(link.code);
    try {
      await apiClient.put(`/api/admin/links/${link.code}`, { active: !link.active });
      toast.success(`${link.code} ${link.active ? "paused" : "activated"}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "update failed");
    } finally {
      setActioningCode(null);
    }
  };

  const handleDelete = async (link: TrackableLink) => {
    setActioningCode(link.code);
    try {
      await apiClient.delete(`/api/admin/links/${link.code}`);
      toast.success(`${link.code} deleted`);
      setConfirmDelete(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "delete failed");
    } finally {
      setActioningCode(null);
    }
  };

  const copyUrl = (c: string) => {
    navigator.clipboard.writeText(shortUrl(c)).then(
      () => toast.success("link copied"),
      () => toast.error("couldn't copy"),
    );
  };

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[12px] text-cream placeholder:text-muted focus:border-caramel/50 focus:outline-none";
  const labelClass = "mb-1 block font-mono text-[10px] uppercase tracking-[1px] text-muted";

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[1px] text-muted">
          trackable links {links ? `· ${links.length}` : ""}
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80"
        >
          {showForm ? "cancel" : "+ new link"}
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
                onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="hsr-bakery"
                maxLength={32}
                className={inputClass}
              />
              {code && (
                <p className="mt-1 font-mono text-[9px] text-muted">→ {shortUrl(code)}</p>
              )}
            </div>
            <div>
              <label className={labelClass}>label (where is this poster?)</label>
              <input
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="HSR — bakery wall near 27th main"
                maxLength={80}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass}>points to</label>
              <select value={page} onChange={(e) => setPage(e.target.value)} className={inputClass}>
                {GUERRILLA_PAGES.map((p) => (
                  <option key={p.path} value={p.path}>
                    {p.label}
                  </option>
                ))}
                <option value="custom">custom url…</option>
              </select>
              {page === "custom" ? (
                <input
                  type="text"
                  value={customDestination}
                  onChange={(e) => setCustomDestination(e.target.value)}
                  placeholder="/events or https://instagram.com/…"
                  className={`${inputClass} mt-2`}
                />
              ) : (
                <p className="mt-1 font-mono text-[9px] text-muted">
                  {effectiveDestination
                    ? `scans land on ${effectiveDestination}`
                    : "the code above becomes the ?p= tag automatically"}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>campaign (optional)</label>
              <input
                type="text"
                value={campaign}
                onChange={(e) => setCampaign(e.target.value)}
                placeholder="friends-house-jul18"
                maxLength={48}
                className={inputClass}
              />
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !code.trim() || !label.trim()}
            className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {creating ? "creating..." : "create link"}
          </button>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="space-y-1">{Array.from({ length: 4 }).map((_, i) => <TableRowSkeleton key={i} columns={4} />)}</div>
      ) : !links || links.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">
          no links yet — create one per poster placement, print its QR, and scans show up here
        </p>
      ) : (
        <div className="space-y-3">
          {links.map((link) => {
            const recent = hitsLast7Days(link);
            return (
              <div key={link.code} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => copyUrl(link.code)}
                        title="copy short link"
                        className="font-mono text-[15px] font-medium tracking-[1px] text-cream transition-colors hover:text-caramel"
                      >
                        /l/{link.code}
                      </button>
                      {link.campaign && (
                        <span className="rounded-full bg-caramel/10 px-2.5 py-0.5 font-mono text-[10px] text-caramel">
                          {link.campaign}
                        </span>
                      )}
                      <span
                        className="rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase"
                        style={
                          link.active
                            ? { color: "#A8B5A0", background: "#A8B5A015" }
                            : { color: "#9B8E82", background: "#9B8E8215" }
                        }
                      >
                        {link.active ? "active" : "paused"}
                      </span>
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] text-muted">
                      {link.label}
                      {" · "}
                      <span className="text-cream">{link.hits}</span> scans
                      {recent > 0 && ` (${recent} this week)`}
                      {link.last_hit_at &&
                        ` · last ${new Date(link.last_hit_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`}
                    </p>
                    <p className="mt-0.5 truncate font-mono text-[10px] text-muted/60">
                      scan opens {pageLabel(link.destination) ?? link.destination}
                      {pageLabel(link.destination) && <span className="text-muted/40"> · {link.destination}</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQrOpen(qrOpen === link.code ? null : link.code)}
                      className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream"
                    >
                      {qrOpen === link.code ? "hide qr" : "qr"}
                    </button>
                    <button
                      onClick={() => handleToggleActive(link)}
                      disabled={actioningCode === link.code}
                      className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream disabled:opacity-40"
                    >
                      {link.active ? "pause" : "activate"}
                    </button>
                    {confirmDelete === link.code ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(link)}
                          disabled={actioningCode === link.code}
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
                        onClick={() => setConfirmDelete(link.code)}
                        className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-[#B85C4A]"
                      >
                        delete
                      </button>
                    )}
                  </div>
                </div>
                {qrOpen === link.code && <QrPanel link={link} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
