import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";

interface CountUpNumberProps {
  value: number;
  decimals?: number;
  suffix?: string;
}

export function CountUpNumber({
  value,
  decimals = 0,
  suffix = "",
}: CountUpNumberProps) {
  const prefersReducedMotion = useReducedMotion();
  const [display, setDisplay] = useState<number>(value);
  const prevRef = useRef<number>(value);

  useEffect(() => {
    if (prefersReducedMotion || !Number.isFinite(value)) {
      setDisplay(value);
      prevRef.current = value;
      return;
    }

    const startVal = prevRef.current;
    const delta = value - startVal;
    if (Math.abs(delta) < 0.001) {
      setDisplay(value);
      return;
    }

    const durationMs = 420;
    const startTime = performance.now();
    let rafId = 0;

    const tick = (now: number) => {
      const elapsed = Math.min(1, (now - startTime) / durationMs);
      const eased = 1 - Math.pow(1 - elapsed, 3);
      setDisplay(startVal + delta * eased);
      if (elapsed < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        prevRef.current = value;
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [value, prefersReducedMotion]);

  const formatted =
    decimals > 0
      ? display.toFixed(decimals)
      : new Intl.NumberFormat("en-US").format(Math.round(display));

  return (
    <span className="tabular-nums">
      {formatted}
      {suffix}
    </span>
  );
}
