"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";
import { EventPicker } from "@/components/EventPicker";

interface ApiTemplate {
  name: string;
  language: string;
  status: string;
  category: string;
  bodyText: string;
  bodyVarCount: number;
  hasImageHeader: boolean;
}

type AudienceType = "all" | "status" | "event" | "purchasers" | "never_purchased" | "manual";

interface Audience {
  type: AudienceType;
  status?: "active" | "provisional";
  event_id?: string;
  phones?: string[];
}

interface CampaignTotals {
  eligible: number;
  sent: number;
  failed: number;
  skipped_no_phone: number;
}

interface Campaign {
  id: string;
  name: string;
  template_name: string;
  template_category?: string;
  language_code: string;
  body_params: string[];
  header_image_id: string | null;
  audience: Audience;
  status: "draft" | "sending" | "sent" | "cancelled";
  totals: CampaignTotals;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

interface DeliveryStats {
  counts: Record<string, number>;
  failures: Array<{ to: string; error: string }>;
}

interface SendProgress {
  done: boolean;
  status: string;
  sent: number;
  failed: number;
  remaining: number;
  total_eligible: number;
}

const AUDIENCE_LABELS: Record<AudienceType, string> = {
  all: "all members",
  status: "by member status",
  event: "event attendees (RSVPs + tickets)",
  purchasers: "purchased a ticket before",
  never_purchased: "never purchased",
  manual: "manual phone list",
};

function describeAudience(a: Audience): string {
  switch (a.type) {
    case "status":
      return `${a.status} members`;
    case "event":
      return `event ${a.event_id}`;
    case "manual":
      return `${a.phones?.length ?? 0} pasted numbers`;
    default:
      return AUDIENCE_LABELS[a.type];
  }
}

export function MarketingPanel() {
  const { getIdToken } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [composing, setComposing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const authedFetch = useCallback(
    async (path: string, init?: RequestInit) => {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_URL}${path}`, {
        ...init,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(init?.headers ?? {}),
        },
      });
      return res.json();
    },
    [getIdToken],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cmpData, tplData] = await Promise.all([
        authedFetch("/api/admin/whatsapp/campaigns"),
        authedFetch("/api/admin/whatsapp/templates"),
      ]);
      if (!cmpData.success) throw new Error(cmpData.error || "Failed to load campaigns");
      setCampaigns(cmpData.data.campaigns || []);
      if (tplData.success) setTemplates(tplData.data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [authedFetch]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const usableTemplates = useMemo(
    () => templates.filter((t) => t.status === "APPROVED" && t.category !== "AUTHENTICATION"),
    [templates],
  );

  if (loading) return <p className="font-mono text-[11px] text-muted">loading campaigns...</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-coral/40 bg-coral/10 p-3 font-mono text-[11px] text-coral">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <p className="font-mono text-[11px] text-muted">
          Bulk-send an approved template to a member segment. WhatsApp only allows pre-approved
          templates for outbound marketing — draft new ones in Meta Business Manager, then pick
          them here once approved.
        </p>
        <button
          onClick={() => setComposing((c) => !c)}
          className="shrink-0 rounded-md bg-caramel px-4 py-2 font-mono text-[10px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-90"
        >
          {composing ? "close" : "new campaign"}
        </button>
      </div>

      {composing && (
        <CampaignComposer
          templates={usableTemplates}
          authedFetch={authedFetch}
          onCreated={() => {
            setComposing(false);
            fetchAll();
          }}
        />
      )}

      {campaigns.length === 0 && !composing && (
        <p className="font-mono text-[11px] text-muted">No campaigns yet.</p>
      )}

      <div className="space-y-2">
        {campaigns.map((c) => (
          <CampaignRow
            key={c.id}
            campaign={c}
            expanded={expandedId === c.id}
            onToggle={() => setExpandedId(expandedId === c.id ? null : c.id)}
            authedFetch={authedFetch}
            onChanged={fetchAll}
          />
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Composer
// ────────────────────────────────────────────────────────────────────────────────

function CampaignComposer({
  templates,
  authedFetch,
  onCreated,
}: {
  templates: ApiTemplate[];
  authedFetch: (path: string, init?: RequestInit) => Promise<any>;
  onCreated: () => void;
}) {
  const [name, setName] = useState("");
  const [templateName, setTemplateName] = useState("");
  const [bodyParams, setBodyParams] = useState<string[]>([]);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [audienceType, setAudienceType] = useState<AudienceType>("all");
  const [statusValue, setStatusValue] = useState<"active" | "provisional">("active");
  const [eventId, setEventId] = useState("");
  const [manualPhones, setManualPhones] = useState("");
  const [preview, setPreview] = useState<{
    eligible: number;
    skipped_no_phone: number;
    sample: Array<{ display_name: string; phone_preview: string }>;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const template = templates.find((t) => t.name === templateName) ?? null;

  function selectTemplate(nameValue: string) {
    setTemplateName(nameValue);
    const t = templates.find((x) => x.name === nameValue);
    setBodyParams(new Array(t?.bodyVarCount ?? 0).fill(""));
  }

  function buildAudience(): Audience | null {
    switch (audienceType) {
      case "status":
        return { type: "status", status: statusValue };
      case "event":
        return eventId ? { type: "event", event_id: eventId } : null;
      case "manual": {
        const phones = manualPhones
          .split(/[\n,;]+/)
          .map((p) => p.trim())
          .filter(Boolean);
        return phones.length > 0 ? { type: "manual", phones } : null;
      }
      default:
        return { type: audienceType };
    }
  }

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg)$/.test(file.type) || file.size > 5 * 1024 * 1024) {
      setMessage("Header image must be PNG/JPEG under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUri(String(reader.result));
      setImageFilename(file.name);
      setMessage("");
    };
    reader.readAsDataURL(file);
  }

  async function previewAudience() {
    const audience = buildAudience();
    if (!audience) {
      setMessage("Complete the audience selection first.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const data = await authedFetch("/api/admin/whatsapp/campaigns/preview-audience", {
        method: "POST",
        body: JSON.stringify({ audience }),
      });
      if (!data.success) throw new Error(data.error);
      setPreview(data.data);
    } catch (err) {
      setMessage(`Preview failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBusy(false);
    }
  }

  async function create() {
    const audience = buildAudience();
    if (!name.trim() || !templateName || !audience) {
      setMessage("Name, template and audience are all required.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      let headerImageId: string | undefined;
      if (template?.hasImageHeader) {
        if (!imageDataUri) {
          setMessage("This template has an image header — upload an image first.");
          return;
        }
        const upData = await authedFetch("/api/admin/whatsapp/upload-media", {
          method: "POST",
          body: JSON.stringify({ dataUri: imageDataUri }),
        });
        if (!upData.success) throw new Error(`Image upload failed: ${upData.error}`);
        headerImageId = upData.data.mediaId;
      }
      const data = await authedFetch("/api/admin/whatsapp/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name,
          template_name: templateName,
          body_params: bodyParams,
          header_image_id: headerImageId,
          audience,
        }),
      });
      if (!data.success) throw new Error(data.error);
      onCreated();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4 rounded-xl border border-white/5 bg-near-black p-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-muted">new campaign</h3>

      <Field label="campaign name" value={name} onChange={setName} placeholder="e.g. july supper club push" />

      <label className="block">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
          template (approved, non-auth)
        </span>
        <select
          value={templateName}
          onChange={(e) => selectTemplate(e.target.value)}
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-sand"
        >
          <option value="">— pick a template —</option>
          {templates.map((t) => (
            <option key={`${t.name}-${t.language}`} value={t.name}>
              {t.name} · {t.category} · {t.bodyVarCount} var{t.bodyVarCount === 1 ? "" : "s"}
              {t.hasImageHeader ? " · image header" : ""}
            </option>
          ))}
        </select>
        {templates.length === 0 && (
          <p className="mt-1 font-mono text-[10px] text-caramel">
            No approved non-auth templates found — create a MARKETING template in Meta Business
            Manager first.
          </p>
        )}
      </label>

      {template && (
        <>
          <pre className="whitespace-pre-wrap rounded-md bg-black/40 p-3 font-mono text-[11px] text-sand">
{template.bodyText}
          </pre>
          {bodyParams.map((p, i) => (
            <Field
              key={i}
              label={`{{${i + 1}}} — supports {first_name} token`}
              value={p}
              onChange={(v) => setBodyParams((prev) => prev.map((x, idx) => (idx === i ? v : x)))}
              placeholder="{first_name}"
            />
          ))}
          {template.hasImageHeader && (
            <label className="block">
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
                header image (PNG/JPEG, &lt;5MB)
              </span>
              <input
                type="file"
                accept="image/png,image/jpeg"
                onChange={pickImage}
                className="block w-full font-mono text-[11px] text-sand file:mr-3 file:rounded-md file:border-0 file:bg-white/5 file:px-3 file:py-1.5 file:font-mono file:text-[10px] file:text-cream"
              />
              {imageFilename && (
                <span className="mt-1 block font-mono text-[10px] text-sage">picked: {imageFilename}</span>
              )}
            </label>
          )}
        </>
      )}

      <div className="space-y-3 rounded-md bg-black/30 p-3">
        <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">audience</p>
        <select
          value={audienceType}
          onChange={(e) => {
            setAudienceType(e.target.value as AudienceType);
            setPreview(null);
          }}
          className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-sand"
        >
          {(Object.keys(AUDIENCE_LABELS) as AudienceType[]).map((t) => (
            <option key={t} value={t}>
              {AUDIENCE_LABELS[t]}
            </option>
          ))}
        </select>

        {audienceType === "status" && (
          <select
            value={statusValue}
            onChange={(e) => setStatusValue(e.target.value as "active" | "provisional")}
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-sand"
          >
            <option value="active">active</option>
            <option value="provisional">provisional</option>
          </select>
        )}

        {audienceType === "event" && (
          <EventPicker
            value={eventId}
            onChange={(id) => {
              setEventId(id);
              setPreview(null);
            }}
            emptyLabel="— pick an event —"
            selectClassName="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-sand"
          />
        )}

        {audienceType === "manual" && (
          <textarea
            value={manualPhones}
            onChange={(e) => setManualPhones(e.target.value)}
            rows={4}
            placeholder={"one number per line\n+919663241658\n9812345678 (10 digits assumes +91)"}
            className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-sand"
          />
        )}

        <div className="flex items-center gap-3">
          <button
            onClick={previewAudience}
            disabled={busy}
            className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[2px] text-muted hover:text-cream disabled:opacity-50"
          >
            preview audience
          </button>
          {preview && (
            <span className="font-mono text-[11px] text-sand">
              <span className="text-sage">{preview.eligible}</span> eligible ·{" "}
              {preview.skipped_no_phone} skipped (no phone)
              {preview.sample.length > 0 && (
                <span className="text-muted">
                  {" "}
                  — e.g. {preview.sample.map((s) => `${s.display_name} ${s.phone_preview}`).join(", ")}
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={create}
        disabled={busy}
        className="w-full rounded-md bg-caramel px-4 py-2 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {busy ? "working..." : "create draft (doesn't send)"}
      </button>

      {message && (
        <p className="rounded-md bg-coral/10 p-2 font-mono text-[10px] text-coral">{message}</p>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Campaign row + detail
// ────────────────────────────────────────────────────────────────────────────────

function CampaignRow({
  campaign: c,
  expanded,
  onToggle,
  authedFetch,
  onChanged,
}: {
  campaign: Campaign;
  expanded: boolean;
  onToggle: () => void;
  authedFetch: (path: string, init?: RequestInit) => Promise<any>;
  onChanged: () => void;
}) {
  const statusColor =
    c.status === "sent"
      ? "bg-sage/20 text-sage"
      : c.status === "sending"
        ? "bg-caramel/20 text-caramel"
        : c.status === "cancelled"
          ? "bg-coral/20 text-coral"
          : "bg-white/5 text-muted";

  return (
    <div className="rounded-xl border border-white/5 bg-near-black">
      <button onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="font-serif text-[15px] text-cream">{c.name}</span>
        <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase ${statusColor}`}>
          {c.status}
        </span>
        <span className="hidden font-mono text-[10px] text-muted sm:inline">
          {c.template_name} → {describeAudience(c.audience)}
        </span>
        <span className="ml-auto font-mono text-[10px] text-muted">
          {c.status !== "draft" && `${c.totals.sent}/${c.totals.eligible} sent · `}
          {new Date(c.created_at).toLocaleDateString()}
        </span>
        <span className="font-mono text-[10px] text-muted">{expanded ? "−" : "+"}</span>
      </button>
      {expanded && <CampaignDetail campaign={c} authedFetch={authedFetch} onChanged={onChanged} />}
    </div>
  );
}

function CampaignDetail({
  campaign: c,
  authedFetch,
  onChanged,
}: {
  campaign: Campaign;
  authedFetch: (path: string, init?: RequestInit) => Promise<any>;
  onChanged: () => void;
}) {
  const [delivery, setDelivery] = useState<DeliveryStats | null>(null);
  const [testTo, setTestTo] = useState("+91");
  const [progress, setProgress] = useState<SendProgress | null>(null);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  const refreshDelivery = useCallback(async () => {
    try {
      const data = await authedFetch(`/api/admin/whatsapp/campaigns/${c.id}`);
      if (data.success) setDelivery(data.data.delivery);
    } catch {
      // best-effort
    }
  }, [authedFetch, c.id]);

  useEffect(() => {
    if (c.status !== "draft") refreshDelivery();
  }, [c.status, refreshDelivery]);

  async function sendTest() {
    setMessage("");
    try {
      const data = await authedFetch(`/api/admin/whatsapp/campaigns/${c.id}/test`, {
        method: "POST",
        body: JSON.stringify({ to: testTo }),
      });
      setMessage(
        data.success
          ? `Test sent → wamid ${data.data.messageId}`
          : `Test failed: ${data.error}${data.code ? ` (code ${data.code})` : ""}`,
      );
    } catch (err) {
      setMessage(`Test failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function sendLoop() {
    setSending(true);
    setMessage("");
    try {
      // The send endpoint processes ~45s per call and returns progress — keep calling
      // until done so Cloud Run request timeouts can't strand the campaign.
      for (;;) {
        const data = await authedFetch(`/api/admin/whatsapp/campaigns/${c.id}/send`, {
          method: "POST",
          body: JSON.stringify({ confirm: true }),
        });
        if (!data.success) {
          setMessage(`Send error: ${data.error}`);
          break;
        }
        setProgress(data.data);
        if (data.data.done) break;
      }
    } catch (err) {
      setMessage(`Send error: ${err instanceof Error ? err.message : String(err)} — click send again to resume; already-sent people won't get duplicates.`);
    } finally {
      setSending(false);
      onChanged();
      refreshDelivery();
    }
  }

  async function runSend() {
    const audienceNote =
      c.totals.eligible > 0 ? `${c.totals.eligible} people` : describeAudience(c.audience);
    if (
      !window.confirm(
        `Send "${c.template_name}" to ${audienceNote}?\n\nThis cannot be undone once messages go out.`,
      )
    ) {
      return;
    }
    await sendLoop();
  }

  async function retryFailed() {
    if (
      !window.confirm(
        `Re-queue ${c.totals.failed} failed recipient(s) and resume sending?\n\nOnly temporary failures (rate limits, network errors) are retried — permanent ones like "not on WhatsApp" are skipped. Tip: for code 131049 (per-user marketing cap), retrying works best a day after the original send.`,
      )
    ) {
      return;
    }
    setMessage("");
    try {
      const data = await authedFetch(`/api/admin/whatsapp/campaigns/${c.id}/retry-failed`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      if (!data.success) {
        setMessage(`Retry failed: ${data.error}`);
        return;
      }
      if (data.data.requeued === 0) {
        setMessage(
          `Nothing to retry — all ${data.data.skipped_permanent} failure(s) are permanent (invalid number, not on WhatsApp, template errors).`,
        );
        onChanged();
        return;
      }
      setMessage(
        `Re-queued ${data.data.requeued} recipient(s) (${data.data.skipped_permanent} permanent skipped) — resuming send...`,
      );
      await sendLoop();
    } catch (err) {
      setMessage(`Retry failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function cancel() {
    if (!window.confirm("Cancel this campaign? Pending recipients will not receive it.")) return;
    const data = await authedFetch(`/api/admin/whatsapp/campaigns/${c.id}/cancel`, { method: "POST" });
    if (!data.success) window.alert(`Cancel failed: ${data.error}`);
    onChanged();
  }

  async function remove() {
    if (!window.confirm(`Delete draft "${c.name}"?`)) return;
    const data = await authedFetch(`/api/admin/whatsapp/campaigns/${c.id}`, { method: "DELETE" });
    if (!data.success) window.alert(`Delete failed: ${data.error}`);
    onChanged();
  }

  const deliveryOrder = ["accepted", "sent", "delivered", "read", "failed"];

  return (
    <div className="space-y-4 border-t border-white/5 p-4">
      <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
        <Stat label="eligible" value={c.totals.eligible} />
        <Stat label="sent" value={c.totals.sent} />
        <Stat label="failed" value={c.totals.failed} tone={c.totals.failed > 0 ? "coral" : undefined} />
        <Stat label="no phone" value={c.totals.skipped_no_phone} />
      </div>

      {delivery && Object.keys(delivery.counts).length > 0 && (
        <div className="rounded-md bg-black/30 p-3">
          <div className="flex items-center justify-between">
            <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
              delivery (from webhook)
            </p>
            <button
              onClick={refreshDelivery}
              className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted hover:text-cream"
            >
              refresh
            </button>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 font-mono text-[11px]">
            {deliveryOrder
              .filter((s) => delivery.counts[s])
              .map((s) => (
                <span key={s} className={s === "failed" ? "text-coral" : s === "read" ? "text-sage" : "text-sand"}>
                  {s}: {delivery.counts[s]}
                </span>
              ))}
          </div>
          {delivery.failures.length > 0 && (
            <ul className="mt-2 space-y-1 font-mono text-[10px] text-coral">
              {delivery.failures.map((f, i) => (
                <li key={i}>
                  {f.to} — {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {(c.status === "draft" || c.status === "sending") && (
        <>
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Field label="test send to (E.164)" value={testTo} onChange={setTestTo} placeholder="+919663241658" />
            </div>
            <button
              onClick={sendTest}
              className="rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[10px] uppercase tracking-[2px] text-muted hover:text-cream"
            >
              test
            </button>
          </div>

          <button
            onClick={runSend}
            disabled={sending}
            className="w-full rounded-md bg-caramel px-4 py-2 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {sending
              ? progress
                ? `sending... ${progress.sent} sent · ${progress.remaining} remaining`
                : "sending..."
              : c.status === "sending"
                ? "resume send"
                : "send campaign"}
          </button>
        </>
      )}

      {(c.status === "sent" || c.status === "sending") && c.totals.failed > 0 && (
        <button
          onClick={retryFailed}
          disabled={sending}
          className="w-full rounded-md border border-caramel/40 px-4 py-2 font-mono text-[11px] uppercase tracking-[2px] text-caramel transition-colors hover:bg-caramel/10 disabled:opacity-50"
        >
          retry {c.totals.failed} failed
        </button>
      )}

      <div className="flex justify-end gap-2">
        {(c.status === "draft" || c.status === "sending") && (
          <button
            onClick={cancel}
            className="rounded-md border border-coral/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[1.5px] text-coral hover:bg-coral/10"
          >
            cancel campaign
          </button>
        )}
        {(c.status === "draft" || c.status === "cancelled") && (
          <button
            onClick={remove}
            className="rounded-md border border-coral/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[1.5px] text-coral hover:bg-coral/10"
          >
            delete
          </button>
        )}
      </div>

      {message && (
        <pre className="whitespace-pre-wrap rounded-md bg-black/50 p-2 font-mono text-[10px] text-sand">
{message}
        </pre>
      )}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "coral" }) {
  return (
    <div className="rounded-md bg-black/30 p-2">
      <p className="text-[9px] uppercase tracking-[1.5px] text-muted">{label}</p>
      <p className={`font-serif text-xl ${tone === "coral" ? "text-coral" : "text-cream"}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1 block font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
        {label}
      </span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-sand"
      />
    </label>
  );
}
