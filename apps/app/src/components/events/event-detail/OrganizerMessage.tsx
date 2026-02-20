interface OrganizerMessageProps {
  message: string;
  accent: string;
}

export function OrganizerMessage({ message, accent }: OrganizerMessageProps) {
  if (!message) return null;

  return (
    <div
      className="relative mb-7 overflow-hidden rounded-2xl border p-5"
      style={{
        background: `linear-gradient(135deg, ${accent}10, ${accent}05)`,
        borderColor: accent + "15",
      }}
    >
      <div
        className="absolute right-3.5 top-2.5 font-hand text-[11px]"
        style={{ color: "#D4A574", transform: "rotate(2deg)" }}
      >
        from us to you
      </div>
      <span className="mb-2.5 block font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
        a note from the team
      </span>
      <p className="font-hand text-[17px] leading-relaxed text-warm-brown">{message}</p>
    </div>
  );
}
