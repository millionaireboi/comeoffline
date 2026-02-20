interface SectionLabelProps {
  label: string;
  sticker?: string;
  stickerColor?: string;
  stickerRotation?: number;
  dark?: boolean;
  icon?: string;
}

export function SectionLabel({
  label,
  sticker,
  stickerColor = "#D4A574",
  stickerRotation = -2,
  dark = false,
  icon,
}: SectionLabelProps) {
  return (
    <div className="mb-4 flex items-center gap-2">
      {icon && <span className="text-sm">{icon}</span>}
      <span
        className={`font-mono text-[10px] uppercase tracking-[2px] ${
          dark ? "text-muted" : "text-muted"
        }`}
      >
        {label}
      </span>
      <div
        className={`h-px flex-1 ${dark ? "bg-muted/20" : "bg-sand"}`}
      />
      {sticker && (
        <span
          className="inline-block shrink-0 font-hand text-[13px]"
          style={{ color: stickerColor, transform: `rotate(${stickerRotation}deg)` }}
        >
          {sticker}
        </span>
      )}
    </div>
  );
}
