interface Tab {
  id: string;
  label: string;
}

interface SectionTabsProps {
  tabs: Tab[];
  active: string;
  onSelect: (id: string) => void;
  accentDark: string;
}

export function SectionTabs({ tabs, active, onSelect, accentDark }: SectionTabsProps) {
  if (tabs.length <= 1) return null;

  return (
    <div className="flex shrink-0 gap-0 border-b border-sand/50 bg-cream px-6">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onSelect(tab.id)}
          className="cursor-pointer px-4 pb-2.5 pt-3 font-mono text-[11px] uppercase tracking-[1.5px] transition-all duration-200"
          style={{
            color: active === tab.id ? accentDark : "#9B8E82",
            fontWeight: active === tab.id ? 500 : 400,
            background: "none",
            border: "none",
            borderBottom:
              active === tab.id
                ? `2px solid ${accentDark}`
                : "2px solid transparent",
          }}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}
