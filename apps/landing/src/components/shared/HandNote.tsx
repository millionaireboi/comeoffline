"use client";

export function HandNote({
  children,
  rotation = -2,
  className = "",
  style = {},
}: {
  children: React.ReactNode;
  rotation?: number;
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <span
      className={`font-hand inline-block text-[15px] text-muted ${className}`}
      style={{ transform: `rotate(${rotation}deg)`, ...style }}
    >
      {children}
    </span>
  );
}
