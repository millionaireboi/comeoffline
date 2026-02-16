"use client";

import { useState } from "react";
import type { Event, Zone, PickupPoint } from "@comeoffline/types";
import { apiClient } from "@/lib/apiClient";

// ── Types ────────────────────────────────────────

interface EventFormProps {
  event?: Event;
  onSave: (event: Event) => void;
  onCancel: () => void;
  serifClassName?: string;
}

interface FormZone {
  icon: string;
  name: string;
  desc: string;
}

interface FormPickupPoint {
  name: string;
  time: string;
  capacity: string;
}

// ── Emoji Data ───────────────────────────────────

const EMOJI_GROUPS = [
  { label: "events", emojis: ["💅","📵","🤍","🎬","🍾","🎉","🔥","🎶","🎤","🕺","💃","🎨"] },
  { label: "food & drink", emojis: ["🍟","🍕","🥂","🍸","🍵","☕","🥃","🍰","🎂","🥬"] },
  { label: "vibes", emojis: ["✨","🌍","🌙","❤️","🌈","🌟","🦋","🌱","🕊️","👀"] },
  { label: "activities", emojis: ["🎲","💬","🚿","📸","🎵","🧘","🏄","🚴","🏕️","🎣"] },
];

const QUICK_EMOJIS = ["💬","💅","🥂","🍟","🎵","🎲","🕺","🚿","☕","🥃","🎶","🎤","✨","🔥","📸","🌱"];

// ── Sub-components ───────────────────────────────

function EmojiPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-left transition-colors hover:bg-white/[0.08]"
      >
        <span className="text-2xl leading-none">{value || "🎯"}</span>
        <span className="text-sm text-muted/60">
          {value ? "tap to change" : "pick an emoji"}
        </span>
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1.5 rounded-xl border border-white/10 bg-surface p-3.5 shadow-2xl">
          {EMOJI_GROUPS.map((g) => (
            <div key={g.label} className="mb-2.5 last:mb-0">
              <span className="mb-2 block font-mono text-[9px] uppercase tracking-[1px] text-muted">
                {g.label}
              </span>
              <div className="flex flex-wrap gap-1">
                {g.emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { onChange(e); setOpen(false); }}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-lg transition-colors ${
                      value === e ? "bg-caramel/20" : "hover:bg-white/5"
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EmojiPickerMini({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex h-11 w-11 items-center justify-center rounded-lg border border-white/10 bg-white/[0.04] text-xl transition-colors hover:bg-white/[0.08]"
      >
        {value}
      </button>
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 flex w-[180px] flex-wrap gap-0.5 rounded-xl border border-white/10 bg-surface p-2.5 shadow-2xl">
          {QUICK_EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => { onChange(e); setOpen(false); }}
              className={`flex h-8 w-8 items-center justify-center rounded-md text-base transition-colors ${
                value === e ? "bg-caramel/20" : "hover:bg-white/5"
              }`}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ZonesBuilder({ zones, onChange }: { zones: FormZone[]; onChange: (z: FormZone[]) => void }) {
  const add = () => onChange([...zones, { icon: "✨", name: "", desc: "" }]);
  const remove = (i: number) => onChange(zones.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof FormZone, val: string) => {
    const next = [...zones];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
          event zones
        </label>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
        >
          + add zone
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {zones.map((z, i) => (
          <div
            key={i}
            className="flex gap-2.5 rounded-xl border border-white/5 bg-white/[0.03] p-3.5"
          >
            <div className="shrink-0">
              <EmojiPickerMini value={z.icon} onChange={(v) => update(i, "icon", v)} />
            </div>
            <div className="flex flex-1 flex-col gap-2">
              <input
                type="text"
                placeholder="zone name"
                value={z.name}
                onChange={(e) => update(i, "name", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-sm font-medium text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
              <input
                type="text"
                placeholder="short description"
                value={z.desc}
                onChange={(e) => update(i, "desc", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => remove(i)}
              className="shrink-0 p-1 text-sm text-muted/40 transition-colors hover:text-muted"
            >
              ✕
            </button>
          </div>
        ))}
        {zones.length === 0 && (
          <div className="rounded-xl border-[1.5px] border-dashed border-white/10 p-6 text-center">
            <span className="mb-1.5 block text-xl">🎯</span>
            <p className="text-xs text-muted">no zones yet — add activity areas</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PickupPointsBuilder({ points, onChange }: { points: FormPickupPoint[]; onChange: (p: FormPickupPoint[]) => void }) {
  const add = () => onChange([...points, { name: "", time: "", capacity: "" }]);
  const remove = (i: number) => onChange(points.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof FormPickupPoint, val: string) => {
    const next = [...points];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
          pickup points
        </label>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
        >
          + add point
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {points.map((p, i) => (
          <div
            key={i}
            className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-caramel">pickup #{i + 1}</span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="font-mono text-[10px] text-muted/40 transition-colors hover:text-muted"
              >
                ✕ remove
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Location (e.g. Indiranagar Metro, Exit 2)"
                value={p.name}
                onChange={(e) => update(i, "name", e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  placeholder="Pickup time"
                  value={p.time}
                  onChange={(e) => update(i, "time", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                />
                <input
                  type="number"
                  placeholder="Capacity"
                  value={p.capacity}
                  onChange={(e) => update(i, "capacity", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
        {points.length === 0 && (
          <div className="rounded-xl border-[1.5px] border-dashed border-white/10 p-6 text-center">
            <span className="mb-1.5 block text-xl">🚘</span>
            <p className="mb-0.5 text-xs text-muted">no pickup points yet</p>
            <p className="font-mono text-[10px] text-muted/40">users assigned to nearest point</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main EventForm Component ─────────────────────

export function EventForm({ event, onSave, onCancel, serifClassName = "" }: EventFormProps) {
  // Form state
  const [title, setTitle] = useState(event?.title || "");
  const [tagline, setTagline] = useState(event?.tagline || "");
  const [date, setDate] = useState(event?.date || "");
  const [time, setTime] = useState(event?.time || "");
  const [totalSpots, setTotalSpots] = useState(event?.total_spots?.toString() || "");
  const [tag, setTag] = useState(event?.tag || "");
  const [emoji, setEmoji] = useState(event?.emoji || "");
  const [description, setDescription] = useState(event?.description || "");
  const [dressCode, setDressCode] = useState(event?.dress_code || "");
  const [accent, setAccent] = useState(event?.accent || "#D4A574");
  const [accentDark, setAccentDark] = useState(event?.accent_dark || "#B8845A");
  const [includes, setIncludes] = useState(event?.includes?.join("\n") || "");
  const [zones, setZones] = useState<FormZone[]>(
    event?.zones?.map((z) => ({ icon: z.icon, name: z.name, desc: z.desc })) || []
  );
  const [venueName, setVenueName] = useState(event?.venue_name || "");
  const [venueArea, setVenueArea] = useState(event?.venue_area || "");
  const [venueAddress, setVenueAddress] = useState(event?.venue_address || "");
  const [venueRevealDate, setVenueRevealDate] = useState(event?.venue_reveal_date || "");
  const [pickupPoints, setPickupPoints] = useState<FormPickupPoint[]>(
    event?.pickup_points?.map((p) => ({
      name: p.name,
      time: p.time,
      capacity: p.capacity?.toString() || "",
    })) || []
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(status: "draft" | "upcoming") {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    if (!date) {
      setError("Date is required");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      title: title.trim(),
      tagline: tagline.trim(),
      description: description.trim(),
      date,
      time: time.trim(),
      total_spots: Number(totalSpots) || 50,
      tag: tag.trim(),
      emoji: emoji || "🎯",
      accent,
      accent_dark: accentDark,
      dress_code: dressCode.trim(),
      includes: includes.split("\n").map((s) => s.trim()).filter(Boolean),
      zones: zones.map((z) => ({ icon: z.icon, name: z.name.trim(), desc: z.desc.trim() })),
      venue_name: venueName.trim(),
      venue_area: venueArea.trim(),
      venue_address: venueAddress.trim(),
      venue_reveal_date: venueRevealDate,
      pickup_points: pickupPoints.map((p) => ({
        name: p.name.trim(),
        time: p.time.trim(),
        capacity: Number(p.capacity) || 0,
      })),
      status,
    };

    try {
      if (event) {
        const res = await apiClient.put<{ success: boolean; data: Event }>(
          `/api/admin/events/${event.id}`,
          payload,
        );
        onSave(res.data);
      } else {
        const res = await apiClient.post<{ success: boolean; data: Event }>(
          "/api/admin/events",
          payload,
        );
        onSave(res.data);
      }
    } catch (err) {
      setError((err as Error).message || "Failed to save event");
    } finally {
      setSaving(false);
    }
  }

  const inputClass =
    "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-sans text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none";

  return (
    <div className="mx-auto w-full max-w-2xl">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className={`${serifClassName} text-2xl tracking-tight text-cream`}>
            {event ? `edit: ${event.title}` : "new event"}
          </h2>
          <p className="mt-1 font-mono text-[10px] text-muted">
            {event ? "modify event details" : "fill in the details below"}
          </p>
        </div>
        <span className="rounded-full bg-caramel/10 px-2.5 py-1 font-mono text-[9px] text-caramel">
          {event?.status || "draft"}
        </span>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 rounded-xl border border-terracotta/20 bg-terracotta/5 px-4 py-3 font-mono text-xs text-terracotta">
          {error}
        </div>
      )}

      {/* Form */}
      <div className="flex flex-col gap-4">
        {/* Title */}
        <div>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            title
          </label>
          <input
            type="text"
            placeholder="Event name"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            tagline
          </label>
          <input
            type="text"
            placeholder="Short italic subtitle"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Date + Time */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
              date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
              time
            </label>
            <input
              type="text"
              placeholder="8:00 PM onwards"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Capacity + Tag */}
        <div className="grid grid-cols-2 gap-2.5">
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
              capacity
            </label>
            <input
              type="number"
              placeholder="60"
              value={totalSpots}
              onChange={(e) => setTotalSpots(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
              tag
            </label>
            <input
              type="text"
              placeholder="phone-free"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        {/* Emoji Picker */}
        <div>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            event emoji
          </label>
          <EmojiPicker value={emoji} onChange={setEmoji} />
        </div>

        {/* Description */}
        <div>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            description
          </label>
          <textarea
            placeholder="Full event description..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className={`${inputClass} resize-y`}
          />
        </div>

        {/* Dress Code */}
        <div>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            dress code
          </label>
          <input
            type="text"
            placeholder="house party chic"
            value={dressCode}
            onChange={(e) => setDressCode(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Accent Colors */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            accent colors
          </label>
          <p className="mb-3 text-[11px] text-muted/60">card gradients, badges, buttons</p>
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <span className="mb-1 block font-mono text-[9px] text-muted">primary</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="h-10 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-white/10 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={accent}
                  onChange={(e) => setAccent(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream focus:border-caramel/50 focus:outline-none"
                />
              </div>
            </div>
            <div>
              <span className="mb-1 block font-mono text-[9px] text-muted">dark</span>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={accentDark}
                  onChange={(e) => setAccentDark(e.target.value)}
                  className="h-10 w-10 shrink-0 cursor-pointer appearance-none rounded-lg border border-white/10 bg-transparent p-0"
                />
                <input
                  type="text"
                  value={accentDark}
                  onChange={(e) => setAccentDark(e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream focus:border-caramel/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
          <div
            className="mt-2.5 h-1.5 rounded-full"
            style={{ background: `linear-gradient(90deg, ${accent}, ${accentDark})` }}
          />
        </div>

        {/* What's Included */}
        <div>
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            what&apos;s included
          </label>
          <textarea
            placeholder={"pickup & drop from metro\nunlimited food & drinks\nnail bar + pampering zone\npolaroid wall"}
            value={includes}
            onChange={(e) => setIncludes(e.target.value)}
            rows={4}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          <p className="mt-1.5 font-mono text-[10px] text-muted/40">one item per line</p>
        </div>

        {/* Zones Builder */}
        <ZonesBuilder zones={zones} onChange={setZones} />

        {/* Venue Details */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            venue details
          </label>
          <p className="mb-3 text-[11px] text-muted/60">hidden until reveal date</p>
          <div className="flex flex-col gap-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <span className="mb-1 block font-mono text-[9px] text-muted">venue name</span>
                <input
                  type="text"
                  placeholder="The Courtyard"
                  value={venueName}
                  onChange={(e) => setVenueName(e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <span className="mb-1 block font-mono text-[9px] text-muted">area</span>
                <input
                  type="text"
                  placeholder="Indiranagar, Bangalore"
                  value={venueArea}
                  onChange={(e) => setVenueArea(e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <span className="mb-1 block font-mono text-[9px] text-muted">full address</span>
              <input
                type="text"
                placeholder="123, 12th Main, Indiranagar"
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <span className="mb-1 block font-mono text-[9px] text-muted">venue reveal date</span>
              <input
                type="date"
                value={venueRevealDate}
                onChange={(e) => setVenueRevealDate(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
        </div>

        {/* Pickup Points Builder */}
        <PickupPointsBuilder points={pickupPoints} onChange={setPickupPoints} />

        {/* Action Buttons */}
        <div className="flex gap-2.5 pt-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="flex-1 rounded-xl bg-white/5 py-3 font-mono text-[11px] uppercase tracking-[2px] text-muted transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            cancel
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("draft")}
            disabled={saving}
            className="flex-1 rounded-xl bg-white/5 py-3 font-mono text-[11px] uppercase tracking-[2px] text-cream transition-colors hover:bg-white/10 disabled:opacity-50"
          >
            {saving ? "saving..." : "draft"}
          </button>
          <button
            type="button"
            onClick={() => handleSubmit("upcoming")}
            disabled={saving}
            className="flex-1 rounded-xl bg-caramel py-3 font-mono text-[11px] uppercase tracking-[2px] text-gate-black transition-colors hover:bg-caramel/90 disabled:opacity-50"
          >
            {saving ? "saving..." : "publish"}
          </button>
        </div>
      </div>
    </div>
  );
}
