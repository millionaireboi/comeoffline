"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@comeoffline/ui";
import { useAuth } from "@/hooks/useAuth";
import { API_URL, MEMBER_STATUS_COLORS } from "@/lib/constants";
import { TableRowSkeleton } from "@/components/Skeleton";

interface Member {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
  entry_path: string;
  status: string;
  vouched_by?: string;
  created_at: string;
}

interface MemberProfile {
  user: {
    id: string;
    name: string;
    handle: string;
    vibe_tag: string;
    instagram_handle?: string;
    invite_code_used: string;
    entry_path: string;
    status: string;
    avatar_url?: string;
    area?: string;
    age_range?: string;
    hot_take?: string;
    email?: string;
    phone_number?: string;
    drink_of_choice?: string;
    referral_source?: string;
    bio?: string;
    gender?: string;
    interests?: string[];
    community_intent?: string;
    created_at: string;
    vouched_by?: string;
    events_attended?: number;
  };
  stats: {
    events_attended: number;
    connections_made: number;
    vouch_codes_earned: number;
    vouch_codes_used: number;
  };
  event_history: Array<{
    event_id: string;
    title: string;
    emoji: string;
    date: string;
    status: string;
  }>;
  badges: Array<{
    id: string;
    name: string;
    emoji: string;
    earned_at: string;
  }>;
}

interface AdminNote {
  id: string;
  user_id: string;
  note: string;
  created_by: string;
  created_at: string;
}

const ENTRY_LABELS: Record<string, string> = {
  invite: "invite code",
  vouch: "vouch code",
  chatbot: "chatbot",
  prove: "proved",
};

export function MembersTab() {
  const { getIdToken } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Drawer state
  const [drawerMemberId, setDrawerMemberId] = useState<string | null>(null);
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [notes, setNotes] = useState<AdminNote[]>([]);
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function fetchMembers() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await fetch(`${API_URL}/api/admin/members`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.data) setMembers(data.data);
      } catch (err) {
        console.error("Failed to fetch members:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchMembers();
  }, [getIdToken]);

  const openDrawer = useCallback(async (memberId: string) => {
    setDrawerMemberId(memberId);
    setProfileLoading(true);
    setProfile(null);
    setNotes([]);
    setNewNote("");
    setDeleteConfirm(false);

    try {
      const token = await getIdToken();
      if (!token) return;

      const [profileRes, notesRes] = await Promise.all([
        fetch(`${API_URL}/api/admin/members/${memberId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_URL}/api/admin/members/${memberId}/notes`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      const profileData = await profileRes.json();
      const notesData = await notesRes.json();

      if (profileData.success && profileData.data) setProfile(profileData.data);
      if (notesData.success && notesData.data) setNotes(notesData.data);
    } catch (err) {
      console.error("Failed to fetch profile:", err);
    } finally {
      setProfileLoading(false);
    }
  }, [getIdToken]);

  const closeDrawer = useCallback(() => {
    setDrawerMemberId(null);
    setProfile(null);
    setNotes([]);
  }, []);

  const handleStatusChange = useCallback(async (newStatus: string) => {
    if (!drawerMemberId || !profile) return;
    setStatusUpdating(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/members/${drawerMemberId}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setProfile({ ...profile, user: { ...profile.user, status: newStatus } });
        setMembers((prev) =>
          prev.map((m) => (m.id === drawerMemberId ? { ...m, status: newStatus } : m))
        );
      }
    } catch (err) {
      console.error("Failed to update status:", err);
    } finally {
      setStatusUpdating(false);
    }
  }, [drawerMemberId, profile, getIdToken]);

  const handleAddNote = useCallback(async () => {
    if (!drawerMemberId || !newNote.trim()) return;
    setAddingNote(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/members/${drawerMemberId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ note: newNote.trim() }),
      });
      const data = await res.json();
      if (data.success && data.data) {
        setNotes((prev) => [data.data, ...prev]);
        setNewNote("");
      }
    } catch (err) {
      console.error("Failed to add note:", err);
    } finally {
      setAddingNote(false);
    }
  }, [drawerMemberId, newNote, getIdToken]);

  const handleDelete = useCallback(async () => {
    if (!drawerMemberId) return;
    setDeleting(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const res = await fetch(`${API_URL}/api/admin/members/${drawerMemberId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setMembers((prev) => prev.filter((m) => m.id !== drawerMemberId));
        closeDrawer();
      } else {
        alert(data.error || "Failed to delete member");
      }
    } catch (err) {
      console.error("Failed to delete member:", err);
      alert("Failed to delete member");
    } finally {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  }, [drawerMemberId, getIdToken, closeDrawer]);

  const filtered = members.filter((m) => {
    if (statusFilter !== "all" && m.status !== statusFilter) return false;
    if (search) {
      return (
        m.name.toLowerCase().includes(search.toLowerCase()) ||
        m.handle.toLowerCase().includes(search.toLowerCase())
      );
    }
    return true;
  });

  const totalActive = members.filter((m) => m.status === "active").length;
  const totalProvisional = members.filter((m) => m.status === "provisional").length;

  return (
    <>
      <div className="max-w-4xl space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">total</p>
            <p className="mt-1 font-mono text-2xl text-cream">{members.length}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">active</p>
            <p className="mt-1 font-mono text-2xl text-cream">{totalActive}</p>
          </div>
          <div className="rounded-xl border border-white/5 bg-white/[0.02] p-4">
            <p className="font-mono text-[10px] uppercase tracking-[2px] text-muted">provisional</p>
            <p className="mt-1 font-mono text-2xl text-cream">{totalProvisional}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-3">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search members..."
            className="flex-1 rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none"
          >
            <option value="all">all</option>
            <option value="active">active</option>
            <option value="provisional">provisional</option>
            <option value="inactive">inactive</option>
          </select>
        </div>

        <p className="font-mono text-[10px] text-muted">
          {filtered.length} member{filtered.length !== 1 ? "s" : ""}
        </p>

        {/* Members list */}
        {loading ? (
          <div className="space-y-1">{Array.from({ length: 5 }).map((_, i) => <TableRowSkeleton key={i} columns={3} />)}</div>
        ) : (
          <div className="space-y-2">
            {filtered.map((member) => (
              <div
                key={member.id}
                onClick={() => openDrawer(member.id)}
                className="flex cursor-pointer items-center justify-between rounded-xl border border-white/5 bg-white/[0.02] p-4 transition-colors hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-10 w-10 items-center justify-center rounded-full font-serif text-sm text-white"
                    style={{ background: MEMBER_STATUS_COLORS[member.status] || "#9B8E82" }}
                  >
                    {member.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-sans text-sm font-medium text-cream">{member.name}</p>
                    <p className="font-mono text-[10px] text-muted">
                      @{member.handle} &middot; {member.vibe_tag}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span
                      className="rounded-full px-2 py-0.5 font-mono text-[9px] uppercase"
                      style={{
                        color: MEMBER_STATUS_COLORS[member.status] || "#9B8E82",
                        background: (MEMBER_STATUS_COLORS[member.status] || "#9B8E82") + "15",
                      }}
                    >
                      {member.status}
                    </span>
                    <p className="mt-1 font-mono text-[9px] text-muted/50">
                      via {ENTRY_LABELS[member.entry_path] || member.entry_path}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Slide-out drawer */}
      {drawerMemberId && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Drawer */}
          <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-white/5 bg-gate-black shadow-2xl">
            {/* Drawer header */}
            <div className="flex items-center justify-between border-b border-white/5 px-6 py-4">
              <h3 className="font-mono text-[11px] uppercase tracking-[2px] text-cream">member profile</h3>
              <button
                onClick={closeDrawer}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition-colors hover:bg-white/5 hover:text-cream"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Drawer body */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {profileLoading ? (
                <p className="py-12 text-center font-mono text-[11px] text-muted">loading profile...</p>
              ) : !profile ? (
                <p className="py-12 text-center font-mono text-[11px] text-muted">failed to load profile</p>
              ) : (
                <div className="space-y-6">
                  {/* Identity */}
                  <div className="flex items-start gap-4">
                    {profile.user.avatar_url ? (
                      <img
                        src={profile.user.avatar_url}
                        alt={profile.user.name}
                        className="h-16 w-16 rounded-full object-cover border border-white/10"
                      />
                    ) : (
                      <div
                        className="flex h-16 w-16 items-center justify-center rounded-full font-serif text-xl text-white"
                        style={{ background: MEMBER_STATUS_COLORS[profile.user.status] || "#9B8E82" }}
                      >
                        {profile.user.name.charAt(0)}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-sans text-lg font-medium text-cream">{profile.user.name}</p>
                      <p className="font-mono text-[11px] text-muted">@{profile.user.handle}</p>
                      {profile.user.vibe_tag && (
                        <p className="mt-1 font-mono text-[11px] text-caramel">{profile.user.vibe_tag}</p>
                      )}
                    </div>
                  </div>

                  {/* Hot take */}
                  {profile.user.hot_take && (
                    <div className="rounded-lg bg-white/[0.03] px-4 py-3">
                      <p className="font-mono text-[10px] text-cream/70 italic">
                        &ldquo;{profile.user.hot_take}&rdquo;
                      </p>
                    </div>
                  )}

                  {/* Stats grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                      <p className="font-mono text-xl text-cream">{profile.stats.events_attended}</p>
                      <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">events</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                      <p className="font-mono text-xl text-cream">{profile.stats.connections_made}</p>
                      <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">connections</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                      <p className="font-mono text-xl text-cream">{profile.stats.vouch_codes_earned}</p>
                      <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">codes earned</p>
                    </div>
                    <div className="rounded-lg bg-white/[0.03] p-3 text-center">
                      <p className="font-mono text-xl text-cream">{profile.stats.vouch_codes_used}</p>
                      <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">codes used</p>
                    </div>
                  </div>

                  {/* Details */}
                  <div>
                    <p className="mb-3 font-mono text-[9px] uppercase tracking-[1px] text-muted">details</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                      {profile.user.email && (
                        <div className="col-span-2">
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">email</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.email}</p>
                        </div>
                      )}
                      {profile.user.phone_number && (
                        <div className="col-span-2">
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">phone</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.phone_number}</p>
                        </div>
                      )}
                      {profile.user.instagram_handle && (
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">instagram</p>
                          <p className="font-mono text-[11px] text-cream">@{profile.user.instagram_handle}</p>
                        </div>
                      )}
                      {profile.user.area && (
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">area</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.area}</p>
                        </div>
                      )}
                      {profile.user.age_range && (
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">age</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.age_range}</p>
                        </div>
                      )}
                      {profile.user.drink_of_choice && (
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">drink</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.drink_of_choice}</p>
                        </div>
                      )}
                      {profile.user.referral_source && (
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">source</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.referral_source}</p>
                        </div>
                      )}
                      {profile.user.gender && (
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">gender</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.gender}</p>
                        </div>
                      )}
                      {profile.user.community_intent && (
                        <div className="col-span-2">
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">community intent</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.community_intent}</p>
                        </div>
                      )}
                      {profile.user.bio && (
                        <div className="col-span-2">
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">bio</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.bio}</p>
                        </div>
                      )}
                      {profile.user.interests && profile.user.interests.length > 0 && (
                        <div className="col-span-2">
                          <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">interests</p>
                          <p className="font-mono text-[11px] text-cream">{profile.user.interests.join(", ")}</p>
                        </div>
                      )}
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">joined</p>
                        <p className="font-mono text-[11px] text-cream">
                          {new Date(profile.user.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">entry</p>
                        <p className="font-mono text-[11px] text-cream">
                          {ENTRY_LABELS[profile.user.entry_path] || profile.user.entry_path}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[1px] text-muted">code used</p>
                        <p className="font-mono text-[11px] text-cream">
                          {profile.user.invite_code_used || "none"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Badges */}
                  {profile.badges.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[9px] uppercase tracking-[1px] text-muted">badges</p>
                      <div className="flex flex-wrap gap-2">
                        {profile.badges.map((badge) => (
                          <span
                            key={badge.id}
                            className="rounded-full bg-white/5 px-2.5 py-1 font-mono text-[10px] text-cream"
                          >
                            {badge.emoji} {badge.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Event history */}
                  {profile.event_history.length > 0 && (
                    <div>
                      <p className="mb-2 font-mono text-[9px] uppercase tracking-[1px] text-muted">event history</p>
                      <div className="space-y-1">
                        {profile.event_history.map((evt) => (
                          <div
                            key={evt.event_id}
                            className="flex items-center justify-between rounded-lg bg-white/[0.02] px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm">{evt.emoji}</span>
                              <p className="font-mono text-[11px] text-cream">{evt.title}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="rounded-full bg-white/5 px-2 py-0.5 font-mono text-[8px] text-muted">
                                {evt.status}
                              </span>
                              <p className="font-mono text-[9px] text-muted/50">
                                {formatDate(evt.date)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Admin tools */}
                  <div className="border-t border-white/5 pt-5">
                    <p className="mb-3 font-mono text-[9px] uppercase tracking-[1px] text-muted">admin tools</p>

                    {/* Status change */}
                    <div className="mb-4">
                      <label className="mb-1 block font-mono text-[9px] text-muted">member status</label>
                      <select
                        value={profile.user.status}
                        onChange={(e) => handleStatusChange(e.target.value)}
                        disabled={statusUpdating}
                        className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 font-mono text-sm text-cream focus:border-caramel/50 focus:outline-none disabled:opacity-50"
                      >
                        <option value="active">Active</option>
                        <option value="provisional">Provisional</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>

                    {/* Admin notes */}
                    <div>
                      <label className="mb-1 block font-mono text-[9px] text-muted">admin notes</label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={newNote}
                          onChange={(e) => setNewNote(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleAddNote()}
                          placeholder="Add a note..."
                          className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 font-mono text-[11px] text-cream placeholder:text-muted/30 focus:border-caramel/50 focus:outline-none"
                        />
                        <button
                          onClick={handleAddNote}
                          disabled={addingNote || !newNote.trim()}
                          className="rounded-lg bg-caramel px-3 py-2 font-mono text-[10px] font-medium text-near-black transition-opacity hover:opacity-80 disabled:opacity-40"
                        >
                          {addingNote ? "..." : "add"}
                        </button>
                      </div>

                      {notes.length > 0 && (
                        <div className="mt-3 space-y-2">
                          {notes.map((note) => (
                            <div key={note.id} className="rounded-lg bg-white/[0.03] px-3 py-2">
                              <p className="font-mono text-[11px] text-cream/80">{note.note}</p>
                              <p className="mt-1 font-mono text-[8px] text-muted/50">
                                {new Date(note.created_at).toLocaleString()}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Delete member */}
                    <div className="mt-6 border-t border-white/5 pt-4">
                      {!deleteConfirm ? (
                        <button
                          onClick={() => setDeleteConfirm(true)}
                          className="w-full rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-2.5 font-mono text-[11px] text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          delete member
                        </button>
                      ) : (
                        <div className="space-y-2">
                          <p className="font-mono text-[10px] text-red-400">
                            permanently delete {profile.user.name}? this removes their account, connections, rsvps, vouch codes, and auth. this cannot be undone.
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={handleDelete}
                              disabled={deleting}
                              className="flex-1 rounded-lg bg-red-500 px-3 py-2.5 font-mono text-[11px] font-medium text-white transition-opacity hover:opacity-80 disabled:opacity-50"
                            >
                              {deleting ? "deleting..." : "confirm delete"}
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(false)}
                              disabled={deleting}
                              className="rounded-lg border border-white/10 px-3 py-2.5 font-mono text-[11px] text-muted transition-colors hover:bg-white/5 disabled:opacity-50"
                            >
                              cancel
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}
