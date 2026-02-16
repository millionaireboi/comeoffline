"use client";

import { useState, useEffect, useCallback } from "react";
import type { VouchCode } from "@comeoffline/types";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

export function VouchScreen() {
  const { getIdToken } = useAuth();
  const { currentEvent, user, setStage } = useAppStore();
  const [codes, setCodes] = useState<VouchCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const isProvisional = user?.status === "provisional";

  useEffect(() => {
    async function fetchCodes() {
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: VouchCode[] }>(
          "/api/vouch-codes",
          { token },
        );
        if (data.data) setCodes(data.data);
      } catch (err) {
        console.error("Failed to load vouch codes:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchCodes();
  }, [getIdToken]);

  const handleClaim = useCallback(async () => {
    if (!currentEvent) return;
    setClaiming(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      const data = await apiFetch<{ success: boolean; data: VouchCode[] }>(
        "/api/vouch-codes/claim",
        {
          method: "POST",
          token,
          body: JSON.stringify({ eventId: currentEvent.id }),
        },
      );
      if (data.data) {
        setCodes((prev) => {
          const existingIds = new Set(prev.map((c) => c.id));
          const newCodes = data.data.filter((c: VouchCode) => !existingIds.has(c.id));
          return [...newCodes, ...prev];
        });
      }
    } catch (err) {
      console.error("Failed to claim codes:", err);
    } finally {
      setClaiming(false);
    }
  }, [currentEvent, getIdToken]);

  const handleReveal = (id: string) => {
    setRevealedIds((prev) => new Set(prev).add(id));
  };

  const handleCopy = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = code;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const eventCodes = currentEvent
    ? codes.filter((c) => c.earned_from_event === currentEvent.id)
    : [];
  const otherCodes = currentEvent
    ? codes.filter((c) => c.earned_from_event !== currentEvent.id)
    : codes;
  const hasClaimable = currentEvent && eventCodes.length === 0;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <div className="animate-fadeIn text-center">
          <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">loading codes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-[120px]">
      <Noise />

      {/* Header */}
      <section className="px-5 pb-6 pt-10">
        <button
          onClick={() => setStage("memories")}
          className="mb-5 font-mono text-[11px] text-muted transition-colors hover:text-near-black"
        >
          ← back to memories
        </button>

        <h2
          className="animate-fadeSlideUp mb-2 font-serif text-[32px] font-normal leading-none text-near-black"
          style={{ letterSpacing: "-1px" }}
        >
          vouch codes ✉️
        </h2>
        <p className="animate-fadeSlideUp font-sans text-[15px] text-warm-brown" style={{ animationDelay: "0.1s" }}>
          know someone who belongs?
          <br />
          <span className="text-muted">share a code, skip the gatekeeping.</span>
        </p>
      </section>

      {/* Provisional user message */}
      {isProvisional && (
        <section className="animate-fadeSlideUp px-4 pb-6" style={{ animationDelay: "0.2s" }}>
          <div className="rounded-[20px] border border-lavender/30 bg-lavender/5 p-6 text-center">
            <span className="mb-3 block text-3xl">&#x1F331;</span>
            <p className="font-sans text-[15px] font-medium text-near-black">
              still proving yourself
            </p>
            <p className="mt-2 font-mono text-[11px] text-muted">
              attend your first event to earn invite codes.
              <br />
              show up, vibe, and the community will decide.
            </p>
          </div>
        </section>
      )}

      {/* Claim CTA */}
      {hasClaimable && !isProvisional && (
        <section className="animate-fadeSlideUp px-4 pb-6" style={{ animationDelay: "0.2s" }}>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className="w-full rounded-[20px] border-[1.5px] border-caramel/20 bg-gradient-to-br from-[#FFF8F0] via-white to-[#FFF8F0] p-6 text-center shadow-[0_4px_20px_rgba(212,165,116,0.1)] transition-all hover:-translate-y-0.5"
            style={{ opacity: claiming ? 0.6 : 1 }}
          >
            <span className="mb-3 block text-3xl">🎟️</span>
            <span className="block font-sans text-[17px] font-medium text-near-black">
              {claiming ? "generating codes..." : "claim your vouch codes"}
            </span>
            <span className="mt-1 block font-mono text-[11px] text-muted">
              you earned these for showing up
            </span>
          </button>
        </section>
      )}

      {/* Current event codes */}
      {eventCodes.length > 0 && (
        <section className="px-4 pb-6">
          <span className="mb-4 block px-1 font-mono text-[10px] uppercase tracking-[2px] text-muted">
            from {currentEvent?.title}
          </span>
          <div className="flex flex-col gap-3">
            {eventCodes.map((code, i) => (
              <VouchCodeCard
                key={code.id}
                code={code}
                index={i}
                revealed={revealedIds.has(code.id)}
                copied={copiedId === code.id}
                onReveal={() => handleReveal(code.id)}
                onCopy={() => handleCopy(code.code, code.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Other codes */}
      {otherCodes.length > 0 && (
        <section className="px-4 pb-6">
          <span className="mb-4 block px-1 font-mono text-[10px] uppercase tracking-[2px] text-muted">
            other codes
          </span>
          <div className="flex flex-col gap-3">
            {otherCodes.map((code, i) => (
              <VouchCodeCard
                key={code.id}
                code={code}
                index={i + eventCodes.length}
                revealed={revealedIds.has(code.id)}
                copied={copiedId === code.id}
                onReveal={() => handleReveal(code.id)}
                onCopy={() => handleCopy(code.code, code.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* Empty state */}
      {codes.length === 0 && !hasClaimable && (
        <section className="animate-fadeSlideUp px-5 py-12 text-center" style={{ animationDelay: "0.2s" }}>
          <span className="mb-4 block text-4xl">✉️</span>
          <p className="font-serif text-xl text-warm-brown">no codes yet</p>
          <p className="mt-2 font-mono text-[11px] text-muted">attend events to earn vouch codes</p>
        </section>
      )}
    </div>
  );
}

function VouchCodeCard({
  code,
  index,
  revealed,
  copied,
  onReveal,
  onCopy,
}: {
  code: VouchCode;
  index: number;
  revealed: boolean;
  copied: boolean;
  onReveal: () => void;
  onCopy: () => void;
}) {
  const isUsed = code.status === "used";

  return (
    <div
      className="animate-fadeSlideUp overflow-hidden rounded-[16px] bg-white shadow-[0_1px_3px_rgba(26,23,21,0.04)]"
      style={{ animationDelay: `${0.25 + index * 0.06}s` }}
    >
      {/* Accent */}
      <div
        className="h-[3px]"
        style={{
          background: isUsed
            ? "#E8DDD0"
            : "linear-gradient(90deg, #D4A574, #B8845A)",
        }}
      />

      <div className="flex items-center justify-between p-4">
        <div>
          {revealed || isUsed ? (
            <p
              className="font-mono text-[18px] font-medium tracking-wider"
              style={{ color: isUsed ? "#9B8E82" : "#1A1715" }}
            >
              {code.code}
            </p>
          ) : (
            <button
              onClick={onReveal}
              className="font-mono text-[18px] tracking-wider text-muted/30 transition-colors hover:text-muted"
            >
              ••••••••••
            </button>
          )}
          <p className="mt-0.5 font-mono text-[9px] text-muted">
            {isUsed ? `used by someone` : "tap to reveal"}
          </p>
        </div>

        {!isUsed && revealed && (
          <button
            onClick={onCopy}
            className="rounded-full bg-near-black px-4 py-2 font-mono text-[11px] text-white transition-all"
          >
            {copied ? "copied ✓" : "copy"}
          </button>
        )}

        {isUsed && (
          <span className="rounded-full bg-sand/50 px-3 py-1.5 font-mono text-[10px] text-muted">
            used
          </span>
        )}
      </div>
    </div>
  );
}
