import { useState, useRef } from "react";

const C = {
  bg: "#0E0D0B", surface: "#161412", surface2: "#1E1B18", surface3: "#262220",
  border: "rgba(155,142,130,0.12)", borderLight: "rgba(155,142,130,0.06)",
  cream: "#FAF6F0", sand: "#E8DDD0",
  caramel: "#D4A574", deepCaramel: "#B8845A", terracotta: "#C4704D",
  warmBrown: "#8B6F5A", muted: "#9B8E82",
  coral: "#D4836B", sage: "#A8B5A0", lavender: "#B8A9C9", blush: "#DBBCAC",
  green: "#7A9B6F", red: "#C75050", amber: "#D4A03C",
};
const f = { serif: "'Instrument Serif', Georgia, serif", sans: "'DM Sans', sans-serif", mono: "'DM Mono', monospace" };

const EVENTS = [
  { id: 1, title: "Galentines", emoji: "\u{1F485}", tag: "women only", date: "Feb 14, 2026", status: "completed", accent: "#DBBCAC", accentDark: "#D4836B", spotsTotal: 40, spotsTaken: 40, rsvps: 40, attended: 38, noShows: 2, venueRevealed: true, venue: "The Courtyard", area: "Indiranagar", pickupPoints: [{ name: "Indiranagar Metro, Exit 2", time: "4:15 PM", capacity: 20 }, { name: "Koramangala Sony Signal", time: "4:00 PM", capacity: 20 }] },
  { id: 2, title: "No Phone House Party", emoji: "\u{1F4F5}", tag: "phone-free", date: "Mar 8, 2026", status: "upcoming", accent: "#D4A574", accentDark: "#B8845A", spotsTotal: 60, spotsTaken: 32, rsvps: 32, attended: 0, noShows: 0, venueRevealed: false, venue: "TBD", area: "", pickupPoints: [{ name: "Indiranagar Metro, Exit 2", time: "7:15 PM", capacity: 30 }, { name: "MG Road Metro, Exit 1", time: "7:00 PM", capacity: 30 }] },
  { id: 3, title: "No Color Holi", emoji: "\u{1F90D}", tag: "all white", date: "Mar 14, 2026", status: "upcoming", accent: "#A8B5A0", accentDark: "#7A9170", spotsTotal: 80, spotsTaken: 35, rsvps: 35, attended: 0, noShows: 0, venueRevealed: false, venue: "TBD", area: "", pickupPoints: [] },
  { id: 4, title: "Rooftop Cinema", emoji: "\u{1F3AC}", tag: "open bar", date: "Apr 5, 2026", status: "draft", accent: "#B8A9C9", accentDark: "#8B6F99", spotsTotal: 50, spotsTaken: 0, rsvps: 0, attended: 0, noShows: 0, venueRevealed: false, venue: "TBD", area: "", pickupPoints: [] },
];

const MEMBERS = [
  { id: 1, name: "Priya Sharma", handle: "@priya_offline", joinDate: "Jan 15", vouchedBy: null, events: 1, connections: 5, vibe: "i AM the opinion", status: "active", path: "invite" },
  { id: 2, name: "Aisha Khan", handle: "@aisha_fries", joinDate: "Jan 18", vouchedBy: "Priya", events: 1, connections: 3, vibe: "fries, no debate", status: "active", path: "vouch" },
  { id: 3, name: "Meera Nair", handle: "@meera_gel", joinDate: "Jan 20", vouchedBy: "Priya", events: 1, connections: 4, vibe: "my friends fear me", status: "active", path: "vouch" },
  { id: 4, name: "Rhea Patel", handle: "@rhea_dance", joinDate: "Jan 22", vouchedBy: null, events: 1, connections: 2, vibe: "normal human", status: "active", path: "prove" },
  { id: 5, name: "Ananya Rao", handle: "@ananya_stories", joinDate: "Feb 1", vouchedBy: "Aisha", events: 1, connections: 6, vibe: "i AM the opinion", status: "active", path: "vouch" },
  { id: 6, name: "Kavya Iyer", handle: "@kavya_karaoke", joinDate: "Feb 2", vouchedBy: "Meera", events: 1, connections: 3, vibe: "my friends fear me", status: "active", path: "vouch" },
  { id: 7, name: "Diya Menon", handle: "@diya_pizza", joinDate: "Feb 3", vouchedBy: null, events: 1, connections: 2, vibe: "i'd rather not live", status: "active", path: "prove" },
  { id: 8, name: "Isha Gupta", handle: "@isha_cry", joinDate: "Feb 4", vouchedBy: "Ananya", events: 1, connections: 5, vibe: "i AM the opinion", status: "active", path: "vouch" },
  { id: 9, name: "Tara Sen", handle: "@tara_shy", joinDate: "Feb 5", vouchedBy: null, events: 1, connections: 7, vibe: "whisper", status: "active", path: "prove" },
  { id: 10, name: "Nisha Reddy", handle: "@nisha_dj", joinDate: "Feb 6", vouchedBy: "Kavya", events: 1, connections: 4, vibe: "my friends fear me", status: "active", path: "vouch" },
];

const APPLICATIONS = [
  { id: 11, name: "Rohan M.", submitted: "Feb 10", answers: [{ q: "why do you want in?", a: "my friend priya won't shut up about it and honestly i'm jealous" }, { q: "describe your vibe", a: "chaotic good energy" }, { q: "hot take?", a: "pineapple on pizza is elite" }] },
  { id: 12, name: "Arjun K.", submitted: "Feb 11", answers: [{ q: "why do you want in?", a: "i organize events and want to see how you guys do it" }, { q: "describe your vibe", a: "professional networking person" }, { q: "hot take?", a: "linkedin is the best social platform" }] },
];

const VOUCH_CODES = [
  { code: "PRIYA-SENT-YOU", owner: "Priya", usedBy: "Aisha", status: "used" },
  { code: "PRIYA-TRUSTS-YOU", owner: "Priya", usedBy: "Meera", status: "used" },
  { code: "AISHA-VOUCHES", owner: "Aisha", usedBy: "Ananya", status: "used" },
  { code: "MEERA-SAYS-HI", owner: "Meera", usedBy: "Kavya", status: "used" },
  { code: "ANANYA-PICKS-YOU", owner: "Ananya", usedBy: "Isha", status: "used" },
  { code: "KAVYA-INVITES", owner: "Kavya", usedBy: "Nisha", status: "used" },
  { code: "VIBES-ONLY-26", owner: "Priya", usedBy: null, status: "unused" },
  { code: "TARA-TRUSTS", owner: "Tara", usedBy: null, status: "unused" },
];

function Badge({ text, color, bg }) {
  return <span style={{ padding: "3px 10px", borderRadius: "100px", fontFamily: f.mono, fontSize: "10px", fontWeight: 500, color: color || C.cream, background: bg || C.surface3, whiteSpace: "nowrap" }}>{text}</span>;
}
function StatusBadge({ status }) {
  const m = { completed: [C.sage, "completed"], upcoming: [C.caramel, "upcoming"], draft: [C.muted, "draft"], live: [C.coral, "\u25CF live"], active: [C.sage, "active"], pending: [C.amber, "pending"], attended: [C.sage, "attended"], "no-show": [C.red, "no-show"], used: [C.muted, "used"], unused: [C.sage, "unused"] };
  const [col, txt] = m[status] || m.draft;
  return <Badge text={txt} color={col} bg={col + "18"} />;
}
function Label({ children }) { return <label style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "6px" }}>{children}</label>; }
function Input(props) { return <input {...props} style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, background: C.surface2, fontFamily: f.sans, fontSize: "13px", color: C.cream, outline: "none", ...props.style }} />; }
function Textarea(props) { return <textarea {...props} style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, background: C.surface2, fontFamily: props.mono ? f.mono : f.sans, fontSize: props.mono ? "12px" : "13px", color: C.cream, outline: "none", resize: "vertical", minHeight: "80px", lineHeight: 1.6, ...props.style }} />; }
function Btn({ children, primary, small, danger, style, ...p }) {
  const base = { padding: small ? "6px 12px" : "10px 18px", borderRadius: small ? "8px" : "10px", border: "none", fontFamily: f.sans, fontSize: small ? "11px" : "13px", fontWeight: 500, cursor: "pointer", transition: "all 0.15s" };
  const v = danger ? { background: C.red + "15", color: C.red } : primary ? { background: C.cream, color: C.bg } : { background: C.surface3, color: C.cream, border: `1px solid ${C.border}` };
  return <button {...p} style={{ ...base, ...v, ...style }}>{children}</button>;
}
function Card({ title, badge, children, noPad }) {
  return (<div style={{ background: C.surface, borderRadius: "16px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
    {title && <div style={{ padding: "16px 18px", borderBottom: `1px solid ${C.borderLight}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}><span style={{ fontFamily: f.mono, fontSize: "10px", textTransform: "uppercase", letterSpacing: "1.5px", color: C.muted }}>{title}</span>{badge}</div>}
    {!noPad ? <div style={{ padding: "18px" }}>{children}</div> : children}
  </div>);
}
function StatCard({ label, value, sub, color, icon }) {
  return (<div style={{ background: C.surface, borderRadius: "14px", padding: "16px", border: `1px solid ${C.border}` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}><span style={{ fontFamily: f.mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "1.5px", color: C.muted }}>{label}</span><span style={{ fontSize: "14px" }}>{icon}</span></div>
    <div style={{ fontFamily: f.mono, fontSize: "28px", fontWeight: 500, color: color || C.cream, lineHeight: 1 }}>{value}</div>
    {sub && <div style={{ fontFamily: f.sans, fontSize: "11px", color: C.muted, marginTop: "5px" }}>{sub}</div>}
  </div>);
}
function SectionHeader({ title, sub, right }) {
  return (<div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", gap: "12px", flexWrap: "wrap" }}>
    <div><h2 style={{ fontFamily: f.serif, fontSize: "22px", fontWeight: 400, margin: "0 0 2px", color: C.cream }}>{title}</h2>{sub && <p style={{ fontFamily: f.sans, fontSize: "12px", color: C.muted, margin: 0 }}>{sub}</p>}</div>{right}
  </div>);
}

/* ═══════ EMOJI PICKER ═══════ */
const EMOJI_GROUPS = [
  { label: "events", emojis: ["\u{1F485}", "\u{1F4F5}", "\u{1F90D}", "\u{1F3AC}", "\u{1F37E}", "\u{1F389}", "\u{1F525}", "\u{1F3B6}", "\u{1F3A4}", "\u{1F57A}", "\u{1F483}", "\u{1F3A8}"] },
  { label: "food & drink", emojis: ["\u{1F35F}", "\u{1F355}", "\u{1F942}", "\u{1F378}", "\u{1F375}", "\u2615", "\u{1F943}", "\u{1F370}", "\u{1F382}", "\u{1F96C}"] },
  { label: "vibes", emojis: ["\u2728", "\u{1F30D}", "\u{1F319}", "\u2764\uFE0F", "\u{1F308}", "\u{1F31F}", "\u{1F98B}", "\u{1F331}", "\u{1F54A}\uFE0F", "\u{1F440}"] },
  { label: "activities", emojis: ["\u{1F3B2}", "\u{1F4AC}", "\u{1F6BF}", "\u{1F4F8}", "\u{1F3B5}", "\u{1F9D8}", "\u{1F3C4}", "\u{1F6B4}", "\u{1F3D5}\uFE0F", "\u{1F3A3}"] },
];

function EmojiPicker({ value, onChange }) {
  const [open, setOpen] = useState(false);
  return (<div style={{ position: "relative" }}>
    <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, background: C.surface2, cursor: "pointer" }}>
      <span style={{ fontSize: "24px", lineHeight: 1 }}>{value || "\u{1F3AF}"}</span>
      <span style={{ fontFamily: f.sans, fontSize: "13px", color: value ? C.cream : C.muted + "60" }}>{value ? "tap to change" : "pick an emoji"}</span>
    </div>
    {open && <div style={{ position: "absolute", top: "100%", left: 0, right: 0, marginTop: "6px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "14px", padding: "14px", zIndex: 200, boxShadow: "0 12px 40px rgba(0,0,0,0.5)" }}>
      {EMOJI_GROUPS.map((g) => (<div key={g.label} style={{ marginBottom: "10px" }}>
        <span style={{ fontFamily: f.mono, fontSize: "9px", textTransform: "uppercase", letterSpacing: "1px", color: C.muted, display: "block", marginBottom: "8px" }}>{g.label}</span>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "4px" }}>
          {g.emojis.map((e) => (<button key={e} onClick={() => { onChange(e); setOpen(false); }} style={{ width: "36px", height: "36px", display: "flex", alignItems: "center", justifyContent: "center", borderRadius: "8px", border: "none", background: value === e ? C.caramel + "20" : "transparent", cursor: "pointer", fontSize: "18px" }}>{e}</button>))}
        </div>
      </div>))}
    </div>}
  </div>);
}

function EmojiPickerMini({ value, onChange }) {
  const [open, setOpen] = useState(false);
  const quickEmojis = ["\u{1F4AC}", "\u{1F485}", "\u{1F942}", "\u{1F35F}", "\u{1F3B5}", "\u{1F3B2}", "\u{1F57A}", "\u{1F6BF}", "\u2615", "\u{1F943}", "\u{1F3B6}", "\u{1F3A4}", "\u2728", "\u{1F525}", "\u{1F4F8}", "\u{1F331}"];
  return (<div style={{ position: "relative" }}>
    <button onClick={() => setOpen(!open)} style={{ width: "44px", height: "44px", borderRadius: "10px", border: `1px solid ${C.border}`, background: C.surface3, cursor: "pointer", fontSize: "20px", display: "flex", alignItems: "center", justifyContent: "center" }}>{value}</button>
    {open && <div style={{ position: "absolute", top: "100%", left: 0, marginTop: "4px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: "12px", padding: "10px", zIndex: 200, width: "180px", boxShadow: "0 8px 30px rgba(0,0,0,0.5)", display: "flex", flexWrap: "wrap", gap: "2px" }}>
      {quickEmojis.map(e => (<button key={e} onClick={() => { onChange(e); setOpen(false); }} style={{ width: "32px", height: "32px", borderRadius: "6px", border: "none", background: value === e ? C.caramel + "20" : "transparent", cursor: "pointer", fontSize: "16px", display: "flex", alignItems: "center", justifyContent: "center" }}>{e}</button>))}
    </div>}
  </div>);
}

/* ═══════ ZONES BUILDER ═══════ */
function ZonesBuilder({ zones, onChange }) {
  const add = () => onChange([...zones, { icon: "\u2728", name: "", desc: "" }]);
  const remove = (i) => onChange(zones.filter((_, idx) => idx !== i));
  const update = (i, fld, val) => { const n = [...zones]; n[i] = { ...n[i], [fld]: val }; onChange(n); };
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}><Label>event zones</Label><Btn small onClick={add}>+ add zone</Btn></div>
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {zones.map((z, i) => (<div key={i} style={{ background: C.surface2, borderRadius: "12px", padding: "14px", border: `1px solid ${C.borderLight}`, display: "flex", gap: "10px", alignItems: "flex-start" }}>
        <div style={{ flexShrink: 0 }}><EmojiPickerMini value={z.icon} onChange={(v) => update(i, "icon", v)} /></div>
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
          <Input placeholder="zone name" value={z.name} onChange={e => update(i, "name", e.target.value)} style={{ padding: "8px 12px", fontWeight: 500 }} />
          <Input placeholder="short description" value={z.desc} onChange={e => update(i, "desc", e.target.value)} style={{ padding: "8px 12px", fontSize: "12px" }} />
        </div>
        <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: C.muted + "60", cursor: "pointer", fontSize: "14px", padding: "4px", flexShrink: 0 }}>{"\u2715"}</button>
      </div>))}
      {zones.length === 0 && <div style={{ border: `1.5px dashed ${C.border}`, borderRadius: "12px", padding: "24px", textAlign: "center" }}><span style={{ fontSize: "20px", display: "block", marginBottom: "6px" }}>{"\u{1F3AF}"}</span><p style={{ fontFamily: f.sans, fontSize: "12px", color: C.muted, margin: 0 }}>no zones yet — add activity areas</p></div>}
    </div>
  </div>);
}

/* ═══════ PICKUP POINTS BUILDER ═══════ */
function PickupPointsBuilder({ points, onChange }) {
  const add = () => onChange([...points, { name: "", time: "", capacity: "" }]);
  const remove = (i) => onChange(points.filter((_, idx) => idx !== i));
  const update = (i, fld, val) => { const n = [...points]; n[i] = { ...n[i], [fld]: val }; onChange(n); };
  return (<div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}><Label>pickup points</Label><Btn small onClick={add}>+ add point</Btn></div>
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {points.map((p, i) => (<div key={i} style={{ background: C.surface2, borderRadius: "12px", padding: "14px", border: `1px solid ${C.borderLight}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
          <span style={{ fontFamily: f.mono, fontSize: "10px", color: C.caramel }}>pickup #{i + 1}</span>
          <button onClick={() => remove(i)} style={{ background: "none", border: "none", color: C.muted + "60", cursor: "pointer", fontFamily: f.mono, fontSize: "10px" }}>{"\u2715"} remove</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <Input placeholder="Location (e.g. Indiranagar Metro, Exit 2)" value={p.name} onChange={e => update(i, "name", e.target.value)} />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            <Input placeholder="Pickup time" value={p.time} onChange={e => update(i, "time", e.target.value)} />
            <Input type="number" placeholder="Capacity" value={p.capacity} onChange={e => update(i, "capacity", e.target.value)} />
          </div>
        </div>
      </div>))}
      {points.length === 0 && <div style={{ border: `1.5px dashed ${C.border}`, borderRadius: "12px", padding: "24px", textAlign: "center" }}><span style={{ fontSize: "20px", display: "block", marginBottom: "6px" }}>{"\u{1F698}"}</span><p style={{ fontFamily: f.sans, fontSize: "12px", color: C.muted, margin: "0 0 2px" }}>no pickup points yet</p><p style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted + "60", margin: 0 }}>users assigned to nearest point</p></div>}
    </div>
  </div>);
}

/* ═══════ DASHBOARD ═══════ */
function Dashboard() {
  return (<div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
      <StatCard label="members" value="10" sub="+2 pending" icon={"\u{1F465}"} />
      <StatCard label="upcoming" value="2" sub="next: Mar 8" color={C.caramel} icon={"\u{1F4CB}"} />
      <StatCard label="connections" value="20" sub="all events" color={C.sage} icon={"\u{1F91D}"} />
      <StatCard label="vouch codes" value="2" sub="6 used" color={C.lavender} icon={"\u{1F39F}\uFE0F"} />
    </div>
    <Card title="last event" badge={<Badge text="galentines" color={C.blush} bg={C.blush + "15"} />}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "16px" }}>
        {[{ n: "38/40", l: "attended", c: C.sage }, { n: "95%", l: "show rate", c: C.cream }, { n: "68%", l: "connected", c: C.caramel }].map((s, i) => (
          <div key={i} style={{ textAlign: "center", background: C.surface2, borderRadius: "10px", padding: "14px 8px" }}>
            <div style={{ fontFamily: f.mono, fontSize: "20px", fontWeight: 500, color: s.c }}>{s.n}</div>
            <div style={{ fontFamily: f.sans, fontSize: "10px", color: C.muted, marginTop: "4px" }}>{s.l}</div>
          </div>))}
      </div>
      <div style={{ background: C.surface2, borderRadius: "10px", padding: "12px" }}>
        <span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, textTransform: "uppercase", letterSpacing: "1px", display: "block", marginBottom: "10px" }}>vouch chain</span>
        <div style={{ fontFamily: f.mono, fontSize: "11px", color: C.muted, lineHeight: 2 }}><span style={{ color: C.caramel }}>Priya</span> {"\u2192"} Aisha {"\u2192"} Ananya {"\u2192"} Isha<br /><span style={{ color: C.caramel }}>Priya</span> {"\u2192"} Meera {"\u2192"} Kavya {"\u2192"} Nisha</div>
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "10px", paddingTop: "10px", borderTop: `1px solid ${C.borderLight}` }}><span style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted }}>max depth</span><span style={{ fontFamily: f.mono, fontSize: "10px", color: C.caramel }}>3 levels</span></div>
      </div>
    </Card>
    <div style={{ marginTop: "16px" }}><Card title="upcoming events" noPad>
      {EVENTS.filter(e => e.status !== "completed").map((ev, i, arr) => (<div key={ev.id} style={{ padding: "14px 18px", borderBottom: i < arr.length - 1 ? `1px solid ${C.borderLight}` : "none", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "20px" }}>{ev.emoji}</span><div><div style={{ fontFamily: f.sans, fontSize: "13px", fontWeight: 500 }}>{ev.title}</div><div style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted }}>{ev.date}</div></div></div>
        <div style={{ textAlign: "right" }}><div style={{ fontFamily: f.mono, fontSize: "12px", marginBottom: "4px" }}>{ev.spotsTaken}/{ev.spotsTotal}</div><div style={{ width: "60px", height: "3px", background: C.surface3, borderRadius: "2px", overflow: "hidden" }}><div style={{ width: `${(ev.spotsTaken / ev.spotsTotal) * 100}%`, height: "100%", background: ev.accent, borderRadius: "2px" }} /></div></div>
      </div>))}
    </Card></div>
  </div>);
}

/* ═══════ EVENTS PAGE ═══════ */
function EventsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [eventEmoji, setEventEmoji] = useState("");
  const [zones, setZones] = useState([{ icon: "\u{1F4AC}", name: "yapping room", desc: "bring your loudest opinions" }, { icon: "\u{1F485}", name: "nails & pampering", desc: "gel, matte, french \u2014 you pick" }]);
  const [pickupPoints, setPickupPoints] = useState([{ name: "Indiranagar Metro, Exit 2", time: "4:15 PM", capacity: "20" }]);
  const [accentP, setAccentP] = useState("#D4A574");
  const [accentD, setAccentD] = useState("#B8845A");
  return (<div>
    <SectionHeader title="Events" sub={`${EVENTS.length} total`} right={<Btn primary onClick={() => setShowCreate(!showCreate)}>{showCreate ? "Cancel" : "+ Create"}</Btn>} />
    {showCreate && <Card title="new event" badge={<span style={{ fontFamily: f.mono, fontSize: "10px", color: C.caramel }}>draft</span>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div><Label>title</Label><Input placeholder="Event name" /></div>
        <div><Label>tagline</Label><Input placeholder="Short italic subtitle" /></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}><div><Label>date</Label><Input type="date" /></div><div><Label>time</Label><Input placeholder="8:00 PM onwards" /></div></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}><div><Label>capacity</Label><Input type="number" placeholder="60" /></div><div><Label>tag</Label><Input placeholder="phone-free" /></div></div>
        <div><Label>event emoji</Label><EmojiPicker value={eventEmoji} onChange={setEventEmoji} /></div>
        <div><Label>description</Label><Textarea placeholder="Full event description..." /></div>
        <div><Label>dress code</Label><Input placeholder="house party chic" /></div>
        <div style={{ background: C.surface2, borderRadius: "12px", padding: "14px" }}>
          <Label>accent colors</Label>
          <p style={{ fontFamily: f.sans, fontSize: "11px", color: C.muted + "80", margin: "0 0 12px" }}>card gradients, badges, buttons</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div><span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, display: "block", marginBottom: "4px" }}>primary</span><div style={{ display: "flex", gap: "8px" }}><input type="color" value={accentP} onChange={e => setAccentP(e.target.value)} style={{ width: "40px", height: "40px", borderRadius: "8px", border: `1px solid ${C.border}`, background: "none", cursor: "pointer", padding: 0 }} /><Input value={accentP} onChange={e => setAccentP(e.target.value)} style={{ fontFamily: f.mono, fontSize: "12px" }} /></div></div>
            <div><span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, display: "block", marginBottom: "4px" }}>dark</span><div style={{ display: "flex", gap: "8px" }}><input type="color" value={accentD} onChange={e => setAccentD(e.target.value)} style={{ width: "40px", height: "40px", borderRadius: "8px", border: `1px solid ${C.border}`, background: "none", cursor: "pointer", padding: 0 }} /><Input value={accentD} onChange={e => setAccentD(e.target.value)} style={{ fontFamily: f.mono, fontSize: "12px" }} /></div></div>
          </div>
          <div style={{ marginTop: "10px", height: "6px", borderRadius: "3px", background: `linear-gradient(90deg, ${accentP}, ${accentD})` }} />
        </div>
        <div><Label>what's included</Label><Textarea mono placeholder={"pickup & drop from metro\nunlimited food & drinks\nnail bar + pampering zone\npolaroid wall"} /><p style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted + "60", margin: "6px 0 0" }}>one item per line</p></div>
        <ZonesBuilder zones={zones} onChange={setZones} />
        <div style={{ background: C.surface2, borderRadius: "12px", padding: "14px" }}>
          <Label>venue details</Label>
          <p style={{ fontFamily: f.sans, fontSize: "11px", color: C.muted + "80", margin: "0 0 12px" }}>hidden until reveal date</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}><div><span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, display: "block", marginBottom: "4px" }}>venue name</span><Input placeholder="The Courtyard" /></div><div><span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, display: "block", marginBottom: "4px" }}>area</span><Input placeholder="Indiranagar, Bangalore" /></div></div>
            <div><span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, display: "block", marginBottom: "4px" }}>full address</span><Input placeholder="123, 12th Main, Indiranagar" /></div>
            <div><span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, display: "block", marginBottom: "4px" }}>venue reveal date</span><Input type="date" /></div>
          </div>
        </div>
        <PickupPointsBuilder points={pickupPoints} onChange={setPickupPoints} />
        <div style={{ display: "flex", gap: "10px", paddingTop: "8px" }}><Btn style={{ flex: 1 }} onClick={() => setShowCreate(false)}>Cancel</Btn><Btn style={{ flex: 1 }}>Draft</Btn><Btn primary style={{ flex: 1 }}>Publish</Btn></div>
      </div>
    </Card>}
    <div style={{ marginTop: showCreate ? "16px" : 0, display: "flex", flexDirection: "column", gap: "10px" }}>
      {EVENTS.map((ev) => (<div key={ev.id} style={{ background: C.surface, borderRadius: "14px", border: `1px solid ${C.border}`, overflow: "hidden" }}>
        <div style={{ height: "3px", background: `linear-gradient(90deg, ${ev.accent}, ${ev.accentDark})` }} />
        <div style={{ padding: "16px 18px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontSize: "24px" }}>{ev.emoji}</span><div><div style={{ fontFamily: f.sans, fontSize: "14px", fontWeight: 500 }}>{ev.title}</div><div style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted }}>{ev.tag} \u00B7 {ev.date}</div></div></div>
            <StatusBadge status={ev.status} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px", marginBottom: "12px" }}>
            {[{ v: `${ev.rsvps}/${ev.spotsTotal}`, l: "rsvps" }, { v: ev.attended || "\u2014", l: "attended", c: ev.attended > 0 ? C.sage : C.muted }, { v: ev.noShows || "\u2014", l: "no-shows", c: ev.noShows > 0 ? C.red : C.muted }].map((s, i) => (
              <div key={i} style={{ background: C.surface2, borderRadius: "8px", padding: "10px", textAlign: "center" }}><div style={{ fontFamily: f.mono, fontSize: "16px", fontWeight: 500, color: s.c || C.cream }}>{s.v}</div><div style={{ fontFamily: f.sans, fontSize: "9px", color: C.muted }}>{s.l}</div></div>))}
          </div>
          {ev.pickupPoints.length > 0 && <div style={{ marginBottom: "12px" }}>
            <span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, textTransform: "uppercase", letterSpacing: "1px" }}>pickup points</span>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px", marginTop: "6px" }}>
              {ev.pickupPoints.map((p, i) => (<div key={i} style={{ display: "flex", justifyContent: "space-between", fontFamily: f.mono, fontSize: "11px", color: C.cream, padding: "6px 10px", background: C.surface2, borderRadius: "6px" }}><span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span><span style={{ color: C.muted, flexShrink: 0, marginLeft: "8px" }}>{p.time} \u00B7 {p.capacity}pax</span></div>))}
            </div>
          </div>}
          <div style={{ display: "flex", gap: "8px" }}><Btn small style={{ flex: 1 }}>Edit</Btn>{ev.status === "upcoming" && <Btn small style={{ flex: 1, background: C.caramel + "15", color: C.caramel, border: "none" }}>RSVPs</Btn>}{ev.status === "completed" && <Btn small style={{ flex: 1, background: C.lavender + "15", color: C.lavender, border: "none" }}>Memories</Btn>}</div>
        </div>
      </div>))}
    </div>
  </div>);
}

/* ═══════ MEMBERS PAGE ═══════ */
function MembersPage() {
  const [search, setSearch] = useState("");
  const filtered = MEMBERS.filter(m => m.name.toLowerCase().includes(search.toLowerCase()) || m.handle.toLowerCase().includes(search.toLowerCase()));
  return (<div>
    <SectionHeader title="Members" sub={`${MEMBERS.length} total`} />
    <div style={{ marginBottom: "16px" }}><Input placeholder="search members..." value={search} onChange={e => setSearch(e.target.value)} /></div>
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {filtered.map((m) => (<div key={m.id} style={{ background: C.surface, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "14px 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
          <div><div style={{ fontFamily: f.sans, fontSize: "14px", fontWeight: 500 }}>{m.name}</div><div style={{ fontFamily: f.mono, fontSize: "11px", color: C.muted }}>{m.handle}</div></div>
          <Badge text={m.path} color={(m.path === "vouch" ? C.caramel : m.path === "prove" ? C.lavender : C.sage)} bg={(m.path === "vouch" ? C.caramel : m.path === "prove" ? C.lavender : C.sage) + "15"} />
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted }}>{m.events} events</span>
          <span style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted }}>{m.connections} conn</span>
          {m.vouchedBy && <span style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted }}>via {m.vouchedBy}</span>}
          <span style={{ fontFamily: "'Caveat', cursive", fontSize: "13px", color: C.caramel, marginLeft: "auto" }}>{m.vibe}</span>
        </div>
      </div>))}
    </div>
  </div>);
}

/* ═══════ APPLICATIONS PAGE ═══════ */
function ApplicationsPage() {
  const [expanded, setExpanded] = useState(null);
  return (<div>
    <SectionHeader title="Applications" sub={`${APPLICATIONS.length} pending`} />
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {APPLICATIONS.map((app) => (<Card key={app.id} noPad>
        <div style={{ padding: "16px 18px", display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "pointer" }} onClick={() => setExpanded(expanded === app.id ? null : app.id)}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: C.amber + "15", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px" }}>{"\u{1F4E5}"}</div>
            <div><div style={{ fontSize: "13px", fontWeight: 500 }}>{app.name}</div><div style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted }}>{app.submitted}</div></div>
          </div>
          <span style={{ color: C.muted, fontSize: "12px", transform: expanded === app.id ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}>{"\u25BC"}</span>
        </div>
        {expanded === app.id && <div style={{ padding: "0 18px 18px", borderTop: `1px solid ${C.borderLight}`, paddingTop: "16px" }}>
          {app.answers.map((a, i) => (<div key={i} style={{ marginBottom: i < app.answers.length - 1 ? "14px" : 0 }}><p style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted, margin: "0 0 3px", textTransform: "uppercase" }}>{a.q}</p><p style={{ fontFamily: "'Caveat', cursive", fontSize: "17px", color: C.cream, margin: 0 }}>{a.a}</p></div>))}
          <div style={{ display: "flex", gap: "8px", marginTop: "18px", paddingTop: "14px", borderTop: `1px solid ${C.borderLight}` }}>
            <Btn style={{ flex: 1, background: C.sage + "15", color: C.sage, border: "none" }}>{"\u2713"} Approve</Btn>
            <Btn danger style={{ flex: 1 }}>{"\u2715"} Reject</Btn>
          </div>
        </div>}
      </Card>))}
    </div>
  </div>);
}

/* ═══════ VOUCHES PAGE ═══════ */
function VouchesPage() {
  return (<div>
    <SectionHeader title="Vouch Codes" sub={`${VOUCH_CODES.length} total`} right={<Btn primary>+ Generate</Btn>} />
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {VOUCH_CODES.map((v, i) => (<div key={i} style={{ background: C.surface, borderRadius: "12px", border: `1px solid ${C.border}`, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontFamily: f.mono, fontSize: "13px", color: C.caramel, letterSpacing: "0.5px" }}>{v.code}</div><div style={{ fontFamily: f.sans, fontSize: "11px", color: C.muted, marginTop: "3px" }}>{v.owner} {v.usedBy ? `\u2192 ${v.usedBy}` : ""}</div></div>
        <StatusBadge status={v.status} />
      </div>))}
    </div>
  </div>);
}

/* ═══════ CONTENT PAGE ═══════ */
function ContentPage() {
  return (<div>
    <SectionHeader title="Content" sub="memories & notifications" />
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <Card title="upload polaroids">
        <div style={{ border: `2px dashed ${C.border}`, borderRadius: "14px", padding: "32px 20px", textAlign: "center", marginBottom: "12px" }}><span style={{ fontSize: "24px", display: "block", marginBottom: "8px" }}>{"\u{1F4F8}"}</span><p style={{ fontFamily: f.sans, fontSize: "12px", color: C.muted, margin: "0 0 3px" }}>drop photos or tap to upload</p></div>
        <Label>for event</Label>
        <select style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, background: C.surface2, fontFamily: f.sans, fontSize: "13px", color: C.cream, appearance: "none" }}><option>Galentines (Feb 14)</option><option>House Party (Mar 8)</option></select>
      </Card>
      <Card title="overheard quotes">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "12px" }}><Input placeholder={'"i haven\u2019t laughed this hard since 2019"'} /><Input placeholder="yapping room, 7:42 PM" /><Btn style={{ width: "100%" }}>+ Add Quote</Btn></div>
        {[{ q: "i haven't laughed this hard since 2019", c: "yapping room, 7:42 PM" }, { q: "wait, is this what parties used to feel like?", c: "dance floor, 9:15 PM" }].map((q, i) => (<div key={i} style={{ padding: "10px 0", borderTop: `1px solid ${C.borderLight}` }}><p style={{ fontFamily: f.serif, fontSize: "12px", color: C.cream, margin: "0 0 2px", fontStyle: "italic" }}>"{q.q}"</p><p style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted, margin: 0 }}>{q.c}</p></div>))}
      </Card>
      <Card title="event stats">
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}><div><Label>attended</Label><Input type="number" placeholder="38" /></div><div><Label>phones</Label><Input type="number" placeholder="0" /></div><div><Label>drinks</Label><Input type="number" placeholder="127" /></div><div><Label>hours</Label><Input placeholder="6hrs" /></div></div>
        <Btn primary style={{ width: "100%" }}>Save</Btn>
      </Card>
      <Card title="push notification">
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div><Label>audience</Label><select style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, background: C.surface2, fontFamily: f.sans, fontSize: "13px", color: C.cream, appearance: "none" }}><option>All members</option><option>Galentines RSVPs</option><option>No RSVP yet</option></select></div>
          <div><Label>message</Label><Textarea placeholder="your venue is here. scratch to reveal." /></div>
          <div style={{ display: "flex", gap: "8px" }}><Btn style={{ flex: 1 }}>Schedule</Btn><Btn primary style={{ flex: 1 }}>Send Now</Btn></div>
        </div>
      </Card>
    </div>
  </div>);
}

/* ═══════ SETTINGS PAGE ═══════ */
function SettingsPage() {
  return (<div>
    <SectionHeader title="Settings" />
    <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
      <Card title="chatbot prompt"><Textarea mono style={{ minHeight: "140px" }} defaultValue={`You are the chatbot for "Come Offline".\nPERSONALITY: Witty gen-z friend, cheeky but warm.\nKeep responses to 2-4 sentences.`} /><Btn primary style={{ width: "100%", marginTop: "12px" }}>Update</Btn></Card>
      <Card title="vouch settings">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div><Label>codes per first event</Label><Input type="number" defaultValue="2" /></div>
          <div><Label>codes per repeat</Label><Input type="number" defaultValue="1" /></div>
          <div><Label>reconnect window (hrs)</Label><Input type="number" defaultValue="48" /></div>
          <div><Label>no-show penalty</Label><select style={{ width: "100%", padding: "11px 14px", borderRadius: "10px", border: `1px solid ${C.border}`, background: C.surface2, fontFamily: f.sans, fontSize: "13px", color: C.cream, appearance: "none" }}><option>No vouch codes next event</option><option>Warning only</option><option>Suspension</option></select></div>
        </div>
      </Card>
      <Card title="auto notifications">
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {[["venue_revealed", "your venue is here. scratch to reveal.", "On reveal date"], ["event_tomorrow", "tomorrow. you ready?", "24hr before"], ["event_today", "today's the day.", "Morning of"], ["morning_after", "last night happened.", "Morning after"], ["reconnect_closing", "12 hours left to connect.", "36hr after"], ["spots_low", "only [n] spots left.", "< 10 spots"]].map(([t, m, w], i) => (
            <div key={i} style={{ background: C.surface2, borderRadius: "10px", padding: "12px 14px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "3px" }}><span style={{ fontFamily: f.mono, fontSize: "10px", color: C.caramel }}>{t}</span><span style={{ fontFamily: f.mono, fontSize: "9px", color: C.muted }}>{w}</span></div>
              <p style={{ fontFamily: f.sans, fontSize: "12px", color: C.cream + "cc", margin: 0 }}>{m}</p>
            </div>))}
        </div>
      </Card>
    </div>
  </div>);
}

/* ═══════ MAIN APP ═══════ */
export default function App() {
  const [page, setPage] = useState("dashboard");
  const scrollRef = useRef(null);
  const navItems = [
    { id: "dashboard", icon: "\u{1F4CA}", label: "home" },
    { id: "events", icon: "\u{1F4CB}", label: "events" },
    { id: "members", icon: "\u{1F465}", label: "members" },
    { id: "applications", icon: "\u{1F4E5}", label: "apps", badge: APPLICATIONS.length },
    { id: "vouches", icon: "\u{1F39F}\uFE0F", label: "vouches" },
    { id: "content", icon: "\u{1F4F8}", label: "content" },
    { id: "settings", icon: "\u2699\uFE0F", label: "config" },
  ];
  return (
    <div style={{ fontFamily: f.sans, background: C.bg, color: C.cream, minHeight: "100vh", maxWidth: "430px", margin: "0 auto", position: "relative" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;500;600;700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&family=Instrument+Serif:ital@0;1&display=swap');
        * { box-sizing: border-box; -webkit-font-smoothing: antialiased; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${C.surface3}; border-radius: 2px; }
        input::placeholder, textarea::placeholder { color: ${C.muted}60; }
      `}</style>
      <div style={{ position: "sticky", top: 0, zIndex: 100, background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><h1 style={{ fontFamily: f.serif, fontSize: "18px", fontWeight: 400, margin: 0 }}>come offline</h1><span style={{ fontFamily: f.mono, fontSize: "8px", color: C.muted, letterSpacing: "1.5px", textTransform: "uppercase" }}>ops dashboard</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}><span style={{ fontFamily: f.mono, fontSize: "10px", color: C.muted }}>Feb 13</span><div style={{ width: "7px", height: "7px", borderRadius: "50%", background: C.sage, boxShadow: `0 0 6px ${C.sage}` }} /></div>
      </div>
      <div ref={scrollRef} style={{ padding: "18px 16px", paddingBottom: "100px" }}>
        {page === "dashboard" && <Dashboard />}
        {page === "events" && <EventsPage />}
        {page === "members" && <MembersPage />}
        {page === "applications" && <ApplicationsPage />}
        {page === "vouches" && <VouchesPage />}
        {page === "content" && <ContentPage />}
        {page === "settings" && <SettingsPage />}
      </div>
      <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: "430px", background: C.surface, borderTop: `1px solid ${C.border}`, zIndex: 100 }}>
        <div style={{ display: "flex", padding: "8px 4px 28px", gap: "0", justifyContent: "space-evenly" }}>
          {navItems.map((item) => (<button key={item.id} onClick={() => { setPage(item.id); scrollRef.current?.scrollTo(0, 0); }}
            style={{ flex: "1 1 0", minWidth: 0, padding: "6px 2px", background: "none", border: "none", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "3px", position: "relative" }}>
            <span style={{ fontSize: "16px", filter: page === item.id ? "none" : "grayscale(0.5) opacity(0.5)" }}>{item.icon}</span>
            <span style={{ fontFamily: f.mono, fontSize: "8px", color: page === item.id ? C.cream : C.muted + "60", fontWeight: page === item.id ? 500 : 400 }}>{item.label}</span>
            {item.badge > 0 && <div style={{ position: "absolute", top: "2px", right: "4px", width: "14px", height: "14px", borderRadius: "50%", background: C.amber, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: f.mono, fontSize: "8px", color: C.bg, fontWeight: 700 }}>{item.badge}</div>}
            {page === item.id && <div style={{ width: "16px", height: "2px", borderRadius: "1px", background: C.caramel, marginTop: "1px" }} />}
          </button>))}
        </div>
      </div>
    </div>
  );
}
