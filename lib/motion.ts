import { useEffect, useRef, useState } from "react";

/**
 * A counter that goes up each time `on` turns true after the first render, and stays put otherwise.
 * Used as a React key to replay a one-shot animation (the light of a habit being ticked) without effects or timers.
 */
export function useLitKey(on: boolean) {
  const [s, setS] = useState({ on, n: 0 });
  if (s.on !== on) setS({ on, n: on ? s.n + 1 : s.n });
  return s.n;
}

/** Goes up whenever `value` changes after the first render, so a number can nudge when it moves. */
export function useBumpKey(value: unknown) {
  const [s, setS] = useState({ value, n: 0 });
  if (s.value !== value) setS({ value, n: s.n + 1 });
  return s.n;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** Eases a number from 0 to `to` once, on mount. Reduced motion shows the final value at once. */
export function useCountUp(to: number, ms = 700) {
  const [v, setV] = useState(() => (reduced() ? to : 0));
  const first = useRef(true);
  const [settled, setSettled] = useState(reduced);
  useEffect(() => {
    if (!first.current) return;
    first.current = false;
    if (reduced()) return;
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / ms);
      setV(to * (1 - Math.pow(1 - p, 4)));
      if (p < 1) raf = requestAnimationFrame(tick);
      else setSettled(true);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms]);
  return settled ? to : v;
}
