"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

const AVATAR_GRADIENTS = [
  ["#D4A574", "#C4704D"], ["#B8A9C9", "#8B7BA8"], ["#A8B5A0", "#7A9170"],
  ["#DBBCAC", "#D4836B"], ["#E6A97E", "#B8845A"], ["#D4836B", "#8B6F5A"],
  ["#C4956A", "#3D2E22"], ["#B8A9C9", "#C4704D"],
];

const AVATAR_EMOJIS = ["\u2728", "\u{1F33F}", "\u{1F319}", "\u{1F98B}", "\u{1F525}", "\u{1F3B5}", "\u{1F4AB}", "\u{1F338}"];

interface ConnectionUser {
  id: string;
  name: string;
  handle: string;
  avatar_url?: string;
  avatar_type?: string;
  sign_emoji?: string;
  sign_label?: string;
  sign_color?: string;
  instagram_handle?: string;
}

interface EnrichedConnection {
  user: ConnectionUser;
  event_title: string;
  connected_at: string;
}

export function ConnectionsList({ onClose }: { onClose: () => void }) {
  const { getIdToken } = useAuth();
  const [connections, setConnections] = useState<EnrichedConnection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const res = await apiFetch<{ success: boolean; data: EnrichedConnection[] }>(
          "/api/users/me/connections",
          { token },
        );
        if (res.data) setConnections(res.data);
      } catch (err) {
        console.error("Failed to load connections:", err);
      } finally {
        setLoading(false);
      }
    }
    fetch();
  }, [getIdToken]);

  return (
    <div className="fixed inset-0 z-[500] overflow-y-auto bg-cream">
      <Noise />

      {/* Header */}
      <div className="sticky top-0 z-10 flex items-center justify-between bg-cream/95 px-5 pb-3 pt-6 backdrop-blur-sm">
        <button onClick={onClose} className="font-mono text-[11px] text-muted">
          {"\u2190"} back
        </button>
        <span className="font-mono text-[10px] uppercase tracking-[2px] text-muted">connections</span>
        <div className="w-12" />
      </div>

      <div className="px-5 pb-24 pt-2">
        {loading && (
          <div className="py-12 text-center">
            <p className="font-mono text-[11px] text-muted">loading connections...</p>
          </div>
        )}

        {!loading && connections.length === 0 && (
          <div className="py-12 text-center">
            <span className="mb-3 block text-4xl">{"\u{1F91D}"}</span>
            <p className="mb-1 font-serif text-xl text-near-black">no connections yet</p>
            <p className="font-sans text-sm text-muted">attend an event to meet people!</p>
          </div>
        )}

        {!loading && connections.length > 0 && (
          <div className="flex flex-col gap-2.5">
            {connections.map((conn) => (
              <div
                key={conn.user.id}
                className="flex items-center justify-between rounded-[14px] bg-white p-4 shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
              >
                <div className="flex items-center gap-3">
                  <ConnectionAvatar user={conn.user} />
                  <div>
                    <p className="font-sans text-[14px] font-medium text-near-black">
                      {conn.user.name}
                    </p>
                    <p className="font-mono text-[10px] text-muted">
                      @{conn.user.handle}
                      {conn.user.sign_emoji && (
                        <span
                          className="ml-1.5"
                          style={{ color: conn.user.sign_color || "#9B8E82" }}
                        >
                          {conn.user.sign_emoji} {conn.user.sign_label}
                        </span>
                      )}
                    </p>
                    <p className="mt-0.5 font-mono text-[9px] text-muted/60">
                      met at {conn.event_title}
                    </p>
                  </div>
                </div>

                {conn.user.instagram_handle && (
                  <a
                    href={`https://instagram.com/${conn.user.instagram_handle}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-shrink-0 rounded-full bg-cream px-3 py-1.5 font-mono text-[10px] text-caramel transition-colors hover:bg-sand/30"
                  >
                    @{conn.user.instagram_handle}
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ConnectionAvatar({ user }: { user: ConnectionUser }) {
  if (user.avatar_type === "uploaded" && user.avatar_url && !user.avatar_url.startsWith("gradient:")) {
    return (
      <div className="h-11 w-11 overflow-hidden rounded-full">
        <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
      </div>
    );
  }

  if (user.avatar_type === "gradient" && user.avatar_url?.startsWith("gradient:")) {
    const index = parseInt(user.avatar_url.replace("gradient:", ""), 10);
    const grad = AVATAR_GRADIENTS[index] || AVATAR_GRADIENTS[0];
    return (
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full text-lg"
        style={{ background: `linear-gradient(135deg, ${grad[0]}, ${grad[1]})` }}
      >
        {AVATAR_EMOJIS[index] || "\u2728"}
      </div>
    );
  }

  if (user.sign_emoji) {
    return (
      <div
        className="flex h-11 w-11 items-center justify-center rounded-full text-lg"
        style={{ background: (user.sign_color || "#D4A574") + "20" }}
      >
        {user.sign_emoji}
      </div>
    );
  }

  return (
    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-sand/30 font-serif text-lg text-near-black">
      {user.name.charAt(0)}
    </div>
  );
}
