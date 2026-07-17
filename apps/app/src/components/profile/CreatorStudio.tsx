"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

/**
 * Creator studio — a creator's view of their own affiliate numbers, reachable
 * from the profile when their member account is linked to a creator record
 * (admin sets user_uid on the creator doc). Read-only: earnings compute
 * server-side, payouts are recorded by admin after manual UPI transfers.
 * Sales come pre-anonymized from the API — no buyer info ever reaches here.
 */

interface CreatorPage {
  photo_url?: string;
  photo_caption?: string;
  hero_line?: string;
  turn?: string[];
  rooms?: { title_match: string; tie: string }[];
}

interface CreatorMe {
  handle: string;
  name: string;
  rate_per_ticket: number;
  activation_sales: number;
  discount_code: string | null;
  payouts: { amount: number; date: string; note?: string }[];
  page: CreatorPage;
  page_draft: CreatorPage | null;
  page_draft_at: string | null;
  earnings: {
    lifetime_seats: number;
    month_seats: number;
    activated: boolean;
    earned: number;
    paid: number;
    owed: number;
    recent_sales: { date: string; event_title: string; seats: number; via: "link" | "code" }[];
  };
}

/* Creators write plain text — the page auto-highlights the last line of the
   note, so no markup ever. Older saved lines may still carry <em> tags;
   strip them for editing. */
const stripTags = (line: string) => line.replace(/<\/?(em|strong)>/g, "");

/** File → downscaled jpeg data URI, same approach as avatar upload. */
function fileToDataUri(file: File, maxWidth = 1200, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const reader = new FileReader();
    reader.onload = () => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxWidth || h > maxWidth) {
          const ratio = Math.min(maxWidth / w, maxWidth / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => reject(new Error("couldn't read image"));
      img.src = reader.result as string;
    };
    reader.onerror = () => reject(new Error("couldn't read file"));
    reader.readAsDataURL(file);
  });
}

const LANDING_URL = process.env.NEXT_PUBLIC_LANDING_URL || "https://www.comeoffline.com";
const rupees = (n: number) => `₹${n.toLocaleString("en-IN")}`;

function Tile({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]">
      <p className="font-mono text-[9px] uppercase tracking-[1.5px] text-muted">{label}</p>
      <p className={`mt-1 font-serif text-[24px] leading-none ${accent ? "text-caramel" : "text-near-black"}`}>{value}</p>
    </div>
  );
}

/** Self-serve page editor — saves as a DRAFT the team reviews before it
 *  goes live on /with/<handle>. */
function PageEditor({
  me,
  onSaved,
}: {
  me: CreatorMe;
  onSaved: () => void;
}) {
  const { getIdToken } = useAuth();
  // Edit the draft if one is pending, else start from the live page
  const source = me.page_draft ?? me.page ?? {};
  const [photoPreview, setPhotoPreview] = useState<string | null>(source.photo_url ?? null);
  const [photoData, setPhotoData] = useState<string | null>(null);
  const [caption, setCaption] = useState(source.photo_caption ?? "");
  const [heroLine, setHeroLine] = useState(source.hero_line ?? "");
  const [turn, setTurn] = useState((source.turn ?? []).map(stripTags).join("\n"));
  const [rooms, setRooms] = useState<Map<string, string>>(
    () => new Map((source.rooms ?? []).map((r) => [r.title_match, r.tie]))
  );
  const [eventTitles, setEventTitles] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch<{ success: boolean; data: { title?: string; date?: string }[] }>(
          "/api/events/public"
        );
        const today = new Date().toISOString().slice(0, 10);
        const seen = new Set<string>();
        for (const e of res.data ?? []) {
          if (!e.title) continue;
          if (e.date && e.date < today) continue;
          seen.add(e.title.trim().toLowerCase().replace(/\s+/g, " "));
        }
        setEventTitles([...seen]);
      } catch {
        // picker just shows already-saved rooms
      }
    })();
  }, []);

  const pickPhoto = async (file: File | undefined) => {
    if (!file) return;
    try {
      const uri = await fileToDataUri(file);
      setPhotoData(uri);
      setPhotoPreview(uri);
    } catch {
      /* ignore bad files */
    }
  };

  const toggleRoom = (title: string) => {
    setRooms((prev) => {
      const next = new Map(prev);
      if (next.has(title)) next.delete(title);
      else next.set(title, "i’ll be at this one.");
      return next;
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      const token = await getIdToken();
      if (!token) throw new Error("no auth");
      await apiFetch("/api/creators/me/page", {
        method: "PUT",
        token,
        body: JSON.stringify({
          ...(photoData ? { photo_data: photoData } : { keep_photo: true }),
          photo_caption: caption.trim(),
          hero_line: heroLine.trim(),
          turn: turn
            .split("\n")
            .map((l) => l.trim())
            .filter(Boolean),
          rooms: [...rooms.entries()].map(([title_match, tie]) => ({ title_match, tie })),
        }),
      });
      onSaved();
    } catch (err) {
      console.error("Failed to save page draft:", err);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    "w-full rounded-[12px] border border-near-black/10 bg-white px-3.5 py-2.5 font-sans text-[14px] text-near-black placeholder:text-muted/60 focus:border-caramel focus:outline-none";
  const labelCls = "mb-1.5 block font-mono text-[9px] uppercase tracking-[1.5px] text-muted";
  const allTitles = [...new Set([...eventTitles, ...rooms.keys()])];

  return (
    <div className="mt-2 flex flex-col gap-4 rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]">
      <div>
        <span className={labelCls}>your photo — you at an event, not a headshot</span>
        <div className="flex items-center gap-3">
          {photoPreview ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoPreview} alt="your polaroid" className="h-20 w-20 rounded-[10px] object-cover" />
          ) : (
            <div className="flex h-20 w-20 items-center justify-center rounded-[10px] bg-cream font-mono text-[9px] text-muted">
              no photo
            </div>
          )}
          <label className="cursor-pointer rounded-[10px] bg-cream px-4 py-2.5 font-mono text-[10px] uppercase tracking-[1px] text-near-black">
            {photoPreview ? "change" : "upload"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pickPhoto(e.target.files?.[0])} />
          </label>
        </div>
      </div>

      <div>
        <span className={labelCls}>photo caption</span>
        <input
          type="text"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          placeholder="me, losing at codenames. last house."
          className={inputCls}
        />
      </div>

      <div>
        <span className={labelCls}>your first words on the page</span>
        <input
          type="text"
          value={heroLine}
          onChange={(e) => setHeroLine(e.target.value)}
          placeholder="i’m inviting you."
          className={inputCls}
        />
      </div>

      <div>
        <span className={labelCls}>your note — why they should come. one line per line</span>
        <textarea
          value={turn}
          onChange={(e) => setTurn(e.target.value)}
          rows={4}
          placeholder={"you know my coffee order from a story.\ni’m done doing this over dms. so i’m doing this instead."}
          className={inputCls}
        />
        <p className="mt-1 font-mono text-[9px] text-muted">your last line gets highlighted on the page — make it the punchy one</p>
      </div>

      <div>
        <span className={labelCls}>which events will you actually be at?</span>
        {allTitles.length === 0 ? (
          <p className="font-mono text-[10px] text-muted">no upcoming events right now</p>
        ) : (
          <div className="flex flex-col gap-2">
            {allTitles.map((title) => {
              const checked = rooms.has(title);
              return (
                <div key={title} className="rounded-[12px] border border-near-black/10 p-3">
                  <label className="flex cursor-pointer items-center gap-2.5">
                    <input type="checkbox" checked={checked} onChange={() => toggleRoom(title)} className="accent-[#C4704D]" />
                    <span className="font-sans text-[14px] text-near-black">{title}</span>
                  </label>
                  {checked && (
                    <input
                      type="text"
                      value={rooms.get(title) ?? ""}
                      onChange={(e) => setRooms((prev) => new Map(prev).set(title, e.target.value))}
                      placeholder="i’ll be at this one."
                      className={`${inputCls} mt-2`}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="rounded-[12px] bg-caramel px-5 py-3 font-sans text-[14px] font-medium text-white disabled:opacity-50"
      >
        {saving ? "sending…" : "send for review"}
      </button>
      <p className="-mt-2 text-center font-mono text-[9px] text-muted">
        the team gives it a quick read before it goes live on your page
      </p>
    </div>
  );
}

export function CreatorStudio({ onClose }: { onClose: () => void }) {
  const { getIdToken, loading: authLoading } = useAuth();
  const [me, setMe] = useState<CreatorMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [editingPage, setEditingPage] = useState(false);
  const [draftSent, setDraftSent] = useState(false);

  const fetchMe = useCallback(async () => {
    setError(false);
    try {
      const token = await getIdToken();
      if (!token) {
        setError(true);
        setLoading(false);
        return;
      }
      const res = await apiFetch<{ success: boolean; data: CreatorMe }>("/api/creators/me", { token });
      if (res.data) setMe(res.data);
    } catch (err) {
      console.error("Failed to load creator studio:", err);
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [getIdToken]);

  useEffect(() => {
    if (!authLoading) fetchMe();
  }, [authLoading, fetchMe]);

  const copy = (label: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  const pageUrl = me ? `${LANDING_URL}/with/${me.handle}` : "";

  return (
    <div
      className="fixed inset-0 z-[500] overflow-y-auto bg-cream"
      style={{ paddingBottom: "calc(56px + env(safe-area-inset-bottom, 0px))" }}
    >
      <Noise />

      <div className="sticky top-0 z-10 flex items-center justify-between bg-cream/95 px-5 pb-3 pt-6 backdrop-blur-sm">
        <button onClick={onClose} className="font-mono text-[11px] text-muted">
          ← back
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">creator studio</span>
        <span className="w-10" />
      </div>

      {loading ? (
        <div className="px-5 pt-6">
          <div className="h-24 animate-pulse rounded-[14px] bg-white/60" />
        </div>
      ) : error || !me ? (
        <p className="px-5 pt-10 text-center font-mono text-[12px] text-muted">
          couldn’t load your numbers — pull down or try again in a bit
        </p>
      ) : (
        <>
          {/* Earnings */}
          <section className="animate-fadeSlideUp px-5 pt-4">
            <div className="grid grid-cols-2 gap-2">
              <Tile label="this month" value={`${me.earnings.month_seats} seats`} />
              <Tile label="lifetime" value={`${me.earnings.lifetime_seats} seats`} />
              <Tile label="earned" value={rupees(me.earnings.earned)} />
              <Tile label="owed to you" value={rupees(me.earnings.owed)} accent={me.earnings.owed > 0} />
            </div>
            {!me.earnings.activated && (
              <div className="mt-2 rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]">
                <p className="font-mono text-[10px] text-muted">
                  <span className="text-near-black">
                    {me.earnings.lifetime_seats}/{me.activation_sales}
                  </span>{" "}
                  seats to unlock payouts — once you cross, every seat from your first one pays{" "}
                  {rupees(me.rate_per_ticket)}.
                </p>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-caramel/15">
                  <div
                    className="h-full rounded-full bg-caramel transition-all"
                    style={{
                      width: `${Math.min(100, (me.earnings.lifetime_seats / Math.max(1, me.activation_sales)) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            )}
            <p className="mt-2 px-1 font-mono text-[9px] text-muted">
              {rupees(me.rate_per_ticket)} per confirmed seat · refunds don’t count · paid monthly by upi
            </p>
          </section>

          {/* Tools */}
          <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.1s" }}>
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">your tools</span>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => copy("link", pageUrl)}
                className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-sans text-[14px] font-medium text-near-black">your invite page</p>
                  <p className="truncate font-mono text-[10px] text-muted">{pageUrl.replace(/^https?:\/\//, "")}</p>
                </div>
                <span className="shrink-0 font-mono text-[10px] text-caramel">{copied === "link" ? "copied ✓" : "copy"}</span>
              </button>
              {me.discount_code && (
                <button
                  onClick={() => copy("code", me.discount_code as string)}
                  className="flex items-center justify-between gap-3 rounded-[14px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-sans text-[14px] font-medium text-near-black">your code</p>
                    <p className="font-mono text-[10px] text-muted">say it in reels — the sale counts for you</p>
                  </div>
                  <span className="shrink-0 rounded-lg bg-caramel/10 px-3 py-1.5 font-mono text-[12px] tracking-[2px] text-caramel">
                    {copied === "code" ? "copied ✓" : me.discount_code}
                  </span>
                </button>
              )}
            </div>
          </section>

          {/* Your page — self-serve, drafts reviewed before going live */}
          <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.12s" }}>
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">your page</span>
            {(draftSent || me.page_draft) && !editingPage && (
              <div className="mb-2 rounded-[14px] bg-caramel/10 p-4">
                <p className="font-mono text-[10px] text-caramel">
                  ✓ your edits are with the team — they go live after a quick read
                </p>
              </div>
            )}
            {editingPage ? (
              <PageEditor
                me={me}
                onSaved={() => {
                  setEditingPage(false);
                  setDraftSent(true);
                  fetchMe();
                }}
              />
            ) : (
              <button
                onClick={() => setEditingPage(true)}
                className="flex w-full items-center justify-between rounded-[14px] bg-white p-4 text-left shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
              >
                <div>
                  <p className="font-sans text-[14px] font-medium text-near-black">
                    {me.page?.photo_url || me.page?.turn?.length ? "edit your page" : "set up your page"}
                  </p>
                  <p className="font-mono text-[10px] text-muted">your photo, your words, your events</p>
                </div>
                <span className="font-mono text-[12px] text-caramel">→</span>
              </button>
            )}
          </section>

          {/* Recent sales — anonymized */}
          <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.15s" }}>
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">recent sales</span>
            {me.earnings.recent_sales.length === 0 ? (
              <p className="rounded-[14px] bg-white/50 p-4 text-center font-mono text-[10px] text-muted">
                nothing yet — share your page and this fills up
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {me.earnings.recent_sales.map((s, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                  >
                    <div>
                      <p className="font-sans text-[13px] font-medium text-near-black">{s.event_title}</p>
                      <p className="font-mono text-[10px] text-muted">
                        {s.date} · via your {s.via}
                      </p>
                    </div>
                    <span className="font-mono text-[11px] text-near-black">
                      {s.seats} seat{s.seats > 1 ? "s" : ""}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Payout history */}
          <section className="animate-fadeSlideUp px-5 pt-5" style={{ animationDelay: "0.2s" }}>
            <span className="mb-3 block font-mono text-[10px] uppercase tracking-[2px] text-muted">payouts</span>
            {me.payouts.length === 0 ? (
              <p className="rounded-[14px] bg-white/50 p-4 text-center font-mono text-[10px] text-muted">
                no payouts yet{me.earnings.owed > 0 ? ` — ${rupees(me.earnings.owed)} settles at month end` : ""}
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {[...me.payouts].reverse().map((p, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
                  >
                    <div>
                      <p className="font-sans text-[13px] font-medium text-near-black">{rupees(p.amount)}</p>
                      {p.note && <p className="font-mono text-[10px] text-muted">{p.note}</p>}
                    </div>
                    <span className="font-mono text-[10px] text-muted">{p.date}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
