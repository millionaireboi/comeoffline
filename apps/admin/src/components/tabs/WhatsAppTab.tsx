"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { API_URL } from "@/lib/constants";

type TemplateStatus = "APPROVED" | "PENDING" | "REJECTED" | "PAUSED" | "DISABLED" | string;

interface ApiTemplate {
  id: string;
  name: string;
  language: string;
  status: TemplateStatus;
  category: string;
  components: Array<{ type: string; format?: string; text?: string }>;
  bodyText: string;
  bodyVarCount: number;
  hasImageHeader: boolean;
  rejected_reason?: string;
}

interface Scenario {
  key: string;
  label: string;
  description: string;
  trigger: "auto" | "manual" | "cron";
  paramNames: string[];
  sampleParams: string[];
  hasImageHeader: boolean;
  enabled: boolean;
  templateName: string;
  lastFiredAt: string | null;
  lastFiredBy: string | null;
  updatedAt: string | null;
  updatedBy: string | null;
}

type Section = "scenarios" | "install" | "advanced";
type AdvancedTab = "templates" | "diagnostics";

export function WhatsAppTab() {
  const [section, setSection] = useState<Section>("scenarios");

  return (
    <div className="space-y-6 p-2 sm:p-6">
      <header>
        <h2 className="font-serif text-2xl tracking-tight text-cream">WhatsApp</h2>
        <p className="mt-1 font-mono text-[11px] text-muted">
          notification settings · install funnel · template mappings · diagnostics
        </p>
      </header>

      <nav className="flex gap-1 border-b border-white/5">
        {(["scenarios", "install", "advanced"] as Section[]).map((s) => (
          <button
            key={s}
            onClick={() => setSection(s)}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[2px] transition-colors ${
              section === s ? "border-b-2 border-caramel text-cream" : "text-muted hover:text-cream"
            }`}
          >
            {s}
          </button>
        ))}
      </nav>

      {section === "scenarios" && <ScenariosPanel />}
      {section === "install" && <InstallPanel />}
      {section === "advanced" && <AdvancedPanel />}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Scenarios — the primary admin surface.
// ────────────────────────────────────────────────────────────────────────────────

function ScenariosPanel() {
  const { getIdToken } = useAuth();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      const [scnRes, tplRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/whatsapp/scenarios`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/whatsapp/templates`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);
      const scnData = await scnRes.json();
      const tplData = await tplRes.json();
      if (!scnData.success) throw new Error(scnData.error || "Failed to load scenarios");
      setScenarios(scnData.data.scenarios || []);
      // Templates load is best-effort — failure here just disables the picker dropdown.
      if (tplData.success) setTemplates(tplData.data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const approvedTemplates = useMemo(
    () => templates.filter((t) => t.status === "APPROVED"),
    [templates],
  );

  async function patchScenario(key: string, patch: { enabled?: boolean; templateName?: string }) {
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/api/admin/whatsapp/scenarios/${encodeURIComponent(key)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!data.success) {
      window.alert(`Update failed: ${data.error}`);
      return;
    }
    setScenarios((prev) => prev.map((s) => (s.key === key ? data.data : s)));
  }

  if (loading) {
    return <p className="font-mono text-[11px] text-muted">loading scenarios...</p>;
  }
  if (error) {
    return (
      <div className="rounded-lg border border-coral/40 bg-coral/10 p-3 font-mono text-[11px] text-coral">
        {error}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="font-mono text-[11px] text-muted">
        Each scenario fires a specific WhatsApp template when triggered. Toggle off to silence,
        or override the mapped template (e.g. to switch to a v2 after re-approval).
      </p>

      {scenarios.map((s) => (
        <ScenarioRow
          key={s.key}
          scenario={s}
          approvedTemplates={approvedTemplates}
          expanded={expandedKey === s.key}
          onToggle={() => setExpandedKey(expandedKey === s.key ? null : s.key)}
          onPatch={(patch) => patchScenario(s.key, patch)}
        />
      ))}
    </div>
  );
}

function ScenarioRow({
  scenario: s,
  approvedTemplates,
  expanded,
  onToggle,
  onPatch,
}: {
  scenario: Scenario;
  approvedTemplates: ApiTemplate[];
  expanded: boolean;
  onToggle: () => void;
  onPatch: (patch: { enabled?: boolean; templateName?: string }) => void;
}) {
  const triggerColor =
    s.trigger === "auto"
      ? "text-sage"
      : s.trigger === "cron"
        ? "text-lavender"
        : "text-caramel";

  const lastFired = s.lastFiredAt ? new Date(s.lastFiredAt).toLocaleString() : "never";

  return (
    <div className="rounded-xl border border-white/5 bg-near-black">
      <div className="flex items-start gap-3 p-4">
        <Toggle
          checked={s.enabled}
          onChange={(v) => onPatch({ enabled: v })}
        />
        <button onClick={onToggle} className="flex-1 text-left">
          <div className="flex flex-wrap items-baseline gap-2">
            <span className="font-serif text-[16px] text-cream">{s.label}</span>
            <span className={`font-mono text-[9px] uppercase tracking-[1.5px] ${triggerColor}`}>
              {s.trigger}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] text-muted">{s.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 font-mono text-[10px] text-muted">
            <span>
              template: <code className="rounded bg-black/40 px-1.5 py-0.5 text-cream">{s.templateName}</code>
            </span>
            <span>·</span>
            <span>last fired: {lastFired}</span>
          </div>
        </button>
        <span className="font-mono text-[10px] text-muted">{expanded ? "−" : "+"}</span>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-white/5 p-4">
          <div>
            <label className="block font-mono text-[10px] uppercase tracking-[1.5px] text-muted">
              mapped template
            </label>
            <select
              value={s.templateName}
              onChange={(e) => onPatch({ templateName: e.target.value })}
              className="mt-1 w-full max-w-sm rounded-md border border-white/10 bg-black/30 px-3 py-2 font-mono text-[11px] text-sand"
            >
              <option value={s.templateName}>{s.templateName} (current)</option>
              {approvedTemplates
                .filter((t) => t.name !== s.templateName)
                .map((t) => (
                  <option key={t.name} value={t.name}>
                    {t.name} · {t.bodyVarCount} var{t.bodyVarCount === 1 ? "" : "s"}
                  </option>
                ))}
            </select>
            <p className="mt-1 font-mono text-[10px] text-muted">
              Pick any APPROVED template. Make sure the param shape matches what this scenario sends.
            </p>
          </div>

          <ScenarioTestForm scenario={s} />

          <div className="rounded-md bg-black/30 p-3 font-mono text-[10px] text-muted">
            <p>params this scenario sends, in order:</p>
            <ol className="mt-1 list-decimal pl-5 text-sand">
              {s.paramNames.map((p, i) => (
                <li key={i}>{p}</li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}

function ScenarioTestForm({ scenario: s }: { scenario: Scenario }) {
  const { getIdToken } = useAuth();
  const [to, setTo] = useState("+91");
  const [params, setParams] = useState<string[]>(s.sampleParams);
  const [imageDataUri, setImageDataUri] = useState<string | null>(null);
  const [imageFilename, setImageFilename] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string>("");

  function setParam(i: number, v: string) {
    setParams((p) => p.map((x, idx) => (idx === i ? v : x)));
  }

  function pickImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg|jpg)$/.test(file.type)) {
      setResult(`Image must be PNG or JPEG (got ${file.type})`);
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setResult("Image must be under 5MB");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setImageDataUri(String(reader.result));
      setImageFilename(file.name);
      setResult("");
    };
    reader.readAsDataURL(file);
  }

  async function send() {
    setSending(true);
    setResult("");
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");

      let headerImageId: string | undefined;
      if (s.hasImageHeader) {
        if (!imageDataUri) {
          setResult("This scenario uses an image header — upload an image first.");
          return;
        }
        const upRes = await fetch(`${API_URL}/api/admin/whatsapp/upload-media`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ dataUri: imageDataUri }),
        });
        const upData = await upRes.json();
        if (!upData.success) {
          setResult(`Image upload failed: ${upData.error}`);
          return;
        }
        headerImageId = upData.data.mediaId;
      }

      const res = await fetch(
        `${API_URL}/api/admin/whatsapp/scenarios/${encodeURIComponent(s.key)}/test`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ to, params, headerImageId }),
        },
      );
      const data = await res.json();
      if (data.success) {
        setResult(`Sent → ${data.data.templateName} · wamid: ${data.data.messageId}`);
      } else {
        setResult(
          `Error: ${data.error}${data.code ? ` (code ${data.code})` : ""}` +
            (data.details?.error_data?.details ? `\n${data.details.error_data.details}` : ""),
        );
      }
    } catch (err) {
      setResult(`Network error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="space-y-3 rounded-md bg-black/30 p-3">
      <p className="font-mono text-[10px] uppercase tracking-[1.5px] text-muted">test fire</p>
      <Field label="recipient (E.164)" value={to} onChange={setTo} placeholder="+919663241658" />
      {s.paramNames.map((p, i) => (
        <Field
          key={i}
          label={`{{${i + 1}}} ${p}`}
          value={params[i] ?? ""}
          onChange={(v) => setParam(i, v)}
        />
      ))}
      {s.hasImageHeader && (
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
      <button
        onClick={send}
        disabled={sending || !s.enabled}
        className="w-full rounded-md bg-caramel px-4 py-2 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {!s.enabled ? "scenario disabled" : sending ? "sending..." : `fire ${s.templateName}`}
      </button>
      {result && (
        <pre className="whitespace-pre-wrap rounded-md bg-black/50 p-2 font-mono text-[10px] text-sand">
{result}
        </pre>
      )}
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      className={`relative mt-1 inline-flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors ${
        checked ? "bg-sage" : "bg-white/10"
      }`}
    >
      <span
        aria-hidden
        className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-cream shadow transition-transform duration-150 ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
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

// ────────────────────────────────────────────────────────────────────────────────
// Install funnel — PWA install conversion + recent installs.
// ────────────────────────────────────────────────────────────────────────────────

interface InstallStats {
  funnel: {
    total_members: number;
    nudged: number;
    installed: number;
    active_last_7d: number;
    pending_nudges_next_cycle: number;
  };
  rates: {
    nudge_to_install: number | null;
    install_active_last_7d: number | null;
  };
  sources: {
    android_prompt: number;
    ios_instructions: number;
    standalone_detected: number;
  };
  device_split: {
    android_installs: number;
    ios_installs: number;
  };
  recent_installs: Array<{
    user_id: string;
    name?: string;
    installed_at: string;
    source?: string;
    last_standalone_at?: string;
    session_count?: number;
  }>;
}

function InstallPanel() {
  const { getIdToken } = useAuth();
  const [stats, setStats] = useState<InstallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_URL}/api/admin/whatsapp/install-stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to load stats");
      setStats(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) return <p className="font-mono text-[11px] text-muted">loading install funnel...</p>;
  if (error) {
    return (
      <div className="rounded-lg border border-coral/40 bg-coral/10 p-3 font-mono text-[11px] text-coral">
        {error}
      </div>
    );
  }
  if (!stats) return null;

  const { funnel, rates, sources, device_split, recent_installs } = stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] text-muted">
          Tracks the add-to-home-screen flow — from nudge to install to active use.
        </p>
        <button
          onClick={fetchStats}
          className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[2px] text-muted hover:text-cream"
        >
          refresh
        </button>
      </div>

      {/* Funnel */}
      <div className="rounded-xl border border-white/5 bg-near-black p-5">
        <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-muted">funnel</h3>
        <div className="mt-4 space-y-3">
          <FunnelStep
            label="total members"
            value={funnel.total_members}
            note="all signups"
          />
          <FunnelStep
            label="nudged via WhatsApp"
            value={funnel.nudged}
            note={funnel.total_members > 0 ? `${pct(funnel.nudged, funnel.total_members)}% of members` : ""}
            indent
          />
          <FunnelStep
            label="installed"
            value={funnel.installed}
            note={
              rates.nudge_to_install != null
                ? `${rates.nudge_to_install}% of nudged`
                : "no nudges yet"
            }
            indent
            indent2
            highlight={rates.nudge_to_install != null && rates.nudge_to_install >= 30}
          />
          <FunnelStep
            label="active in last 7 days"
            value={funnel.active_last_7d}
            note={
              rates.install_active_last_7d != null
                ? `${rates.install_active_last_7d}% of installed`
                : ""
            }
            indent
            indent2
            indent3
          />
        </div>
        {funnel.pending_nudges_next_cycle > 0 && (
          <p className="mt-4 rounded-md bg-caramel/10 p-2 font-mono text-[10px] text-caramel">
            {funnel.pending_nudges_next_cycle} member(s) eligible for nudge in the next cron cycle.
          </p>
        )}
      </div>

      {/* Source + device breakdown */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Card title="install source">
          <SmallRow label="Android (native prompt)" value={sources.android_prompt} />
          <SmallRow label="iOS (guided)" value={sources.ios_instructions} />
          <SmallRow label="standalone-detected" value={sources.standalone_detected} />
        </Card>
        <Card title="device split">
          <SmallRow label="Android installs" value={device_split.android_installs} />
          <SmallRow label="iOS installs" value={device_split.ios_installs} />
        </Card>
      </div>

      {/* Recent installs */}
      <div>
        <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
          recent installs
        </h3>
        {recent_installs.length === 0 ? (
          <p className="mt-2 font-mono text-[11px] text-muted">No installs yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5">
            {recent_installs.map((r) => (
              <li
                key={r.user_id}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-md bg-near-black px-3 py-2 font-mono text-[11px]"
              >
                <span className="text-cream">{r.name ?? r.user_id}</span>
                <span className="text-muted">·</span>
                <span className="text-muted">
                  installed {new Date(r.installed_at).toLocaleString()}
                </span>
                {r.source && (
                  <>
                    <span className="text-muted">·</span>
                    <span className="text-sage">{r.source}</span>
                  </>
                )}
                {typeof r.session_count === "number" && r.session_count > 0 && (
                  <>
                    <span className="text-muted">·</span>
                    <span className="text-muted">
                      {r.session_count} session{r.session_count === 1 ? "" : "s"}
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function pct(a: number, b: number): number {
  return Math.round((a / b) * 1000) / 10;
}

function FunnelStep({
  label,
  value,
  note,
  indent,
  indent2,
  indent3,
  highlight,
}: {
  label: string;
  value: number;
  note?: string;
  indent?: boolean;
  indent2?: boolean;
  indent3?: boolean;
  highlight?: boolean;
}) {
  const indentLevel = (indent ? 1 : 0) + (indent2 ? 1 : 0) + (indent3 ? 1 : 0);
  return (
    <div className="flex items-baseline gap-3" style={{ paddingLeft: `${indentLevel * 16}px` }}>
      {indent && <span className="text-muted">↳</span>}
      <span className="flex-1 font-mono text-[11px] text-sand">{label}</span>
      <span className={`font-serif text-2xl ${highlight ? "text-sage" : "text-cream"}`}>
        {value.toLocaleString()}
      </span>
      {note && <span className="font-mono text-[10px] text-muted">{note}</span>}
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-white/5 bg-near-black p-4">
      <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-muted">{title}</h3>
      <div className="mt-2 space-y-1">{children}</div>
    </div>
  );
}

function SmallRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between font-mono text-[11px]">
      <span className="text-sand">{label}</span>
      <span className="text-cream">{value.toLocaleString()}</span>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────────
// Advanced — template browser + diagnostics, for debugging only.
// ────────────────────────────────────────────────────────────────────────────────

function AdvancedPanel() {
  const [tab, setTab] = useState<AdvancedTab>("templates");
  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] text-muted">
        Low-level controls. Use scenarios above for day-to-day work.
      </p>
      <nav className="flex gap-1 border-b border-white/5">
        {(["templates", "diagnostics"] as AdvancedTab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 font-mono text-[10px] uppercase tracking-[2px] transition-colors ${
              tab === t ? "border-b-2 border-caramel text-cream" : "text-muted hover:text-cream"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>
      {tab === "templates" && <TemplatesAdvanced />}
      {tab === "diagnostics" && <DiagnosticsPanel />}
    </div>
  );
}

function TemplatesAdvanced() {
  const { getIdToken } = useAuth();
  const [templates, setTemplates] = useState<ApiTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"ALL" | TemplateStatus>("ALL");
  const [expandedName, setExpandedName] = useState<string | null>(null);

  const fetchTemplates = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("Not authenticated");
      const res = await fetch(`${API_URL}/api/admin/whatsapp/templates`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to fetch templates");
      setTemplates(data.data.templates || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    fetchTemplates();
  }, [fetchTemplates]);

  const visible = useMemo(
    () => (filter === "ALL" ? templates : templates.filter((t) => t.status === filter)),
    [templates, filter],
  );

  async function deleteTemplate(name: string) {
    if (!window.confirm(`Delete template "${name}"? Soft delete — name reusable in 30 days.`)) return;
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(`${API_URL}/api/admin/whatsapp/templates/${encodeURIComponent(name)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (data.success) {
      fetchTemplates();
    } else {
      window.alert(`Delete failed: ${data.error}`);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={fetchTemplates}
          className="rounded-md border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[2px] text-muted hover:text-cream"
        >
          {loading ? "loading..." : "refresh"}
        </button>
        {(["ALL", "APPROVED", "PENDING", "REJECTED", "PAUSED"] as const).map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full px-3 py-1 font-mono text-[10px] uppercase tracking-[1.5px] transition-colors ${
              filter === s
                ? "bg-caramel text-gate-black"
                : "border border-white/10 text-muted hover:text-cream"
            }`}
          >
            {s.toLowerCase()}
          </button>
        ))}
        <span className="ml-auto font-mono text-[10px] text-muted">
          {templates.length} total
        </span>
      </div>

      {error && (
        <div className="rounded-lg border border-coral/40 bg-coral/10 p-3 font-mono text-[11px] text-coral">
          {error}
        </div>
      )}

      <div className="space-y-2">
        {visible.map((t) => {
          const expanded = expandedName === `${t.name}-${t.language}`;
          const statusColor =
            t.status === "APPROVED"
              ? "bg-sage/20 text-sage"
              : t.status === "PENDING"
                ? "bg-caramel/20 text-caramel"
                : t.status === "REJECTED"
                  ? "bg-coral/20 text-coral"
                  : "bg-white/5 text-muted";
          return (
            <div key={`${t.name}-${t.language}`} className="rounded-md border border-white/5 bg-near-black p-3">
              <button
                onClick={() => setExpandedName(expanded ? null : `${t.name}-${t.language}`)}
                className="flex w-full items-center gap-3 text-left"
              >
                <span className="font-mono text-[12px] text-cream">{t.name}</span>
                <span className={`rounded-full px-2 py-0.5 font-mono text-[9px] uppercase ${statusColor}`}>
                  {t.status}
                </span>
                <span className="font-mono text-[9px] text-muted">{t.category}</span>
                <span className="font-mono text-[9px] text-muted">{t.language}</span>
                <span className="ml-auto font-mono text-[10px] text-muted">{expanded ? "−" : "+"}</span>
              </button>
              {expanded && (
                <div className="mt-3 space-y-3 border-t border-white/5 pt-3">
                  {t.rejected_reason && (
                    <div className="rounded-md bg-coral/10 p-2 font-mono text-[10px] text-coral">
                      Rejected: {t.rejected_reason}
                    </div>
                  )}
                  <pre className="overflow-x-auto whitespace-pre-wrap rounded-md bg-black/40 p-3 font-mono text-[11px] text-sand">
{t.bodyText}
                  </pre>
                  <div className="flex justify-end">
                    <button
                      onClick={() => deleteTemplate(t.name)}
                      className="rounded-md border border-coral/40 px-3 py-1 font-mono text-[10px] uppercase tracking-[1.5px] text-coral hover:bg-coral/10"
                    >
                      delete
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface ConfigCheck {
  phone_number_id_set: boolean;
  phone_number_id_preview: string | null;
  access_token_set: boolean;
  access_token_length: number;
  verify_token_set: boolean;
  app_secret_set: boolean;
  webhook_path: string;
  notes: string[];
}

function DiagnosticsPanel() {
  const { getIdToken } = useAuth();
  const [config, setConfig] = useState<ConfigCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [wamid, setWamid] = useState("");
  const [lookupResult, setLookupResult] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const token = await getIdToken();
        if (!token) throw new Error("Not authenticated");
        const res = await fetch(`${API_URL}/api/admin/whatsapp/config-check`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || "Failed to load config");
        setConfig(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    })();
  }, [getIdToken]);

  async function lookup() {
    if (!wamid.trim()) return;
    const token = await getIdToken();
    if (!token) return;
    const res = await fetch(
      `${API_URL}/api/admin/whatsapp/message?wamid=${encodeURIComponent(wamid.trim())}`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    const data = await res.json();
    setLookupResult(JSON.stringify(data, null, 2));
  }

  return (
    <div className="space-y-6">
      <section>
        <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-muted">config</h3>
        {loading && <p className="mt-2 font-mono text-[11px] text-muted">loading...</p>}
        {error && (
          <p className="mt-2 rounded-md bg-coral/10 p-2 font-mono text-[11px] text-coral">{error}</p>
        )}
        {config && (
          <ul className="mt-2 space-y-1 font-mono text-[11px] text-sand">
            <ConfigLine
              label="phone_number_id"
              ok={config.phone_number_id_set}
              value={config.phone_number_id_preview ?? "—"}
            />
            <ConfigLine
              label="access_token"
              ok={config.access_token_set}
              value={config.access_token_set ? `${config.access_token_length} chars` : "missing"}
            />
            <ConfigLine label="verify_token" ok={config.verify_token_set} value={config.verify_token_set ? "set" : "missing"} />
            <ConfigLine label="app_secret" ok={config.app_secret_set} value={config.app_secret_set ? "set" : "missing"} />
            <li className="text-muted">webhook path: {config.webhook_path}</li>
          </ul>
        )}
        {config?.notes && (
          <ul className="mt-3 space-y-1 font-mono text-[10px] text-muted">
            {config.notes.map((n) => (
              <li key={n}>• {n}</li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h3 className="font-mono text-[10px] uppercase tracking-[2px] text-muted">lookup wamid</h3>
        <p className="mt-1 font-mono text-[10px] text-muted">
          Inspect status_history for an outbound message (requires webhook to be wired up).
        </p>
        <div className="mt-2 flex gap-2">
          <input
            type="text"
            value={wamid}
            onChange={(e) => setWamid(e.target.value)}
            placeholder="wamid.HBgM..."
            className="flex-1 rounded-md border border-white/10 bg-black/30 px-3 py-1.5 font-mono text-[11px] text-sand"
          />
          <button
            onClick={lookup}
            className="rounded-md bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[2px] text-cream hover:bg-white/10"
          >
            lookup
          </button>
        </div>
        {lookupResult && (
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap rounded-md bg-black/50 p-3 font-mono text-[10px] text-sand">
{lookupResult}
          </pre>
        )}
      </section>
    </div>
  );
}

function ConfigLine({ label, ok, value }: { label: string; ok: boolean; value: string }) {
  return (
    <li>
      <span className={ok ? "text-sage" : "text-coral"}>{ok ? "✓" : "✗"}</span> {label}:{" "}
      <span className="text-cream">{value}</span>
    </li>
  );
}
