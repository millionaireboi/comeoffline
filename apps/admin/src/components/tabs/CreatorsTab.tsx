"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useApi } from "@/hooks/useApi";
import { apiClient } from "@/lib/apiClient";
import { toast } from "@/lib/toast";
import { TableRowSkeleton } from "@/components/Skeleton";
import { ImageUpload } from "@/components/ImageUpload";
import { LANDING_URL } from "@/lib/constants";

/**
 * Creator affiliate program — rates, live earnings, manual payout ledger,
 * and the /with/<handle> page config. Money math happens server-side
 * (creators.service); this tab records payouts, it never moves money.
 */

interface CreatorPayout {
  amount: number;
  date: string;
  note?: string;
  recorded_at: string;
}

interface CreatorPage {
  photo_url?: string;
  photo_caption?: string;
  hero_line?: string;
  headline?: string;
  turn?: string[];
  turn_sign?: string;
  rooms?: { title_match: string; tie: string }[];
  proof_lines?: { quote: string; by: string }[];
  objection_q?: string;
  objection_a?: string[];
  friction?: string;
  close_lede?: string;
  close?: string;
  whatsapp_prefill?: string;
}

interface CreatorEarnings {
  lifetime_seats: number;
  month_seats: number;
  activated: boolean;
  clicks: number;
  sales_earned: number;
  click_earned: number;
  earned: number;
  paid: number;
  owed: number;
  seats_by_month: Record<string, number>;
  recent_sales: { date: string; event_title: string; seats: number; via: "link" | "code"; earned: number }[];
}

interface Creator {
  handle: string;
  name: string;
  active: boolean;
  rate_per_ticket: number;
  rate_per_100_clicks?: number;
  activation_sales: number;
  discount_code: string | null;
  user_uid: string | null;
  payouts: CreatorPayout[];
  page: CreatorPage;
  page_draft?: CreatorPage | null;
  page_draft_at?: string | null;
  earnings: CreatorEarnings;
}

interface Member {
  id: string;
  name: string;
  handle: string;
  status: string;
}

interface AdminEvent {
  id: string;
  title: string;
  date?: string;
  status?: string;
}

interface CampaignFormat {
  label: string;
  ref_url: string | null;
}

interface Campaign {
  title_match: string;
  commission_per_seat: number;
  brief: string;
  formats: CampaignFormat[];
  active: boolean;
  enrollments: Record<string, { enrolled_at: string }>;
}

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[12px] text-cream placeholder:text-muted focus:border-caramel/50 focus:outline-none";
const labelClass = "mb-1 block font-mono text-[10px] uppercase tracking-[1px] text-muted";
const btnClass =
  "rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-cream disabled:opacity-40";

const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

/* Everyone writes plain text — the page auto-highlights the last note line.
   Older saved lines may still carry <em>/<strong>; strip for display/edit. */
const stripTags = (line: string) => line.replace(/<\/?(em|strong)>/g, "");

const normTitle = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/** One event's campaign editor — commission + brief + formats + enrollments. */
function CampaignEditor({
  title,
  campaign,
  defaultOpen,
  onSaved,
}: {
  title: string; // display title; normalized form is the campaign key
  campaign: Campaign | null;
  defaultOpen?: boolean;
  onSaved: () => void;
}) {
  const [open, setOpen] = useState(!!defaultOpen);
  const [rate, setRate] = useState(campaign ? String(campaign.commission_per_seat) : "");
  const [brief, setBrief] = useState(campaign?.brief ?? "");
  const [formats, setFormats] = useState<{ label: string; ref_url: string }[]>(
    (campaign?.formats ?? []).length > 0
      ? (campaign?.formats ?? []).map((f) => ({ label: f.label, ref_url: f.ref_url ?? "" }))
      : [{ label: "", ref_url: "" }]
  );
  const [saving, setSaving] = useState(false);

  const setFormat = (i: number, patch: Partial<{ label: string; ref_url: string }>) =>
    setFormats((prev) => prev.map((f, n) => (n === i ? { ...f, ...patch } : f)));

  const enrolled = Object.keys(campaign?.enrollments ?? {});

  const save = async (active?: boolean) => {
    const r = Number(rate);
    if (!(r >= 0)) {
      toast.error("set a commission (₹ per seat)");
      return;
    }
    setSaving(true);
    try {
      await apiClient.put("/api/admin/creators/campaigns", {
        title_match: title,
        commission_per_seat: r,
        brief: brief.trim(),
        formats: formats
          .map((f) => ({ label: f.label.trim(), ref_url: f.ref_url.trim() || null }))
          .filter((f) => f.label),
        ...(active !== undefined && { active }),
      });
      toast.success(`campaign for "${title}" saved`);
      onSaved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to save campaign");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between text-left">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[13px] text-cream">{title}</span>
          {campaign ? (
            <>
              <span className="rounded-full bg-caramel/10 px-2.5 py-0.5 font-mono text-[10px] text-caramel">
                {rupees(campaign.commission_per_seat)}/seat
              </span>
              {!campaign.active && (
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[9px] uppercase text-muted">paused</span>
              )}
              {enrolled.length > 0 && (
                <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[9px] text-muted">
                  {enrolled.length} enrolled
                </span>
              )}
            </>
          ) : (
            <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[9px] uppercase text-muted">
              no campaign — creators earn their default rate
            </span>
          )}
        </div>
        <span className="font-mono text-[10px] text-muted">{open ? "close" : campaign ? "edit" : "set up"}</span>
      </button>

      {open && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className={labelClass}>commission for this event (₹ per seat — every creator's sales)</label>
              <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} placeholder="250" className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>content formats wanted — with an optional reference link each</label>
              <div className="space-y-2">
                {formats.map((f, i) => (
                  <div key={i} className="flex flex-col gap-2 sm:flex-row">
                    <input
                      type="text"
                      value={f.label}
                      onChange={(e) => setFormat(i, { label: e.target.value })}
                      placeholder="1 reel (30-60s, you at the event)"
                      className={inputClass}
                    />
                    <input
                      type="text"
                      value={f.ref_url}
                      onChange={(e) => setFormat(i, { ref_url: e.target.value })}
                      placeholder="reference link (optional) — https://instagram.com/reel/…"
                      className={inputClass}
                    />
                    {formats.length > 1 && (
                      <button
                        onClick={() => setFormats((prev) => prev.filter((_, n) => n !== i))}
                        className="shrink-0 rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] text-muted hover:text-[#B85C4A]"
                        title="remove format"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
                <button
                  onClick={() => setFormats((prev) => [...prev, { label: "", ref_url: "" }])}
                  className={btnClass}
                >
                  + add format
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>the brief — what you want creators to make</label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={3}
                placeholder="show the real thing — you walking in solo, the games table, the jam corner. no salesy voiceovers; talk like you're telling a friend."
                className={inputClass}
              />
            </div>
          </div>
          {enrolled.length > 0 && (
            <p className="font-mono text-[10px] text-muted">
              enrolled: <span className="text-cream">{enrolled.join(", ")}</span>
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => save()}
              disabled={saving}
              className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
            >
              {saving ? "saving…" : campaign ? "save campaign" : "launch campaign"}
            </button>
            {campaign && (
              <button onClick={() => save(!campaign.active)} disabled={saving} className={btnClass}>
                {campaign.active ? "pause" : "resume"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/** Search-select over members — replaces raw uid entry. */
function MemberPicker({
  members,
  onPick,
  placeholder = "search members by name…",
}: {
  members: Member[] | null | undefined;
  onPick: (m: Member) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    if (!members || query.trim().length < 2) return [];
    const q = query.trim().toLowerCase();
    return members.filter((m) => m.name?.toLowerCase().includes(q) || m.handle?.toLowerCase().includes(q)).slice(0, 6);
  }, [members, query]);

  return (
    <div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={members ? placeholder : "loading members…"}
        className={inputClass}
      />
      {matches.length > 0 && (
        <div className="mt-1 overflow-hidden rounded-lg border border-white/10">
          {matches.map((m) => (
            <button
              key={m.id}
              onClick={() => {
                onPick(m);
                setQuery("");
              }}
              className="block w-full bg-white/5 px-3 py-2 text-left font-mono text-[11px] text-cream transition-colors hover:bg-white/10"
            >
              {m.name} <span className="text-muted">@{m.handle}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Edit a creator's money knobs after onboarding. */
function RatesPanel({ creator, onDone }: { creator: Creator; onDone: () => void }) {
  const [rate, setRate] = useState(String(creator.rate_per_ticket));
  const [clickRate, setClickRate] = useState(String(creator.rate_per_100_clicks ?? 0));
  const [activation, setActivation] = useState(String(creator.activation_sales));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await apiClient.put(`/api/admin/creators/${creator.handle}`, {
        rate_per_ticket: Number(rate) >= 0 ? Number(rate) : undefined,
        rate_per_100_clicks: Number(clickRate) >= 0 ? Number(clickRate) : undefined,
        activation_sales: Number(activation) >= 0 ? Number(activation) : undefined,
      });
      toast.success(`${creator.handle}'s rates updated`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to save rates");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className={labelClass}>default commission (₹/seat)</label>
          <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>₹ per 100 link clicks (0 = off)</label>
          <input type="number" value={clickRate} onChange={(e) => setClickRate(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>activation (sales)</label>
          <input type="number" value={activation} onChange={(e) => setActivation(e.target.value)} className={inputClass} />
        </div>
      </div>
      <p className="font-mono text-[9px] text-muted">
        clicks count from their /l/ links pointing at /with/{creator.handle} · paid per completed 100 · unlocks with the
        same activation, retroactively
      </p>
      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {saving ? "saving…" : "save rates"}
      </button>
    </div>
  );
}

/** Creator-submitted page draft — publish copies it onto the live page. */
function DraftPanel({ creator, onDone }: { creator: Creator; onDone: () => void }) {
  const { isAdmin } = useAuth();
  const draft = creator.page_draft;
  const [acting, setActing] = useState(false);
  if (!draft) return null;

  const act = async (action: "publish" | "discard") => {
    setActing(true);
    try {
      if (action === "publish") {
        await apiClient.post(`/api/admin/creators/${creator.handle}/draft/publish`, {});
        toast.success(`${creator.handle}'s page is live`);
      } else {
        await apiClient.delete(`/api/admin/creators/${creator.handle}/draft`);
        toast.success("draft discarded");
      }
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : `${action} failed`);
    } finally {
      setActing(false);
    }
  };

  const row = (label: string, value?: string | null) =>
    value ? (
      <div>
        <p className={labelClass}>{label}</p>
        <p className="font-mono text-[11px] text-cream">{stripTags(value)}</p>
      </div>
    ) : null;

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-caramel/20 bg-caramel/5 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[1px] text-caramel">
        draft from {creator.name}
        {creator.page_draft_at &&
          ` · ${new Date(creator.page_draft_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}`}
      </p>
      {draft.photo_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={draft.photo_url} alt="draft polaroid" className="h-28 w-28 rounded-lg object-cover" />
      )}
      {row("photo caption", draft.photo_caption)}
      {row("hero line", draft.hero_line)}
      {draft.turn && draft.turn.length > 0 && (
        <div>
          <p className={labelClass}>the turn</p>
          {draft.turn.map((l, i) => (
            <p key={i} className="font-mono text-[11px] text-cream">
              {stripTags(l)}
            </p>
          ))}
        </div>
      )}
      {draft.rooms && draft.rooms.length > 0 && (
        <div>
          <p className={labelClass}>rooms</p>
          {draft.rooms.map((r) => (
            <p key={r.title_match} className="font-mono text-[11px] text-cream">
              {r.title_match} <span className="text-muted">— {stripTags(r.tie)}</span>
            </p>
          ))}
        </div>
      )}
      {isAdmin ? (
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => act("publish")}
            disabled={acting}
            className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            publish to /with/{creator.handle}
          </button>
          <button onClick={() => act("discard")} disabled={acting} className={btnClass}>
            discard
          </button>
        </div>
      ) : (
        <p className="pt-1 font-mono text-[10px] text-muted">the founder reviews and publishes drafts</p>
      )}
    </div>
  );
}

/** Record-a-payout inline form — logs a UPI payment already made by hand. */
function PayoutPanel({ creator, onDone }: { creator: Creator; onDone: () => void }) {
  const [amount, setAmount] = useState(creator.earnings.owed > 0 ? String(creator.earnings.owed) : "");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const amt = Number(amount);
    if (!(amt > 0)) {
      toast.error("amount must be > 0");
      return;
    }
    setSaving(true);
    try {
      await apiClient.post(`/api/admin/creators/${creator.handle}/payouts`, { amount: amt, note: note.trim() });
      toast.success(`recorded ${rupees(amt)} to ${creator.handle}`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to record payout");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[1px] text-muted">
        record a payout — you already sent this by upi; this only writes it in the ledger
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className={labelClass}>amount (₹)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>note (optional)</label>
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="july settlement · upi ref …"
            className={inputClass}
          />
        </div>
      </div>
      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {saving ? "recording…" : "record payout"}
      </button>
      {creator.payouts.length > 0 && (
        <div className="space-y-1 pt-2">
          <p className={labelClass}>ledger</p>
          {creator.payouts.map((p) => (
            <p key={p.recorded_at} className="font-mono text-[10px] text-muted">
              {p.date} · <span className="text-cream">{rupees(p.amount)}</span>
              {p.note && ` · ${p.note}`}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/** /with/<handle> page config — every field optional; blank = template default. */
function PagePanel({ creator, events, onDone }: { creator: Creator; events: AdminEvent[] | null | undefined; onDone: () => void }) {
  const page = creator.page ?? {};
  const [photoUrl, setPhotoUrl] = useState(page.photo_url ?? "");
  const [photoCaption, setPhotoCaption] = useState(page.photo_caption ?? "");
  const [heroLine, setHeroLine] = useState(page.hero_line ?? "");
  const [turn, setTurn] = useState((page.turn ?? []).map(stripTags).join("\n"));
  const [saving, setSaving] = useState(false);

  // Rooms picker: one row per upcoming event series (unique normalized title),
  // pre-checked from the saved config. Saved matches that no longer have an
  // upcoming event stay listed so they aren't silently dropped.
  const upcomingTitles = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const seen = new Map<string, string>(); // norm → display title
    for (const e of events ?? []) {
      if (!e.title) continue;
      if (e.date && e.date < today) continue;
      if (e.status && ["draft", "cancelled", "completed"].includes(e.status)) continue;
      const norm = normTitle(e.title);
      if (!seen.has(norm)) seen.set(norm, e.title);
    }
    return seen;
  }, [events]);

  const [rooms, setRooms] = useState<Map<string, string>>(
    () => new Map((page.rooms ?? []).map((r) => [normTitle(r.title_match), r.tie]))
  );

  const toggleRoom = (norm: string) => {
    setRooms((prev) => {
      const next = new Map(prev);
      if (next.has(norm)) next.delete(norm);
      else next.set(norm, "i’ll be at this one.");
      return next;
    });
  };
  const setTie = (norm: string, tie: string) => {
    setRooms((prev) => new Map(prev).set(norm, tie));
  };

  const staleRooms = [...rooms.keys()].filter((norm) => !upcomingTitles.has(norm));

  const save = async () => {
    setSaving(true);
    try {
      const newPage: CreatorPage = {
        ...page,
        photo_url: photoUrl.trim() || undefined,
        photo_caption: photoCaption.trim() || undefined,
        hero_line: heroLine.trim() || undefined,
        turn: turn
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean),
        rooms: [...rooms.entries()].map(([title_match, tie]) => ({ title_match, tie: tie.trim() || "i’ll be at this one." })),
      };
      await apiClient.put(`/api/admin/creators/${creator.handle}`, { page: newPage });
      toast.success(`${LANDING_URL}/with/${creator.handle} updated`);
      onDone();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to save page");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mt-4 space-y-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
      <p className="font-mono text-[10px] uppercase tracking-[1px] text-muted">
        their landing page — {LANDING_URL}/with/{creator.handle} · blank fields fall back to the shared template
      </p>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>their polaroid (shot at an event, not a headshot)</label>
          <ImageUpload
            value={photoUrl}
            onChange={setPhotoUrl}
            pathPrefix="creators"
            label="upload their photo"
          />
        </div>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>photo caption</label>
            <input
              type="text"
              value={photoCaption}
              onChange={(e) => setPhotoCaption(e.target.value)}
              placeholder="me, losing at codenames. last house."
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>hero line (their first words, first person)</label>
            <input
              type="text"
              value={heroLine}
              onChange={(e) => setHeroLine(e.target.value)}
              placeholder="i’m inviting you."
              className={inputClass}
            />
          </div>
        </div>
        <div className="sm:col-span-2">
          <label className={labelClass}>the turn — their voice, one line per line</label>
          <textarea
            value={turn}
            onChange={(e) => setTurn(e.target.value)}
            rows={4}
            placeholder={"you know my coffee order from a story.\ni’m done doing this over dms. so i’m doing this instead."}
            className={inputClass}
          />
          <p className="mt-1 font-mono text-[9px] text-muted">the last line auto-highlights on the page — make it the punchy one</p>
        </div>

        <div className="sm:col-span-2">
          <label className={labelClass}>the rooms they’ll be in — pick from upcoming events</label>
          {upcomingTitles.size === 0 && staleRooms.length === 0 ? (
            <p className="font-mono text-[10px] text-muted">no upcoming events — create the event first, then tie them to it here</p>
          ) : (
            <div className="space-y-2">
              {[...upcomingTitles.entries()].map(([norm, title]) => {
                const checked = rooms.has(norm);
                return (
                  <div key={norm} className="rounded-lg border border-white/10 bg-white/5 p-3">
                    <label className="flex cursor-pointer items-center gap-2.5">
                      <input type="checkbox" checked={checked} onChange={() => toggleRoom(norm)} className="accent-[#D4A574]" />
                      <span className="font-mono text-[12px] text-cream">{title}</span>
                    </label>
                    {checked && (
                      <input
                        type="text"
                        value={rooms.get(norm) ?? ""}
                        onChange={(e) => setTie(norm, e.target.value)}
                        placeholder="i’ll be at this one."
                        className={`${inputClass} mt-2`}
                      />
                    )}
                  </div>
                );
              })}
              {staleRooms.map((norm) => (
                <div key={norm} className="rounded-lg border border-white/10 bg-white/5 p-3">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked onChange={() => toggleRoom(norm)} className="accent-[#D4A574]" />
                    <span className="font-mono text-[12px] text-muted">
                      {norm} <span className="text-muted/60">· no upcoming event matches</span>
                    </span>
                  </label>
                </div>
              ))}
              <p className="font-mono text-[9px] text-muted">
                the scribble under each tick is the creator’s tie — shown above that event’s card on their page
              </p>
            </div>
          )}
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
      >
        {saving ? "saving…" : "save page"}
      </button>
    </div>
  );
}

export function CreatorsTab() {
  const { data: creators, loading, refetch } = useApi<Creator[]>("/api/admin/creators", {
    dedupingInterval: 30 * 1000,
  });
  const { isAdmin } = useAuth();
  // Minimal uid/name/handle list — works for creator_ops without member PII
  const { data: members } = useApi<Member[]>("/api/admin/creators/member-options", { dedupingInterval: 60 * 1000 });
  const { data: events } = useApi<AdminEvent[]>("/api/admin/events", { dedupingInterval: 60 * 1000 });
  const { data: campaigns, refetch: refetchCampaigns } = useApi<Campaign[]>("/api/admin/creators/campaigns", {
    dedupingInterval: 30 * 1000,
  });

  // One campaign slot per unique upcoming event title (series = one slot)
  const campaignSlots = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10);
    const seen = new Map<string, string>();
    for (const e of events ?? []) {
      if (!e.title) continue;
      if (e.date && e.date < today) continue;
      if (e.status && ["draft", "cancelled", "completed"].includes(e.status)) continue;
      const norm = normTitle(e.title);
      if (!seen.has(norm)) seen.set(norm, e.title);
    }
    const byMatch = new Map((campaigns ?? []).map((c) => [c.title_match, c]));
    const slots = [...seen.entries()].map(([norm, title]) => ({ norm, title, campaign: byMatch.get(norm) ?? null }));
    // Campaigns whose event has passed stay visible so they can be paused/reviewed
    for (const c of campaigns ?? []) {
      if (!seen.has(c.title_match)) slots.push({ norm: c.title_match, title: c.title_match, campaign: c });
    }
    return slots;
  }, [events, campaigns]);

  const [showForm, setShowForm] = useState(false);
  const [handle, setHandle] = useState("");
  const [name, setName] = useState("");
  const [rate, setRate] = useState("150");
  const [clickRate, setClickRate] = useState("0");
  const [activation, setActivation] = useState("10");
  const [linkedMember, setLinkedMember] = useState<Member | null>(null);
  const [creating, setCreating] = useState(false);

  const [openPanel, setOpenPanel] = useState<string | null>(null); // "<handle>:payout" | "<handle>:page" | "<handle>:member"
  const [actioning, setActioning] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const resetForm = () => {
    setHandle("");
    setName("");
    setRate("150");
    setClickRate("0");
    setActivation("10");
    setLinkedMember(null);
  };

  const handleCreate = async () => {
    if (!handle.trim() || !(Number(rate) >= 0)) {
      toast.error("handle and rate are required");
      return;
    }
    setCreating(true);
    try {
      await apiClient.post("/api/admin/creators", {
        handle: handle.trim(),
        name: name.trim() || handle.trim(),
        rate_per_ticket: Number(rate),
        rate_per_100_clicks: Number(clickRate) >= 0 ? Number(clickRate) : 0,
        activation_sales: Number(activation) >= 0 ? Number(activation) : 10,
        user_uid: linkedMember?.id || undefined,
      });
      toast.success(`creator ${handle.trim()} onboarded — now mint /l/${handle.trim()} and code ${handle.trim().toUpperCase()}`);
      resetForm();
      setShowForm(false);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "failed to create creator");
    } finally {
      setCreating(false);
    }
  };

  const handleLinkMember = async (c: Creator, m: Member) => {
    setActioning(c.handle);
    try {
      await apiClient.put(`/api/admin/creators/${c.handle}`, { user_uid: m.id });
      toast.success(`${c.handle} linked to ${m.name} — creator studio unlocked`);
      setOpenPanel(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "link failed");
    } finally {
      setActioning(null);
    }
  };

  const handleToggleActive = async (c: Creator) => {
    setActioning(c.handle);
    try {
      await apiClient.put(`/api/admin/creators/${c.handle}`, { active: !c.active });
      toast.success(`${c.handle} ${c.active ? "paused" : "activated"}`);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "update failed");
    } finally {
      setActioning(null);
    }
  };

  const handleDelete = async (c: Creator) => {
    setActioning(c.handle);
    try {
      await apiClient.delete(`/api/admin/creators/${c.handle}`);
      toast.success(`${c.handle} deleted`);
      setConfirmDelete(null);
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "delete failed");
    } finally {
      setActioning(null);
    }
  };

  return (
    <div className="w-full space-y-6 sm:max-w-3xl">
      <div className="flex items-center justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[1px] text-muted">
          creators {creators ? `· ${creators.length}` : ""}
        </p>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="rounded-lg bg-caramel px-4 py-2 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80"
        >
          {showForm ? "cancel" : "+ onboard creator"}
        </button>
      </div>

      {showForm && (
        <div className="space-y-4 rounded-xl border border-white/5 bg-white/[0.02] p-5">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={labelClass}>handle</label>
              <input
                type="text"
                value={handle}
                onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ""))}
                placeholder="asha"
                maxLength={32}
                className={inputClass}
              />
              {handle && (
                <p className="mt-1 font-mono text-[9px] text-muted">
                  → {LANDING_URL}/with/{handle} · code {handle.toUpperCase()}
                </p>
              )}
            </div>
            <div>
              <label className={labelClass}>name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="asha" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>commission (₹ per confirmed seat)</label>
              <input type="number" value={rate} onChange={(e) => setRate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>₹ per 100 link clicks (0 = off)</label>
              <input type="number" value={clickRate} onChange={(e) => setClickRate(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>activation (sales before payouts unlock, retroactive)</label>
              <input type="number" value={activation} onChange={(e) => setActivation(e.target.value)} className={inputClass} />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass}>their member account (optional — unlocks creator studio in the app)</label>
              {linkedMember ? (
                <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                  <span className="font-mono text-[12px] text-cream">
                    {linkedMember.name} <span className="text-muted">@{linkedMember.handle}</span>
                  </span>
                  <button onClick={() => setLinkedMember(null)} className="font-mono text-[10px] text-muted hover:text-cream">
                    clear
                  </button>
                </div>
              ) : (
                <MemberPicker members={members} onPick={setLinkedMember} />
              )}
              <p className="mt-1 font-mono text-[9px] text-muted">can also be linked later — most creators are members already</p>
            </div>
          </div>
          <button
            onClick={handleCreate}
            disabled={creating || !handle.trim()}
            className="rounded-lg bg-caramel px-5 py-2.5 font-mono text-[11px] font-medium uppercase tracking-[1px] text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
          >
            {creating ? "onboarding…" : "onboard creator"}
          </button>
          <p className="font-mono text-[9px] text-muted">
            after onboarding: mint their /l/ link (links tab → /with/{handle || "<handle>"}) and their discount code (discounts tab).
          </p>
        </div>
      )}

      {/* Payout overview — totals across every creator, computed live */}
      {creators && creators.length > 0 && (
        <div className="flex flex-wrap gap-x-6 gap-y-1 rounded-xl border border-white/5 bg-white/[0.02] px-5 py-3 font-mono text-[11px]">
          <span className="text-muted">
            total earned <span className="text-cream">{rupees(creators.reduce((s2, c) => s2 + c.earnings.earned, 0))}</span>
          </span>
          <span className="text-muted">
            paid <span className="text-cream">{rupees(creators.reduce((s2, c) => s2 + c.earnings.paid, 0))}</span>
          </span>
          <span className="text-muted">
            owed <span className="text-caramel">{rupees(creators.reduce((s2, c) => s2 + c.earnings.owed, 0))}</span>
          </span>
          <span className="text-muted">
            seats <span className="text-cream">{creators.reduce((s2, c) => s2 + c.earnings.lifetime_seats, 0)}</span>
          </span>
          <span className="text-muted">
            clicks <span className="text-cream">{creators.reduce((s2, c) => s2 + c.earnings.clicks, 0).toLocaleString("en-IN")}</span>
          </span>
        </div>
      )}

      {/* Event campaigns — per-event commission + content brief */}
      <div className="space-y-3">
        <p className="font-mono text-[11px] uppercase tracking-[1px] text-muted">
          event campaigns · per-event commission + brief, shown in every creator’s studio
        </p>
        {campaignSlots.length === 0 ? (
          <p className="font-mono text-[10px] text-muted">no upcoming events — create an event first</p>
        ) : (
          campaignSlots.map((slot) => (
            <CampaignEditor
              key={slot.norm}
              title={slot.title}
              campaign={slot.campaign}
              onSaved={refetchCampaigns}
            />
          ))
        )}
      </div>

      {loading ? (
        <div className="space-y-1">{Array.from({ length: 3 }).map((_, i) => <TableRowSkeleton key={i} columns={5} />)}</div>
      ) : !creators || creators.length === 0 ? (
        <p className="py-8 text-center font-mono text-sm text-muted">
          no creators yet — onboard one, mint their link + code, and sales attribute here automatically
        </p>
      ) : (
        <div className="space-y-3">
          {creators.map((c) => {
            const e = c.earnings;
            return (
              <div key={c.handle} className="rounded-xl border border-white/5 bg-white/[0.02] p-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-[15px] font-medium tracking-[1px] text-cream">/with/{c.handle}</span>
                      {c.discount_code && (
                        <span className="rounded-full bg-caramel/10 px-2.5 py-0.5 font-mono text-[10px] text-caramel">
                          {c.discount_code}
                        </span>
                      )}
                      <span
                        className="rounded-full px-2.5 py-0.5 font-mono text-[9px] uppercase"
                        style={c.active ? { color: "#A8B5A0", background: "#A8B5A015" } : { color: "#9B8E82", background: "#9B8E8215" }}
                      >
                        {c.active ? "active" : "paused"}
                      </span>
                      {!e.activated && (
                        <span className="rounded-full bg-white/5 px-2.5 py-0.5 font-mono text-[9px] uppercase text-muted">
                          {e.lifetime_seats}/{c.activation_sales} to activate
                        </span>
                      )}
                      {c.page_draft && (
                        <span className="rounded-full bg-caramel/15 px-2.5 py-0.5 font-mono text-[9px] uppercase text-caramel">
                          draft pending
                        </span>
                      )}
                    </div>
                    <p className="mt-1.5 font-mono text-[10px] text-muted">
                      {rupees(c.rate_per_ticket)}/seat
                      {(c.rate_per_100_clicks ?? 0) > 0 && ` · ${rupees(c.rate_per_100_clicks!)}/100 clicks`} ·{" "}
                      <span className="text-cream">{e.month_seats}</span> this month ·{" "}
                      <span className="text-cream">{e.lifetime_seats}</span> lifetime ·{" "}
                      <span className="text-cream">{e.clicks.toLocaleString("en-IN")}</span> clicks
                      {c.user_uid ? " · studio linked ✓" : ""}
                    </p>
                    <p className="mt-0.5 font-mono text-[11px]">
                      <span className="text-muted">earned </span>
                      <span className="text-cream">{rupees(e.earned)}</span>
                      {e.click_earned > 0 && (
                        <span className="text-muted">
                          {" "}
                          ({rupees(e.sales_earned)} sales + {rupees(e.click_earned)} clicks)
                        </span>
                      )}
                      <span className="text-muted"> · paid </span>
                      <span className="text-cream">{rupees(e.paid)}</span>
                      <span className="text-muted"> · owed </span>
                      <span className={e.owed > 0 ? "text-caramel" : "text-cream"}>{rupees(e.owed)}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => setOpenPanel(openPanel === `${c.handle}:payout` ? null : `${c.handle}:payout`)}
                        className={btnClass}
                      >
                        {openPanel === `${c.handle}:payout` ? "close" : "payouts"}
                      </button>
                    )}
                    <button
                      onClick={() => setOpenPanel(openPanel === `${c.handle}:rates` ? null : `${c.handle}:rates`)}
                      className={btnClass}
                    >
                      {openPanel === `${c.handle}:rates` ? "close" : "rates"}
                    </button>
                    <button
                      onClick={() => setOpenPanel(openPanel === `${c.handle}:page` ? null : `${c.handle}:page`)}
                      className={btnClass}
                    >
                      {openPanel === `${c.handle}:page` ? "close" : "page"}
                    </button>
                    {c.page_draft && (
                      <button
                        onClick={() => setOpenPanel(openPanel === `${c.handle}:draft` ? null : `${c.handle}:draft`)}
                        className="rounded-lg bg-caramel/15 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-caramel transition-colors hover:bg-caramel/25"
                      >
                        {openPanel === `${c.handle}:draft` ? "close" : "review draft"}
                      </button>
                    )}
                    {!c.user_uid && (
                      <button
                        onClick={() => setOpenPanel(openPanel === `${c.handle}:member` ? null : `${c.handle}:member`)}
                        className={btnClass}
                      >
                        {openPanel === `${c.handle}:member` ? "close" : "link member"}
                      </button>
                    )}
                    <button onClick={() => handleToggleActive(c)} disabled={actioning === c.handle} className={btnClass}>
                      {c.active ? "pause" : "activate"}
                    </button>
                    {!isAdmin ? null : confirmDelete === c.handle ? (
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleDelete(c)}
                          disabled={actioning === c.handle}
                          className="rounded-lg bg-[#B85C4A] px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-white transition-opacity hover:opacity-80 disabled:opacity-40"
                        >
                          confirm
                        </button>
                        <button onClick={() => setConfirmDelete(null)} className={btnClass}>
                          keep
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(c.handle)}
                        className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[1px] text-muted transition-colors hover:bg-white/10 hover:text-[#B85C4A]"
                      >
                        delete
                      </button>
                    )}
                  </div>
                </div>

                {openPanel === `${c.handle}:rates` && (
                  <RatesPanel
                    creator={c}
                    onDone={() => {
                      setOpenPanel(null);
                      refetch();
                    }}
                  />
                )}

                {openPanel === `${c.handle}:draft` && (
                  <DraftPanel
                    creator={c}
                    onDone={() => {
                      setOpenPanel(null);
                      refetch();
                    }}
                  />
                )}

                {openPanel === `${c.handle}:member` && (
                  <div className="mt-4 rounded-lg border border-white/5 bg-white/[0.02] p-4">
                    <p className={`${labelClass} mb-2`}>
                      link their member account — the creator studio appears on their profile in the app
                    </p>
                    <MemberPicker members={members} onPick={(m) => handleLinkMember(c, m)} />
                  </div>
                )}

                {e.recent_sales.length > 0 && openPanel === `${c.handle}:payout` && (
                  <div className="mt-3 space-y-0.5">
                    <p className={labelClass}>recent sales</p>
                    {e.recent_sales.slice(0, 6).map((s2, i) => (
                      <p key={i} className="font-mono text-[10px] text-muted">
                        {s2.date} · {s2.event_title} · {s2.seats} seat{s2.seats > 1 ? "s" : ""} · via {s2.via} ·{" "}
                        <span className="text-cream">{rupees(s2.earned)}</span>
                      </p>
                    ))}
                  </div>
                )}
                {openPanel === `${c.handle}:payout` && (
                  <PayoutPanel
                    creator={c}
                    onDone={() => {
                      setOpenPanel(null);
                      refetch();
                    }}
                  />
                )}
                {openPanel === `${c.handle}:page` && (
                  <PagePanel
                    creator={c}
                    events={events}
                    onDone={() => {
                      setOpenPanel(null);
                      refetch();
                    }}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
