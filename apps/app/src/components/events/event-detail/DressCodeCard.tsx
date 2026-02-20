interface DressCodeCardProps {
  dressCode: string;
  accent: string;
  accentDark: string;
}

export function DressCodeCard({ dressCode, accent, accentDark }: DressCodeCardProps) {
  if (!dressCode) return null;

  return (
    <div className="mb-7">
      <div
        className="flex items-center gap-3.5 rounded-2xl border p-[18px_20px]"
        style={{
          background: `linear-gradient(135deg, ${accent}15, ${accent}08)`,
          borderColor: accent + "20",
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg"
          style={{ background: accent + "25" }}
        >
          👗
        </div>
        <div>
          <p className="mb-1 font-mono text-[9px] uppercase tracking-[1.5px] text-muted">
            dress code
          </p>
          <p className="font-sans text-sm font-medium text-near-black">{dressCode}</p>
        </div>
      </div>
    </div>
  );
}
