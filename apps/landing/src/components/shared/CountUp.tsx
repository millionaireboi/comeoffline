"use client";

import { useState, useEffect } from "react";

export function CountUp({ target, vis }: { target: string; vis: boolean }) {
  const [val, setVal] = useState<string | number>(0);
  useEffect(() => {
    if (!vis) return;
    const num = parseInt(target);
    if (isNaN(num)) {
      setVal(target);
      return;
    }
    let cur = 0;
    const inc = Math.max(1, Math.floor(num / 30));
    const iv = setInterval(() => {
      cur += inc;
      if (cur >= num) {
        setVal(num);
        clearInterval(iv);
      } else setVal(cur);
    }, 40);
    return () => clearInterval(iv);
  }, [vis, target]);
  return <>{val}</>;
}
