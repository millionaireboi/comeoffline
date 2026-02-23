"use client";

import { useState } from "react";
import type { Event, Zone, PickupPoint, TicketTier, TicketingConfig, PostBookingContent, PostBookingSection, CheckoutStep, CheckoutAddOn, SeatingMode, SeatingSection, SeatRow, Spot, AddonSeatingConfig } from "@comeoffline/types";
import { apiClient } from "@/lib/apiClient";
import { EventPreview } from "@/components/EventPreview";
import { ImageUpload } from "@/components/ImageUpload";

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

interface FormTier {
  id: string;
  name: string;
  label: string;
  price: string;
  capacity: string;
  deadline: string;
  opens_at: string;
  description: string;
  per_person: string;
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

function TierBuilder({ tiers, onChange }: { tiers: FormTier[]; onChange: (t: FormTier[]) => void }) {
  const add = () => {
    const idx = tiers.length;
    const defaults: Record<number, { name: string; label: string; desc: string }> = {
      0: { name: "early_bird", label: "Early Bird", desc: "for the ones who don't hesitate" },
      1: { name: "regular", label: "Regular", desc: "standard entry" },
      2: { name: "last_call", label: "Last Call", desc: "final chance to get in" },
    };
    const d = defaults[idx] || { name: `tier_${idx + 1}`, label: `Tier ${idx + 1}`, desc: "" };
    onChange([...tiers, {
      id: `tier_${Date.now()}`,
      name: d.name,
      label: d.label,
      price: "",
      capacity: "",
      deadline: "",
      opens_at: "",
      description: d.desc,
      per_person: "1",
    }]);
  };
  const remove = (i: number) => onChange(tiers.filter((_, idx) => idx !== i));
  const update = (i: number, field: keyof FormTier, val: string) => {
    const next = [...tiers];
    next[i] = { ...next[i], [field]: val };
    onChange(next);
  };

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
          ticket tiers
        </label>
        <button
          type="button"
          onClick={add}
          className="rounded-lg bg-white/5 px-3 py-1.5 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
        >
          + add tier
        </button>
      </div>
      <div className="flex flex-col gap-2.5">
        {tiers.map((t, i) => (
          <div
            key={t.id}
            className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5"
          >
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-caramel">
                phase {i + 1}
              </span>
              <button
                type="button"
                onClick={() => remove(i)}
                className="font-mono text-[10px] text-muted/40 transition-colors hover:text-muted"
              >
                remove
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">internal name</span>
                  <input
                    type="text"
                    placeholder="early_bird"
                    value={t.name}
                    onChange={(e) => update(i, "name", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">display label</span>
                  <input
                    type="text"
                    placeholder="Early Bird"
                    value={t.label}
                    onChange={(e) => update(i, "label", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">price (paise)</span>
                  <input
                    type="number"
                    placeholder="0"
                    value={t.price}
                    onChange={(e) => update(i, "price", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">capacity</span>
                  <input
                    type="number"
                    placeholder="20"
                    value={t.capacity}
                    onChange={(e) => update(i, "capacity", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">per person</span>
                  <input
                    type="number"
                    placeholder="1"
                    value={t.per_person}
                    onChange={(e) => update(i, "per_person", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">opens at</span>
                  <input
                    type="datetime-local"
                    value={t.opens_at}
                    onChange={(e) => update(i, "opens_at", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream focus:border-caramel/50 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">deadline</span>
                  <input
                    type="datetime-local"
                    value={t.deadline}
                    onChange={(e) => update(i, "deadline", e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream focus:border-caramel/50 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <span className="mb-1 block font-mono text-[9px] text-muted">description</span>
                <input
                  type="text"
                  placeholder="for the ones who don't hesitate"
                  value={t.description}
                  onChange={(e) => update(i, "description", e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                />
              </div>
            </div>
          </div>
        ))}
        {tiers.length === 0 && (
          <div className="rounded-xl border-[1.5px] border-dashed border-white/10 p-6 text-center">
            <p className="text-xs text-muted">no tiers — event will be free RSVP only</p>
            <p className="mt-1 font-mono text-[10px] text-muted/40">add tiers to enable paid ticketing</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CheckoutStepBuilder({ steps, onChange, eventSpots }: { steps: CheckoutStep[]; onChange: (s: CheckoutStep[]) => void; eventSpots?: FormSpot[] }) {
  const addStep = (type: CheckoutStep["type"]) => {
    const id = `step_${Date.now()}`;
    const defaults: Record<string, { title: string }> = {
      addon_select: { title: "Choose Add-ons" },
      info: { title: "Important Info" },
      pickup_select: { title: "Select Pickup Point" },
      seat_select: { title: "Choose Your Seat" },
    };
    const d = defaults[type] || { title: "Step" };
    const step: CheckoutStep = {
      id,
      title: d.title,
      type,
      ...(type === "addon_select" ? { add_ons: [] } : {}),
    };
    onChange([...steps, step]);
  };

  const removeStep = (i: number) => onChange(steps.filter((_, idx) => idx !== i));

  const updateStep = (i: number, updates: Partial<CheckoutStep>) => {
    const next = [...steps];
    next[i] = { ...next[i], ...updates };
    onChange(next);
  };

  const addAddon = (stepIdx: number) => {
    const step = steps[stepIdx];
    const addon: CheckoutAddOn = {
      id: `addon_${Date.now()}`,
      name: "",
      description: "",
      price: 0,
      max_quantity: 1,
      available: 100,
      required: false,
    };
    updateStep(stepIdx, { add_ons: [...(step.add_ons || []), addon] });
  };

  const updateAddon = (stepIdx: number, addonIdx: number, updates: Partial<CheckoutAddOn>) => {
    const step = steps[stepIdx];
    const addons = [...(step.add_ons || [])];
    addons[addonIdx] = { ...addons[addonIdx], ...updates };
    updateStep(stepIdx, { add_ons: addons });
  };

  const removeAddon = (stepIdx: number, addonIdx: number) => {
    const step = steps[stepIdx];
    updateStep(stepIdx, { add_ons: (step.add_ons || []).filter((_, j) => j !== addonIdx) });
  };

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none";

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
          checkout steps
        </label>
        <div className="flex gap-1">
          {(["addon_select", "info", "pickup_select", "seat_select"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addStep(type)}
              className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[9px] text-cream transition-colors hover:bg-white/10"
            >
              + {type.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {steps.map((step, i) => (
          <div key={step.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-caramel">
                step {i + 1} — {step.type.replace(/_/g, " ")}
              </span>
              <button
                type="button"
                onClick={() => removeStep(i)}
                className="font-mono text-[10px] text-muted/40 transition-colors hover:text-muted"
              >
                remove
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Step title"
                value={step.title}
                onChange={(e) => updateStep(i, { title: e.target.value })}
                className={inputClass.replace("text-xs", "text-sm")}
              />
              <input
                type="text"
                placeholder="Step description (optional)"
                value={step.description || ""}
                onChange={(e) => updateStep(i, { description: e.target.value })}
                className={inputClass}
              />
            </div>

            {/* Add-ons for addon_select type */}
            {step.type === "addon_select" && (
              <div className="mt-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="font-mono text-[9px] text-muted">add-ons</span>
                  <button
                    type="button"
                    onClick={() => addAddon(i)}
                    className="rounded bg-white/5 px-2 py-0.5 font-mono text-[9px] text-cream hover:bg-white/10"
                  >
                    + add option
                  </button>
                </div>
                {(step.add_ons || []).map((addon, j) => (
                  <div key={addon.id} className="mb-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="font-mono text-[8px] text-muted">option {j + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeAddon(i, j)}
                        className="font-mono text-[8px] text-muted/40 hover:text-muted"
                      >
                        remove
                      </button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Name (e.g., Stay - Shared Room)"
                        value={addon.name}
                        onChange={(e) => updateAddon(i, j, { name: e.target.value })}
                        className={inputClass}
                      />
                      <input
                        type="text"
                        placeholder="Description"
                        value={addon.description}
                        onChange={(e) => updateAddon(i, j, { description: e.target.value })}
                        className={inputClass}
                      />
                      <input
                        type="number"
                        placeholder="Price (paise)"
                        value={addon.price || ""}
                        onChange={(e) => updateAddon(i, j, { price: Number(e.target.value) || 0 })}
                        className={inputClass}
                      />
                      <input
                        type="number"
                        placeholder="Available"
                        value={addon.available || ""}
                        onChange={(e) => updateAddon(i, j, { available: Number(e.target.value) || 0 })}
                        className={inputClass}
                      />
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={addon.required}
                          onChange={(e) => updateAddon(i, j, { required: e.target.checked })}
                          className="h-3 w-3 accent-caramel"
                        />
                        <span className="font-mono text-[9px] text-muted">required</span>
                      </label>
                      <div className="flex items-center gap-1">
                        <span className="font-mono text-[9px] text-muted">max qty:</span>
                        <input
                          type="number"
                          min="1"
                          value={addon.max_quantity}
                          onChange={(e) => updateAddon(i, j, { max_quantity: Number(e.target.value) || 1 })}
                          className="w-12 rounded border border-white/10 bg-white/5 px-1.5 py-0.5 font-mono text-[10px] text-cream focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Per-addon seating toggle */}
                    <div className="mt-2 border-t border-white/5 pt-2">
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={!!addon.seating?.enabled}
                          onChange={(e) => {
                            if (e.target.checked) {
                              updateAddon(i, j, {
                                seating: { enabled: true, spots: [], allow_choice: true } as AddonSeatingConfig,
                              });
                            } else {
                              updateAddon(i, j, { seating: undefined });
                            }
                          }}
                          className="h-3 w-3 accent-caramel"
                        />
                        <span className="font-mono text-[9px] text-muted">enable seating (spots/tables)</span>
                      </label>
                      {addon.seating?.enabled && (() => {
                        // Build "copy from" sources: event-level spots + other addons' spots
                        const copySources: Array<{ label: string; spots: FormSpot[]; floorPlanUrl?: string }> = [];
                        if (eventSpots && eventSpots.length > 0) {
                          copySources.push({ label: "Event seating", spots: eventSpots });
                        }
                        for (const step2 of steps) {
                          if (step2.type !== "addon_select" || !step2.add_ons) continue;
                          for (const otherAddon of step2.add_ons) {
                            if (otherAddon.id === addon.id || !otherAddon.seating?.enabled || !otherAddon.seating.spots?.length) continue;
                            copySources.push({
                              label: otherAddon.name || otherAddon.id,
                              spots: otherAddon.seating.spots.map((s) => ({
                                id: s.id, name: s.name, emoji: s.emoji || "🪑",
                                capacity: s.capacity.toString(), description: s.description || "",
                                section_id: s.section_id || "", price_override: s.price_override?.toString() || "",
                                x: s.x?.toString() || "", y: s.y?.toString() || "",
                                shape: s.shape || "circle", spot_type: s.spot_type || "table",
                                seats: s.seats?.map((seat) => ({ id: seat.id, label: seat.label, angle: seat.angle?.toString() || "0" })) || [],
                              })),
                              floorPlanUrl: otherAddon.seating.floor_plan_url,
                            });
                          }
                        }
                        return (
                        <div className="mt-2 rounded-lg border border-white/5 bg-white/[0.02] p-2.5">
                          {copySources.length > 0 && (
                            <div className="mb-2">
                              <select
                                className="w-full rounded border border-white/10 bg-white/5 px-2 py-1 font-mono text-[10px] text-cream focus:outline-none"
                                value=""
                                onChange={(e) => {
                                  const idx = Number(e.target.value);
                                  if (isNaN(idx)) return;
                                  const source = copySources[idx];
                                  // Deep-copy spots with fresh IDs + reset booked counts
                                  const freshSpots: AddonSeatingConfig["spots"] = source.spots.map((s) => ({
                                    id: `spot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                                    name: s.name, emoji: s.emoji, capacity: Number(s.capacity) || 1,
                                    booked: 0, section_id: s.section_id || undefined,
                                    price_override: s.price_override ? Number(s.price_override) : undefined,
                                    description: s.description?.trim() || undefined,
                                    x: s.x ? Number(s.x) : undefined, y: s.y ? Number(s.y) : undefined,
                                    shape: (s.shape || "circle") as "circle" | "rectangle" | "square",
                                    spot_type: (s.spot_type || "table") as "table" | "fixture" | "zone",
                                    seats: s.seats.length > 0 ? s.seats.map((seat) => ({
                                      id: `seat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
                                      label: seat.label, status: "available" as const, angle: Number(seat.angle) || 0,
                                    })) : undefined,
                                  }));
                                  updateAddon(i, j, {
                                    seating: { ...addon.seating!, spots: freshSpots, floor_plan_url: source.floorPlanUrl || addon.seating!.floor_plan_url },
                                  });
                                }}
                              >
                                <option value="">copy from...</option>
                                {copySources.map((src, idx) => (
                                  <option key={idx} value={idx}>{src.label}</option>
                                ))}
                              </select>
                            </div>
                          )}
                          <CustomSpotsEditor
                            spots={(addon.seating.spots || []).map((s) => ({
                              id: s.id,
                              name: s.name,
                              emoji: s.emoji || "🪑",
                              capacity: s.capacity.toString(),
                              description: s.description || "",
                              section_id: s.section_id || "",
                              price_override: s.price_override?.toString() || "",
                              x: s.x?.toString() || "",
                              y: s.y?.toString() || "",
                              shape: s.shape || "circle",
                              spot_type: s.spot_type || "table",
                              seats: s.seats?.map((seat) => ({
                                id: seat.id,
                                label: seat.label,
                                angle: seat.angle?.toString() || "0",
                              })) || [],
                            }))}
                            floorPlanUrl={addon.seating.floor_plan_url || ""}
                            analyzingFloorPlan={false}
                            allowChoice={addon.seating.allow_choice}
                            onSpotsChange={(formSpots) => {
                              const spots: AddonSeatingConfig["spots"] = formSpots.map((s) => ({
                                id: s.id,
                                name: s.name.trim(),
                                emoji: s.emoji,
                                capacity: (s.spot_type || "table") === "table" ? (Number(s.capacity) || 1) : 0,
                                booked: 0,
                                section_id: s.section_id || undefined,
                                price_override: s.price_override ? Number(s.price_override) : undefined,
                                description: s.description.trim() || undefined,
                                x: s.x ? Number(s.x) : undefined,
                                y: s.y ? Number(s.y) : undefined,
                                shape: s.shape || "circle",
                                spot_type: s.spot_type || "table",
                                seats: s.seats.length > 0 ? s.seats.map((seat) => ({
                                  id: seat.id,
                                  label: seat.label,
                                  status: "available" as const,
                                  angle: Number(seat.angle) || 0,
                                })) : undefined,
                              }));
                              updateAddon(i, j, {
                                seating: { ...addon.seating!, spots },
                              });
                            }}
                            onFloorPlanChange={(url) => {
                              updateAddon(i, j, {
                                seating: { ...addon.seating!, floor_plan_url: url || undefined },
                              });
                            }}
                            onAllowChoiceChange={(v) => {
                              updateAddon(i, j, {
                                seating: { ...addon.seating!, allow_choice: v },
                              });
                            }}
                            compact
                          />
                        </div>
                        );
                      })()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
        {steps.length === 0 && (
          <div className="rounded-xl border-[1.5px] border-dashed border-white/10 p-6 text-center">
            <p className="text-xs text-muted">no checkout steps — standard single-page checkout</p>
          </div>
        )}
      </div>
    </div>
  );
}

const SECTION_PRESETS: Record<string, { title: string; icon: string; items: string[] }> = {
  what_to_bring: { title: "What to Bring", icon: "🎒", items: ["ID proof", "Comfortable shoes", "Good vibes"] },
  what_to_expect: { title: "What to Expect", icon: "✨", items: ["Phone-free experience", "Curated music", "Surprise activities"] },
  schedule: { title: "Schedule", icon: "🕐", items: ["7:00 PM — Doors open", "8:00 PM — Main event", "11:00 PM — Wrap up"] },
  custom: { title: "Custom Section", icon: "📝", items: [] },
};

function PostBookingBuilder({
  sections,
  customMessage,
  showCountdown,
  showVenueProgress,
  showDailyQuote,
  onChange,
}: {
  sections: PostBookingSection[];
  customMessage: string;
  showCountdown: boolean;
  showVenueProgress: boolean;
  showDailyQuote: boolean;
  onChange: (val: {
    sections: PostBookingSection[];
    customMessage: string;
    showCountdown: boolean;
    showVenueProgress: boolean;
    showDailyQuote: boolean;
  }) => void;
}) {
  const addSection = (type: PostBookingSection["type"]) => {
    const preset = SECTION_PRESETS[type];
    onChange({
      sections: [...sections, { type, title: preset.title, items: preset.items, icon: preset.icon }],
      customMessage,
      showCountdown,
      showVenueProgress,
      showDailyQuote,
    });
  };

  const removeSection = (i: number) => {
    onChange({
      sections: sections.filter((_, idx) => idx !== i),
      customMessage,
      showCountdown,
      showVenueProgress,
      showDailyQuote,
    });
  };

  const updateSection = (i: number, updates: Partial<PostBookingSection>) => {
    const next = [...sections];
    next[i] = { ...next[i], ...updates };
    onChange({ sections: next, customMessage, showCountdown, showVenueProgress, showDailyQuote });
  };

  return (
    <div>
      <div className="mb-2.5 flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
          post-booking sections
        </label>
        <div className="flex gap-1">
          {(["what_to_bring", "what_to_expect", "schedule", "custom"] as const).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => addSection(type)}
              className="rounded-lg bg-white/5 px-2 py-1 font-mono text-[9px] text-cream transition-colors hover:bg-white/10"
            >
              + {type.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        {sections.map((s, i) => (
          <div key={i} className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-mono text-[10px] text-caramel">{s.icon} {s.type.replace(/_/g, " ")}</span>
              <button
                type="button"
                onClick={() => removeSection(i)}
                className="font-mono text-[10px] text-muted/40 transition-colors hover:text-muted"
              >
                remove
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Section title"
                value={s.title}
                onChange={(e) => updateSection(i, { title: e.target.value })}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
              />
              <textarea
                placeholder="One item per line"
                value={s.items.join("\n")}
                onChange={(e) => updateSection(i, { items: e.target.value.split("\n") })}
                rows={3}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none resize-y"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Custom message */}
      <div className="mt-3">
        <label className="mb-1 block font-mono text-[9px] text-muted">personal message from organizer</label>
        <textarea
          placeholder="Hey! Can't wait to see you there..."
          value={customMessage}
          onChange={(e) => onChange({ sections, customMessage: e.target.value, showCountdown, showVenueProgress, showDailyQuote })}
          rows={2}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none resize-y"
        />
      </div>

      {/* Toggle options */}
      <div className="mt-3 flex flex-wrap gap-3">
        {[
          { label: "countdown", checked: showCountdown, onChange: (v: boolean) => onChange({ sections, customMessage, showCountdown: v, showVenueProgress, showDailyQuote }) },
          { label: "venue progress", checked: showVenueProgress, onChange: (v: boolean) => onChange({ sections, customMessage, showCountdown, showVenueProgress: v, showDailyQuote }) },
          { label: "daily quote", checked: showDailyQuote, onChange: (v: boolean) => onChange({ sections, customMessage, showCountdown, showVenueProgress, showDailyQuote: v }) },
        ].map((opt) => (
          <label key={opt.label} className="flex cursor-pointer items-center gap-2">
            <input
              type="checkbox"
              checked={opt.checked}
              onChange={(e) => opt.onChange(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-caramel"
            />
            <span className="font-mono text-[10px] text-muted">{opt.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

const SECTION_COLORS = ["#D4A574", "#D4654A", "#6B8E6B", "#7B68AE", "#5B8DB8", "#C9A84C"];

interface FormSection {
  id: string;
  name: string;
  emoji: string;
  description: string;
  capacity: string;
  price_override: string;
  color: string;
}

interface FormSeatRow {
  id: string;
  label: string;
  seats_count: string;
  section_id: string;
}

interface FormSpotSeat {
  id: string;
  label: string;
  angle: string;
}

interface FormSpot {
  id: string;
  name: string;
  emoji: string;
  capacity: string;
  description: string;
  section_id: string;
  price_override: string;
  x: string;
  y: string;
  shape: "circle" | "rectangle" | "square";
  seats: FormSpotSeat[];
  spot_type: "table" | "fixture" | "zone";
}

/* ── Reusable custom spots editor (used by SeatingBuilder + add-on seating) ── */

function CustomSpotsEditor({
  spots,
  floorPlanUrl,
  analyzingFloorPlan,
  allowChoice,
  onSpotsChange,
  onFloorPlanChange,
  onAnalyzeFloorPlan,
  onAllowChoiceChange,
  compact,
}: {
  spots: FormSpot[];
  floorPlanUrl: string;
  analyzingFloorPlan: boolean;
  allowChoice: boolean;
  onSpotsChange: (s: FormSpot[]) => void;
  onFloorPlanChange: (url: string) => void;
  onAnalyzeFloorPlan?: () => void;
  onAllowChoiceChange: (v: boolean) => void;
  compact?: boolean; // smaller UI when nested inside add-on card
}) {
  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none";

  const addSpot = () => {
    onSpotsChange([...spots, {
      id: `spot_${Date.now()}`,
      name: "",
      emoji: "🪑",
      capacity: "1",
      description: "",
      section_id: "",
      price_override: "",
      x: "",
      y: "",
      shape: "circle",
      seats: [],
      spot_type: "table",
    }]);
  };

  const generateSeatsForSpot = (capacity: number, spotId: string): FormSpotSeat[] => {
    const cap = Math.max(1, capacity);
    return Array.from({ length: cap }, (_, i) => ({
      id: `${spotId}_seat_${i}`,
      label: `Seat ${i + 1}`,
      angle: String(Math.round((360 / cap) * i)),
    }));
  };

  const updateSpot = (i: number, updates: Partial<FormSpot>) => {
    const next = [...spots];
    next[i] = { ...next[i], ...updates };
    onSpotsChange(next);
  };

  const removeSpot = (i: number) => onSpotsChange(spots.filter((_, idx) => idx !== i));

  const totalSpotCap = spots.reduce((s, sp) => (sp.spot_type || "table") === "table" ? s + (Number(sp.capacity) || 0) : s, 0);

  return (
    <div>
      {/* Floor plan upload */}
      {!compact && (
        <div className="mb-4">
          <label className="mb-2 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            floor plan
          </label>
          <ImageUpload
            value={floorPlanUrl}
            onChange={onFloorPlanChange}
            pathPrefix="events/floorplans"
            label="upload floor plan image"
            maxWidth={2000}
          />
          {floorPlanUrl && onAnalyzeFloorPlan && (
            <button
              type="button"
              onClick={onAnalyzeFloorPlan}
              disabled={analyzingFloorPlan}
              className="mt-2 w-full rounded-lg bg-caramel/20 px-3 py-2.5 font-mono text-[11px] text-caramel transition-colors hover:bg-caramel/30 disabled:opacity-50"
            >
              {analyzingFloorPlan ? "analyzing with AI..." : "✨ generate spots from floor plan"}
            </button>
          )}
        </div>
      )}

      {/* Spots list */}
      <div className="mb-2 flex items-center justify-between">
        <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">spots</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] text-muted/60">
            total: {totalSpotCap} capacity
          </span>
          <button
            type="button"
            onClick={addSpot}
            className="rounded-lg bg-white/5 px-3 py-1 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
          >
            + add spot
          </button>
        </div>
      </div>
      <div className="flex flex-col gap-2.5">
        {spots.map((spot, i) => {
          const isTable = spot.spot_type === "table" || !spot.spot_type;
          return (
          <div key={spot.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] text-caramel">spot {i + 1}</span>
                {/* Type selector pills */}
                <div className="flex gap-1">
                  {(["table", "fixture", "zone"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        const updates: Partial<FormSpot> = { spot_type: t };
                        if (t !== "table") {
                          updates.seats = [];
                          updates.capacity = "0";
                        }
                        updateSpot(i, updates);
                      }}
                      className={`rounded-md px-1.5 py-0.5 font-mono text-[8px] transition-colors ${(spot.spot_type || "table") === t ? "bg-caramel/30 text-caramel" : "bg-white/5 text-muted/50 hover:bg-white/10"}`}
                    >
                      {t === "table" ? "🪑 table" : t === "fixture" ? "🎧 fixture" : "📍 zone"}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeSpot(i)}
                className="font-mono text-[10px] text-muted/40 transition-colors hover:text-muted"
              >
                remove
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <div className="grid grid-cols-[auto_1fr] gap-2">
                <EmojiPickerMini value={spot.emoji} onChange={(v) => updateSpot(i, { emoji: v })} />
                <input
                  type="text"
                  placeholder={isTable ? "Spot name (e.g. Pod Table A)" : spot.spot_type === "fixture" ? "Fixture name (e.g. DJ Console)" : "Zone name (e.g. Villa Entrance)"}
                  value={spot.name}
                  onChange={(e) => updateSpot(i, { name: e.target.value })}
                  className={inputClass.replace("text-xs", "text-sm")}
                />
              </div>
              <input
                type="text"
                placeholder="Description (optional)"
                value={spot.description}
                onChange={(e) => updateSpot(i, { description: e.target.value })}
                className={inputClass}
              />
              {isTable && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="mb-1 block font-mono text-[9px] text-muted">capacity</span>
                    <input
                      type="number"
                      min="1"
                      placeholder="1"
                      value={spot.capacity}
                      onChange={(e) => {
                        const cap = Number(e.target.value) || 1;
                        const updates: Partial<FormSpot> = { capacity: e.target.value };
                        if (spot.seats.length > 0) {
                          updates.seats = generateSeatsForSpot(cap, spot.id);
                        }
                        updateSpot(i, updates);
                      }}
                      className={inputClass}
                    />
                  </div>
                  {!compact && (
                    <div>
                      <span className="mb-1 block font-mono text-[9px] text-muted">price override</span>
                      <input
                        type="number"
                        placeholder="—"
                        value={spot.price_override}
                        onChange={(e) => updateSpot(i, { price_override: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              )}
              {/* Shape + individual seats — only for tables */}
              {isTable && (
                <div>
                  <div className="mb-1.5 flex items-center gap-2">
                    <span className="font-mono text-[9px] text-muted">shape</span>
                    <div className="flex gap-1">
                      {(["circle", "rectangle", "square"] as const).map((sh) => (
                        <button
                          key={sh}
                          type="button"
                          onClick={() => updateSpot(i, { shape: sh })}
                          className={`rounded-md px-2 py-0.5 font-mono text-[9px] transition-colors ${spot.shape === sh ? "bg-caramel/30 text-caramel" : "bg-white/5 text-muted hover:bg-white/10"}`}
                        >
                          {sh}
                        </button>
                      ))}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (spot.seats.length > 0) {
                        updateSpot(i, { seats: [] });
                      } else {
                        updateSpot(i, { seats: generateSeatsForSpot(Number(spot.capacity) || 1, spot.id) });
                      }
                    }}
                    className={`w-full rounded-lg px-3 py-1.5 font-mono text-[10px] transition-colors ${spot.seats.length > 0 ? "bg-caramel/20 text-caramel" : "bg-white/5 text-muted hover:bg-white/10"}`}
                  >
                    {spot.seats.length > 0 ? `✓ ${spot.seats.length} individual seats` : "enable individual seats"}
                  </button>
                  {spot.seats.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {spot.seats.map((seat) => (
                        <span key={seat.id} className="rounded-md bg-white/5 px-1.5 py-0.5 font-mono text-[8px] text-cream">
                          {seat.label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          );
        })}
        {spots.length === 0 && (
          <div className="rounded-xl border-[1.5px] border-dashed border-white/10 p-5 text-center">
            <span className="mb-1.5 block text-xl">🪑</span>
            <p className="text-xs text-muted">no spots yet — {compact ? "add manually" : "upload a floor plan or add manually"}</p>
          </div>
        )}
      </div>

      {/* Allow choice toggle */}
      <label className="mt-3 flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={allowChoice}
          onChange={(e) => onAllowChoiceChange(e.target.checked)}
          className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-caramel"
        />
        <span className="font-mono text-[10px] text-muted">
          let users choose their spot
        </span>
      </label>
    </div>
  );
}

function SeatingBuilder({
  mode,
  sections,
  rows,
  allowChoice,
  spots,
  floorPlanUrl,
  analyzingFloorPlan,
  onModeChange,
  onSectionsChange,
  onRowsChange,
  onAllowChoiceChange,
  onSpotsChange,
  onFloorPlanChange,
  onAnalyzeFloorPlan,
}: {
  mode: SeatingMode;
  sections: FormSection[];
  rows: FormSeatRow[];
  allowChoice: boolean;
  spots: FormSpot[];
  floorPlanUrl: string;
  analyzingFloorPlan: boolean;
  onModeChange: (m: SeatingMode) => void;
  onSectionsChange: (s: FormSection[]) => void;
  onRowsChange: (r: FormSeatRow[]) => void;
  onAllowChoiceChange: (v: boolean) => void;
  onSpotsChange: (s: FormSpot[]) => void;
  onFloorPlanChange: (url: string) => void;
  onAnalyzeFloorPlan: () => void;
}) {
  const addSection = () => {
    const idx = sections.length;
    onSectionsChange([...sections, {
      id: `sec_${Date.now()}`,
      name: "",
      emoji: "🎯",
      description: "",
      capacity: "",
      price_override: "",
      color: SECTION_COLORS[idx % SECTION_COLORS.length],
    }]);
  };

  const updateSection = (i: number, updates: Partial<FormSection>) => {
    const next = [...sections];
    next[i] = { ...next[i], ...updates };
    onSectionsChange(next);
  };

  const removeSection = (i: number) => {
    const removed = sections[i];
    onSectionsChange(sections.filter((_, idx) => idx !== i));
    // Clear section_id references in rows
    onRowsChange(rows.map((r) => r.section_id === removed.id ? { ...r, section_id: "" } : r));
  };

  const addRow = () => {
    const nextLabel = String.fromCharCode(65 + rows.length); // A, B, C...
    onRowsChange([...rows, {
      id: `row_${Date.now()}`,
      label: nextLabel,
      seats_count: "10",
      section_id: "",
    }]);
  };

  const updateRow = (i: number, updates: Partial<FormSeatRow>) => {
    const next = [...rows];
    next[i] = { ...next[i], ...updates };
    onRowsChange(next);
  };

  const removeRow = (i: number) => onRowsChange(rows.filter((_, idx) => idx !== i));

  const inputClass = "w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none";

  const totalSectionCap = sections.reduce((s, sec) => s + (Number(sec.capacity) || 0), 0);
  const totalSeatCount = rows.reduce((s, r) => s + (Number(r.seats_count) || 0), 0);
  const totalSpotCap = spots.reduce((s, sp) => (sp.spot_type || "table") === "table" ? s + (Number(sp.capacity) || 0) : s, 0);

  return (
    <div>
      {/* Mode selector */}
      <div className="mb-3">
        <label className="mb-2 block font-mono text-[9px] text-muted">seating mode</label>
        <div className="flex gap-1.5">
          {(["none", "sections", "seats", "mixed", "custom"] as SeatingMode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              className={`rounded-lg px-3 py-1.5 font-mono text-[10px] transition-colors ${
                mode === m ? "bg-caramel text-gate-black" : "bg-white/5 text-cream hover:bg-white/10"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      {/* Sections (for sections or mixed mode) */}
      {(mode === "sections" || mode === "mixed") && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">sections</label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted/60">
                total: {totalSectionCap}
              </span>
              <button
                type="button"
                onClick={addSection}
                className="rounded-lg bg-white/5 px-3 py-1 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
              >
                + add section
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2.5">
            {sections.map((sec, i) => (
              <div key={sec.id} className="rounded-xl border border-white/5 bg-white/[0.03] p-3.5">
                <div className="mb-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full" style={{ background: sec.color }} />
                    <span className="font-mono text-[10px] text-caramel">section {i + 1}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeSection(i)}
                    className="font-mono text-[10px] text-muted/40 transition-colors hover:text-muted"
                  >
                    remove
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <div className="grid grid-cols-[auto_1fr] gap-2">
                    <EmojiPickerMini value={sec.emoji} onChange={(v) => updateSection(i, { emoji: v })} />
                    <input
                      type="text"
                      placeholder="Section name (e.g. VIP Lounge)"
                      value={sec.name}
                      onChange={(e) => updateSection(i, { name: e.target.value })}
                      className={inputClass.replace("text-xs", "text-sm")}
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="Description (optional)"
                    value={sec.description}
                    onChange={(e) => updateSection(i, { description: e.target.value })}
                    className={inputClass}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <span className="mb-1 block font-mono text-[9px] text-muted">capacity</span>
                      <input
                        type="number"
                        placeholder="50"
                        value={sec.capacity}
                        onChange={(e) => updateSection(i, { capacity: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block font-mono text-[9px] text-muted">price override</span>
                      <input
                        type="number"
                        placeholder="—"
                        value={sec.price_override}
                        onChange={(e) => updateSection(i, { price_override: e.target.value })}
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block font-mono text-[9px] text-muted">color</span>
                      <input
                        type="color"
                        value={sec.color}
                        onChange={(e) => updateSection(i, { color: e.target.value })}
                        className="h-[34px] w-full cursor-pointer appearance-none rounded-lg border border-white/10 bg-transparent p-0"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))}
            {sections.length === 0 && (
              <div className="rounded-xl border-[1.5px] border-dashed border-white/10 p-5 text-center">
                <p className="text-xs text-muted">no sections — add zones like VIP, General, Front Row</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Seat Rows (for seats or mixed mode) */}
      {(mode === "seats" || mode === "mixed") && (
        <div className="mb-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">seat rows</label>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[9px] text-muted/60">
                total: {totalSeatCount} seats
              </span>
              <button
                type="button"
                onClick={addRow}
                className="rounded-lg bg-white/5 px-3 py-1 font-mono text-[10px] text-cream transition-colors hover:bg-white/10"
              >
                + add row
              </button>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {rows.map((row, i) => (
              <div key={row.id} className="flex items-center gap-2 rounded-xl border border-white/5 bg-white/[0.03] p-2.5">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/5 font-mono text-sm font-medium text-caramel">
                  {row.label}
                </div>
                <div className="flex flex-1 gap-2">
                  <div className="flex-1">
                    <input
                      type="text"
                      placeholder="Row label"
                      value={row.label}
                      onChange={(e) => updateRow(i, { label: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  <div className="w-20">
                    <input
                      type="number"
                      placeholder="Seats"
                      value={row.seats_count}
                      onChange={(e) => updateRow(i, { seats_count: e.target.value })}
                      className={inputClass}
                    />
                  </div>
                  {mode === "mixed" && sections.length > 0 && (
                    <select
                      value={row.section_id}
                      onChange={(e) => updateRow(i, { section_id: e.target.value })}
                      className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 font-mono text-[10px] text-cream focus:border-caramel/50 focus:outline-none"
                    >
                      <option value="">no section</option>
                      {sections.map((s) => (
                        <option key={s.id} value={s.id}>{s.name || `Section ${sections.indexOf(s) + 1}`}</option>
                      ))}
                    </select>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => removeRow(i)}
                  className="shrink-0 p-1 text-sm text-muted/40 transition-colors hover:text-muted"
                >
                  ✕
                </button>
              </div>
            ))}
            {rows.length === 0 && (
              <div className="rounded-xl border-[1.5px] border-dashed border-white/10 p-5 text-center">
                <p className="text-xs text-muted">no rows — add seat rows (A, B, C...)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom spots (for custom mode) — uses extracted CustomSpotsEditor */}
      {mode === "custom" && (
        <div className="mb-4">
          <CustomSpotsEditor
            spots={spots}
            floorPlanUrl={floorPlanUrl}
            analyzingFloorPlan={analyzingFloorPlan}
            allowChoice={allowChoice}
            onSpotsChange={onSpotsChange}
            onFloorPlanChange={onFloorPlanChange}
            onAnalyzeFloorPlan={onAnalyzeFloorPlan}
            onAllowChoiceChange={onAllowChoiceChange}
          />
        </div>
      )}

      {/* Allow choice toggle — for non-custom modes */}
      {mode !== "none" && mode !== "custom" && (
        <label className="flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={allowChoice}
            onChange={(e) => onAllowChoiceChange(e.target.checked)}
            className="h-3.5 w-3.5 rounded border-white/20 bg-white/5 accent-caramel"
          />
          <span className="font-mono text-[10px] text-muted">
            let users choose their {mode === "sections" ? "section" : mode === "seats" ? "seat" : "section or seat"}
          </span>
        </label>
      )}

      {/* Layout preview */}
      {mode !== "none" && (sections.length > 0 || rows.length > 0 || spots.length > 0) && (
        <div className="mt-3 rounded-xl border border-white/5 bg-white/[0.02] p-3.5">
          <span className="mb-2 block font-mono text-[9px] uppercase tracking-[1px] text-muted/60">preview</span>

          {/* Section-based preview */}
          {(mode === "sections" || mode === "mixed") && sections.length > 0 && (
            <div className="mb-2 flex flex-wrap justify-center gap-1.5">
              {sections.map((sec) => (
                <div
                  key={sec.id}
                  className="flex flex-col items-center rounded-lg border border-white/5 px-3 py-2"
                  style={{ borderColor: sec.color + "40", background: sec.color + "10" }}
                >
                  <span className="text-sm">{sec.emoji}</span>
                  <span className="font-mono text-[8px] text-cream">{sec.name || "—"}</span>
                  <span className="font-mono text-[7px] text-muted">{sec.capacity || "0"} cap</span>
                </div>
              ))}
            </div>
          )}

          {/* Seat-based preview */}
          {(mode === "seats" || mode === "mixed") && rows.length > 0 && (
            <div className="flex flex-col items-center gap-1">
              {rows.map((row) => {
                const count = Number(row.seats_count) || 0;
                const section = sections.find((s) => s.id === row.section_id);
                const seatColor = section?.color || "#D4A574";
                return (
                  <div key={row.id} className="flex items-center gap-1.5">
                    <span className="w-4 text-right font-mono text-[8px] text-muted">{row.label}</span>
                    <div className="flex gap-0.5">
                      {Array.from({ length: Math.min(count, 20) }).map((_, j) => (
                        <div
                          key={j}
                          className="h-2.5 w-2.5 rounded-sm"
                          style={{ background: seatColor + "60" }}
                        />
                      ))}
                      {count > 20 && (
                        <span className="font-mono text-[7px] text-muted">+{count - 20}</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Custom spots preview — spatial floor plan */}
          {mode === "custom" && spots.length > 0 && (() => {
            const hasCoords = spots.some((s) => s.x && s.y);
            if (!hasCoords) return null;

            // Remap coordinates to add padding so edge elements don't clip.
            // Raw x/y are 0-100. We remap to 8%-92% so there's ~8% padding on all sides.
            const xValues = spots.map((s) => Number(s.x) || 50);
            const yValues = spots.map((s) => Number(s.y) || 50);
            const xMin = Math.min(...xValues);
            const xMax = Math.max(...xValues);
            const yMin = Math.min(...yValues);
            const yMax = Math.max(...yValues);
            const xRange = Math.max(xMax - xMin, 1);
            const yRange = Math.max(yMax - yMin, 1);
            const pad = 8; // percent padding on each side
            const usable = 100 - pad * 2;
            const remapX = (x: number) => pad + ((x - xMin) / xRange) * usable;
            const remapY = (y: number) => pad + ((y - yMin) / yRange) * usable;

            // Use aspect ratio so height scales with width — no fixed px
            const ySpread = yMax - yMin;
            const xSpread = xMax - xMin;
            // Taller layouts get a taller aspect ratio
            const ratio = xSpread > 0 ? Math.max(0.7, Math.min(1.4, ySpread / xSpread)) : 1;

            return (
              <div
                className="relative w-full rounded-lg bg-white/[0.02] border border-white/5"
                style={{ aspectRatio: `1 / ${ratio}` }}
              >
                {spots.map((spot) => {
                  const xVal = remapX(Number(spot.x) || 50);
                  const yVal = remapY(Number(spot.y) || 50);
                  const cap = Number(spot.capacity) || 1;
                  const sType = spot.spot_type || "table";

                  // Fixtures: dashed pill with emoji + name
                  if (sType === "fixture") {
                    return (
                      <div
                        key={spot.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${xVal}%`, top: `${yVal}%` }}
                      >
                        <div className="flex items-center gap-1 rounded-full border border-dashed border-white/25 bg-white/[0.06] px-2.5 py-1 whitespace-nowrap">
                          <span className="text-sm">{spot.emoji}</span>
                          <span className="font-mono text-[11px] text-muted">{spot.name}</span>
                        </div>
                      </div>
                    );
                  }

                  // Zones: semi-transparent label
                  if (sType === "zone") {
                    return (
                      <div
                        key={spot.id}
                        className="absolute -translate-x-1/2 -translate-y-1/2"
                        style={{ left: `${xVal}%`, top: `${yVal}%` }}
                      >
                        <div className="rounded-lg bg-white/[0.04] px-3 py-1 whitespace-nowrap">
                          <span className="text-sm">{spot.emoji}</span>
                          <span className="ml-1 font-mono text-[11px] text-muted/60">{spot.name}</span>
                        </div>
                      </div>
                    );
                  }

                  // Tables: shape with seat dots around it + name label
                  return (
                    <div
                      key={spot.id}
                      className="absolute -translate-x-1/2 -translate-y-1/2"
                      style={{ left: `${xVal}%`, top: `${yVal}%` }}
                    >
                      <div className="flex flex-col items-center">
                        <div className="relative flex items-center justify-center">
                          {/* Table shape */}
                          <div
                            className={`flex items-center justify-center border border-white/25 bg-white/[0.08] text-sm ${
                              spot.shape === "rectangle" ? "h-7 w-12 rounded-md" : spot.shape === "square" ? "h-8 w-8 rounded-md" : "h-8 w-8 rounded-full"
                            }`}
                          >
                            {spot.emoji}
                          </div>
                          {/* Seat dots around the table */}
                          {spot.seats.length > 0 && spot.seats.map((seat, si) => {
                            const angle = (Number(seat.angle) || (360 / cap) * si) * (Math.PI / 180);
                            const r = spot.shape === "rectangle" ? 26 : 22;
                            const sx = Math.sin(angle) * r;
                            const sy = -Math.cos(angle) * r;
                            return (
                              <div
                                key={seat.id}
                                className="absolute h-2.5 w-2.5 rounded-full"
                                style={{
                                  transform: `translate(${sx}px, ${sy}px)`,
                                  background: "rgba(212,165,116,0.5)",
                                  border: "1px solid rgba(212,165,116,0.7)",
                                }}
                                title={seat.label}
                              />
                            );
                          })}
                        </div>
                        {/* Name below table */}
                        <span className="mt-1 max-w-[80px] truncate text-center font-mono text-[10px] text-cream/70">{spot.name}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      )}
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
  const [ticketingEnabled, setTicketingEnabled] = useState(event?.ticketing?.enabled || false);
  const [tiers, setTiers] = useState<FormTier[]>(
    event?.ticketing?.tiers?.map((t) => ({
      id: t.id,
      name: t.name,
      label: t.label,
      price: t.price.toString(),
      capacity: t.capacity.toString(),
      deadline: t.deadline ? t.deadline.slice(0, 16) : "",
      opens_at: t.opens_at ? t.opens_at.slice(0, 16) : "",
      description: t.description,
      per_person: (t.per_person || 1).toString(),
    })) || []
  );
  const [maxPerUser, setMaxPerUser] = useState((event?.ticketing?.max_per_user || 1).toString());
  const [refundPolicy, setRefundPolicy] = useState(event?.ticketing?.refund_policy || "");
  const [checkoutEnabled, setCheckoutEnabled] = useState(event?.checkout?.enabled || false);
  const [checkoutSteps, setCheckoutSteps] = useState<CheckoutStep[]>(event?.checkout?.steps || []);
  const [postBookingSections, setPostBookingSections] = useState<PostBookingSection[]>(
    event?.post_booking?.sections || []
  );
  const [postBookingMessage, setPostBookingMessage] = useState(event?.post_booking?.custom_message || "");
  const [showCountdown, setShowCountdown] = useState(event?.post_booking?.show_countdown ?? true);
  const [showVenueProgress, setShowVenueProgress] = useState(event?.post_booking?.show_venue_progress ?? true);
  const [showDailyQuote, setShowDailyQuote] = useState(event?.post_booking?.show_daily_quote ?? true);
  const [seatingMode, setSeatingMode] = useState<SeatingMode>(event?.seating?.mode || "none");
  const [seatingSections, setSeatingSections] = useState<FormSection[]>(
    event?.seating?.sections?.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji || "🎯",
      description: s.description || "",
      capacity: s.capacity.toString(),
      price_override: s.price_override?.toString() || "",
      color: s.color || "#D4A574",
    })) || []
  );
  const [seatRows, setSeatRows] = useState<FormSeatRow[]>(
    event?.seating?.rows?.map((r) => ({
      id: r.id,
      label: r.label,
      seats_count: r.seats_count.toString(),
      section_id: r.section_id || "",
    })) || []
  );
  const [allowSeatChoice, setAllowSeatChoice] = useState(event?.seating?.allow_choice ?? true);
  const [customSpots, setCustomSpots] = useState<FormSpot[]>(
    event?.seating?.spots?.map((s) => ({
      id: s.id,
      name: s.name,
      emoji: s.emoji || "🪑",
      capacity: s.capacity.toString(),
      description: s.description || "",
      section_id: s.section_id || "",
      price_override: s.price_override?.toString() || "",
      x: s.x?.toString() || "",
      y: s.y?.toString() || "",
      shape: s.shape || "circle",
      spot_type: s.spot_type || "table",
      seats: s.seats?.map((seat) => ({
        id: seat.id,
        label: seat.label,
        angle: seat.angle?.toString() || "0",
      })) || [],
    })) || []
  );
  const [floorPlanUrl, setFloorPlanUrl] = useState(event?.seating?.floor_plan_url || "");
  const [analyzingFloorPlan, setAnalyzingFloorPlan] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  async function handleAnalyzeFloorPlan() {
    if (!floorPlanUrl) return;
    setAnalyzingFloorPlan(true);
    setError("");
    try {
      // Download the floor plan image and convert to base64 data URI
      const response = await fetch(floorPlanUrl);
      const blob = await response.blob();
      const dataUri = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });

      const res = await apiClient.post<{ success: boolean; data: { spots: Array<{ id: string; name: string; emoji: string; capacity: number; description: string; x?: number; y?: number; shape?: string; spot_type?: string; seats?: Array<{ id: string; label: string; status: string; angle?: number }> }> }; error?: string }>(
        "/api/admin/floorplan/analyze",
        { image: dataUri },
      );

      setCustomSpots(res.data.spots.map((s) => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji || "🪑",
        capacity: s.capacity.toString(),
        description: s.description || "",
        section_id: "",
        price_override: "",
        x: s.x?.toString() || "",
        y: s.y?.toString() || "",
        shape: (s.shape as "circle" | "rectangle" | "square") || "circle",
        spot_type: (s.spot_type as "table" | "fixture" | "zone") || "table",
        seats: s.seats?.map((seat) => ({
          id: seat.id,
          label: seat.label,
          angle: seat.angle?.toString() || "0",
        })) || [],
      })));
    } catch (err) {
      setError((err as Error).message || "Failed to analyze floor plan");
    } finally {
      setAnalyzingFloorPlan(false);
    }
  }

  function buildPreviewEvent(): Event {
    return {
      id: event?.id || "preview",
      title: title.trim() || "Event Title",
      tagline: tagline.trim(),
      description: description.trim(),
      date: date || "2026-03-01",
      time: time.trim() || "8:00 PM",
      total_spots: Number(totalSpots) || 50,
      spots_taken: event?.spots_taken || 0,
      tag: tag.trim(),
      emoji: emoji || "🎯",
      accent: accent,
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
      ticketing: ticketingEnabled ? {
        enabled: true,
        tiers: tiers.map((t) => ({
          id: t.id,
          name: t.name.trim(),
          label: t.label.trim(),
          price: Number(t.price) || 0,
          capacity: Number(t.capacity) || 0,
          sold: 0,
          deadline: t.deadline ? new Date(t.deadline).toISOString() : "",
          opens_at: t.opens_at ? new Date(t.opens_at).toISOString() : undefined,
          description: t.description.trim(),
          per_person: Number(t.per_person) || 1,
        })),
        time_slots_enabled: false,
        max_per_user: Number(maxPerUser) || 1,
        refund_policy: refundPolicy.trim() || undefined,
      } : { enabled: false, tiers: [], time_slots_enabled: false, max_per_user: 1 },
      is_free: !ticketingEnabled || tiers.every((t) => Number(t.price) === 0),
      checkout: checkoutEnabled && checkoutSteps.length > 0 ? {
        enabled: true,
        steps: checkoutSteps,
      } : undefined,
      post_booking: postBookingSections.length > 0 || postBookingMessage ? {
        sections: postBookingSections.map((s) => ({
          ...s,
          items: s.items.filter((item) => item.trim()),
        })),
        custom_message: postBookingMessage.trim() || undefined,
        show_countdown: showCountdown,
        show_venue_progress: showVenueProgress,
        show_daily_quote: showDailyQuote,
      } : undefined,
      seating: seatingMode !== "none" ? {
        mode: seatingMode,
        sections: seatingMode !== "custom" ? seatingSections.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          emoji: s.emoji,
          description: s.description.trim() || undefined,
          capacity: Number(s.capacity) || 0,
          booked: 0,
          price_override: s.price_override ? Number(s.price_override) : undefined,
          color: s.color,
        })) : [],
        rows: seatingMode !== "custom" ? seatRows.map((r) => ({
          id: r.id,
          label: r.label.trim(),
          seats_count: Number(r.seats_count) || 0,
          section_id: r.section_id || undefined,
        })) : [],
        seats: [],
        spots: seatingMode === "custom" ? customSpots.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          emoji: s.emoji,
          capacity: (s.spot_type || "table") === "table" ? (Number(s.capacity) || 1) : 0,
          booked: 0,
          section_id: s.section_id || undefined,
          price_override: s.price_override ? Number(s.price_override) : undefined,
          description: s.description.trim() || undefined,
          x: s.x ? Number(s.x) : undefined,
          y: s.y ? Number(s.y) : undefined,
          shape: s.shape || "circle",
          spot_type: s.spot_type || "table",
          seats: s.seats.length > 0 ? s.seats.map((seat) => ({
            id: seat.id,
            label: seat.label,
            status: "available" as const,
            angle: Number(seat.angle) || 0,
          })) : undefined,
        })) : undefined,
        floor_plan_url: seatingMode === "custom" ? (floorPlanUrl || undefined) : undefined,
        allow_choice: allowSeatChoice,
      } : undefined,
      status: event?.status || "draft",
    } as Event;
  }

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
      ticketing: ticketingEnabled ? {
        enabled: true,
        tiers: tiers.map((t) => ({
          id: t.id,
          name: t.name.trim(),
          label: t.label.trim(),
          price: Number(t.price) || 0,
          capacity: Number(t.capacity) || 0,
          sold: 0,
          deadline: t.deadline ? new Date(t.deadline).toISOString() : "",
          opens_at: t.opens_at ? new Date(t.opens_at).toISOString() : undefined,
          description: t.description.trim(),
          per_person: Number(t.per_person) || 1,
        })),
        time_slots_enabled: false,
        max_per_user: Number(maxPerUser) || 1,
        refund_policy: refundPolicy.trim() || undefined,
      } : { enabled: false, tiers: [], time_slots_enabled: false, max_per_user: 1 },
      is_free: !ticketingEnabled || tiers.every((t) => Number(t.price) === 0),
      checkout: checkoutEnabled && checkoutSteps.length > 0 ? {
        enabled: true,
        steps: checkoutSteps,
      } : undefined,
      post_booking: postBookingSections.length > 0 || postBookingMessage ? {
        sections: postBookingSections.map((s) => ({
          ...s,
          items: s.items.filter((item) => item.trim()),
        })),
        custom_message: postBookingMessage.trim() || undefined,
        show_countdown: showCountdown,
        show_venue_progress: showVenueProgress,
        show_daily_quote: showDailyQuote,
      } : undefined,
      seating: seatingMode !== "none" ? {
        mode: seatingMode,
        sections: seatingMode !== "custom" ? seatingSections.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          emoji: s.emoji,
          description: s.description.trim() || undefined,
          capacity: Number(s.capacity) || 0,
          booked: 0,
          price_override: s.price_override ? Number(s.price_override) : undefined,
          color: s.color,
        })) : [],
        rows: seatingMode !== "custom" ? seatRows.map((r) => ({
          id: r.id,
          label: r.label.trim(),
          seats_count: Number(r.seats_count) || 0,
          section_id: r.section_id || undefined,
        })) : [],
        seats: seatingMode !== "custom" ? seatRows.flatMap((r) => {
          const count = Number(r.seats_count) || 0;
          return Array.from({ length: count }, (_, i) => ({
            id: `${r.label}${i + 1}`,
            row: r.label,
            number: i + 1,
            status: "available" as const,
            section_id: r.section_id || undefined,
          }));
        }) : [],
        spots: seatingMode === "custom" ? customSpots.map((s) => ({
          id: s.id,
          name: s.name.trim(),
          emoji: s.emoji,
          capacity: (s.spot_type || "table") === "table" ? (Number(s.capacity) || 1) : 0,
          booked: 0,
          section_id: s.section_id || undefined,
          price_override: s.price_override ? Number(s.price_override) : undefined,
          description: s.description.trim() || undefined,
          x: s.x ? Number(s.x) : undefined,
          y: s.y ? Number(s.y) : undefined,
          shape: s.shape || "circle",
          spot_type: s.spot_type || "table",
          seats: s.seats.length > 0 ? s.seats.map((seat) => ({
            id: seat.id,
            label: seat.label,
            status: "available" as const,
            angle: Number(seat.angle) || 0,
          })) : undefined,
        })) : undefined,
        floor_plan_url: seatingMode === "custom" ? (floorPlanUrl || undefined) : undefined,
        allow_choice: allowSeatChoice,
      } : undefined,
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

        {/* Ticketing */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
                ticketing
              </label>
              <p className="mt-0.5 text-[11px] text-muted/60">enable paid tickets with tier phases</p>
            </div>
            <button
              type="button"
              onClick={() => setTicketingEnabled(!ticketingEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                ticketingEnabled ? "bg-caramel" : "bg-white/10"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  ticketingEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {ticketingEnabled && (
            <div className="space-y-3">
              <TierBuilder tiers={tiers} onChange={setTiers} />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">max tickets per user</span>
                  <input
                    type="number"
                    min="1"
                    value={maxPerUser}
                    onChange={(e) => setMaxPerUser(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-xs text-cream focus:border-caramel/50 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="mb-1 block font-mono text-[9px] text-muted">refund policy</span>
                  <input
                    type="text"
                    placeholder="No refunds after 24hrs"
                    value={refundPolicy}
                    onChange={(e) => setRefundPolicy(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-sans text-xs text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Checkout Steps */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <label className="font-mono text-[10px] uppercase tracking-[2px] text-muted">
                checkout flow
              </label>
              <p className="mt-0.5 text-[11px] text-muted/60">add-ons, info steps, or pickup selection during purchase</p>
            </div>
            <button
              type="button"
              onClick={() => setCheckoutEnabled(!checkoutEnabled)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                checkoutEnabled ? "bg-caramel" : "bg-white/10"
              }`}
            >
              <div
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  checkoutEnabled ? "translate-x-[22px]" : "translate-x-0.5"
                }`}
              />
            </button>
          </div>

          {checkoutEnabled && (
            <CheckoutStepBuilder steps={checkoutSteps} onChange={setCheckoutSteps} eventSpots={customSpots} />
          )}
        </div>

        {/* Seating Arrangement */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            seating arrangement
          </label>
          <p className="mb-3 text-[11px] text-muted/60">sections, seats, custom spots from a floor plan, or a mix</p>
          <SeatingBuilder
            mode={seatingMode}
            sections={seatingSections}
            rows={seatRows}
            allowChoice={allowSeatChoice}
            spots={customSpots}
            floorPlanUrl={floorPlanUrl}
            analyzingFloorPlan={analyzingFloorPlan}
            onModeChange={setSeatingMode}
            onSectionsChange={setSeatingSections}
            onRowsChange={setSeatRows}
            onAllowChoiceChange={setAllowSeatChoice}
            onSpotsChange={setCustomSpots}
            onFloorPlanChange={setFloorPlanUrl}
            onAnalyzeFloorPlan={handleAnalyzeFloorPlan}
          />
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

        {/* Post-Booking Experience */}
        <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
          <label className="mb-1 block font-mono text-[10px] uppercase tracking-[2px] text-muted">
            post-booking experience
          </label>
          <p className="mb-3 text-[11px] text-muted/60">what users see after confirming their ticket</p>
          <PostBookingBuilder
            sections={postBookingSections}
            customMessage={postBookingMessage}
            showCountdown={showCountdown}
            showVenueProgress={showVenueProgress}
            showDailyQuote={showDailyQuote}
            onChange={({ sections, customMessage, showCountdown: sc, showVenueProgress: svp, showDailyQuote: sdq }) => {
              setPostBookingSections(sections);
              setPostBookingMessage(customMessage);
              setShowCountdown(sc);
              setShowVenueProgress(svp);
              setShowDailyQuote(sdq);
            }}
          />
        </div>

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
            onClick={() => setShowPreview(true)}
            className="flex-1 rounded-xl bg-white/5 py-3 font-mono text-[11px] uppercase tracking-[2px] text-cream transition-colors hover:bg-white/10"
          >
            preview
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

      {showPreview && (
        <EventPreview event={buildPreviewEvent()} onClose={() => setShowPreview(false)} />
      )}
    </div>
  );
}
