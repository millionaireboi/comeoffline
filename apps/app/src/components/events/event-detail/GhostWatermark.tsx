interface GhostWatermarkProps {
  text: string;
  className?: string;
  dark?: boolean;
}

export function GhostWatermark({
  text,
  className = "text-[180px] -top-2.5 right-3",
  dark = false,
}: GhostWatermarkProps) {
  return (
    <div
      className={`pointer-events-none absolute font-serif font-normal leading-[0.9] ${
        dark ? "text-cream" : "text-near-black"
      } opacity-[0.03] ${className}`}
    >
      {text}
    </div>
  );
}
