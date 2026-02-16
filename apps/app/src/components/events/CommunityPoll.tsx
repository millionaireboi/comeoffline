"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useAppStore } from "@/store/useAppStore";
import { apiFetch } from "@/lib/api";
import { Noise } from "@/components/shared/Noise";

interface PollSubject {
  id: string;
  name: string;
  handle: string;
  vibe_tag: string;
}

interface PollData {
  id: string;
  event_id: string;
  closes_at: string;
  subjects: PollSubject[];
}

export function CommunityPoll() {
  const { getIdToken } = useAuth();
  const { currentEvent, setStage } = useAppStore();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [votes, setVotes] = useState<Array<{ subject_id: string; vibed: boolean }>>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    async function fetchPoll() {
      if (!currentEvent) return;
      try {
        const token = await getIdToken();
        if (!token) return;
        const data = await apiFetch<{ success: boolean; data: PollData }>(
          `/api/events/${currentEvent.id}/poll`,
          { token },
        );
        if (data.data) setPoll(data.data);
      } catch (err) {
        console.error("Failed to load poll:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchPoll();
  }, [getIdToken, currentEvent]);

  const handleVote = useCallback(
    (vibed: boolean) => {
      if (!poll) return;
      const subject = poll.subjects[currentIndex];
      setVotes((prev) => [...prev, { subject_id: subject.id, vibed }]);
      if (currentIndex < poll.subjects.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    },
    [poll, currentIndex],
  );

  const handleSubmit = useCallback(async () => {
    if (!currentEvent || !poll) return;
    setSubmitting(true);
    try {
      const token = await getIdToken();
      if (!token) return;
      await apiFetch(`/api/events/${currentEvent.id}/community-poll`, {
        method: "POST",
        token,
        body: JSON.stringify({ votes }),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit poll:", err);
    } finally {
      setSubmitting(false);
    }
  }, [currentEvent, poll, votes, getIdToken]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-cream">
        <p className="font-mono text-[11px] uppercase tracking-[3px] text-muted">loading poll...</p>
      </div>
    );
  }

  if (!poll || poll.subjects.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
        <Noise />
        <span className="mb-4 text-4xl">&#x2705;</span>
        <p className="font-serif text-xl text-near-black">no one to vote on</p>
        <p className="mt-2 font-mono text-[11px] text-muted">check back later</p>
        <button
          onClick={() => setStage("feed")}
          className="mt-6 rounded-full bg-near-black px-6 py-3 font-sans text-sm text-white"
        >
          back to feed
        </button>
      </div>
    );
  }

  // Submitted state
  if (submitted) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
        <Noise />
        <div className="animate-fadeSlideUp text-center">
          <span className="mb-4 block text-5xl">&#x1F64F;</span>
          <h2 className="mb-2 font-serif text-[28px] text-near-black">thanks for voting</h2>
          <p className="font-sans text-[15px] text-warm-brown">
            your input helps us build a better community.
          </p>
          <button
            onClick={() => setStage("feed")}
            className="mt-8 rounded-full bg-near-black px-8 py-3.5 font-sans text-sm font-medium text-white"
          >
            back to feed
          </button>
        </div>
      </div>
    );
  }

  const allVoted = votes.length === poll.subjects.length;
  const current = poll.subjects[currentIndex];
  const isLast = currentIndex === poll.subjects.length - 1;

  // Closed poll
  if (new Date(poll.closes_at) < new Date()) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-cream px-6">
        <Noise />
        <span className="mb-4 text-4xl">&#x23F0;</span>
        <p className="font-serif text-xl text-near-black">poll has closed</p>
        <button
          onClick={() => setStage("feed")}
          className="mt-6 rounded-full bg-near-black px-6 py-3 font-sans text-sm text-white"
        >
          back to feed
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cream pb-[120px]">
      <Noise />

      {/* Header */}
      <section className="px-5 pb-4 pt-10">
        <button
          onClick={() => setStage("feed")}
          className="mb-5 font-mono text-[11px] text-muted transition-colors hover:text-near-black"
        >
          &larr; back to feed
        </button>

        <h2 className="animate-fadeSlideUp mb-1 font-serif text-[28px] font-normal text-near-black">
          community check &#x2728;
        </h2>
        <p className="animate-fadeSlideUp font-sans text-[14px] text-warm-brown" style={{ animationDelay: "0.1s" }}>
          {currentEvent?.title} &mdash; did these people vibe?
        </p>

        {/* Progress */}
        <div className="mt-4 flex items-center gap-3">
          <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-sand">
            <div
              className="h-full rounded-full bg-near-black transition-all duration-300"
              style={{ width: `${(votes.length / poll.subjects.length) * 100}%` }}
            />
          </div>
          <span className="font-mono text-[10px] text-muted">
            {votes.length}/{poll.subjects.length}
          </span>
        </div>
      </section>

      {/* Current person to vote on */}
      {!allVoted && current && (
        <section className="animate-fadeSlideUp px-5 pt-6">
          <div className="rounded-[24px] bg-white p-8 text-center shadow-[0_4px_24px_rgba(26,23,21,0.06)]">
            {/* Avatar */}
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-caramel/10 font-serif text-3xl text-caramel">
              {current.name.charAt(0)}
            </div>

            <h3 className="mb-1 font-serif text-[24px] text-near-black">{current.name}</h3>
            <p className="mb-1 font-mono text-[12px] text-muted">@{current.handle}</p>
            {current.vibe_tag && (
              <span className="inline-block rounded-full bg-caramel/10 px-3 py-1 font-mono text-[10px] text-caramel">
                {current.vibe_tag}
              </span>
            )}

            {/* Vote buttons */}
            <div className="mt-8 flex justify-center gap-4">
              <button
                onClick={() => handleVote(false)}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-sand bg-white text-2xl transition-all hover:scale-110 hover:border-terracotta/30 hover:bg-terracotta/5"
              >
                &#x1F614;
              </button>
              <button
                onClick={() => handleVote(true)}
                className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-sand bg-white text-2xl transition-all hover:scale-110 hover:border-sage/30 hover:bg-sage/5"
              >
                &#x1F91D;
              </button>
            </div>
            <div className="mt-3 flex justify-center gap-10">
              <span className="font-mono text-[10px] text-muted">meh</span>
              <span className="font-mono text-[10px] text-muted">vibed</span>
            </div>
          </div>
        </section>
      )}

      {/* Submit button after all voted */}
      {allVoted && (
        <section className="animate-fadeSlideUp px-5 pt-10 text-center">
          <span className="mb-4 block text-4xl">&#x2705;</span>
          <p className="mb-6 font-serif text-xl text-near-black">
            all done! ready to submit?
          </p>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="rounded-full bg-near-black px-10 py-4 font-sans text-base font-medium text-white transition-all hover:-translate-y-0.5"
            style={{ opacity: submitting ? 0.6 : 1 }}
          >
            {submitting ? "submitting..." : "submit votes"}
          </button>
        </section>
      )}
    </div>
  );
}
