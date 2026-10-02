"use client";

import { Progress } from "@/components/ui/progress";
import { levelOf, totalLights } from "@/lib/gamification";
import type { Calc } from "@/lib/habits";
import { useBumpKey } from "@/lib/motion";
import { useMemo } from "react";

/** The person's level, from the lights (habits done) gathered so far. It only grows: a dark day adds nothing and takes nothing. */
export function LevelMeter({ calc, className = "" }: { calc: Calc; className?: string }) {
  const lights = useMemo(() => totalLights(calc), [calc]);
  const lv = levelOf(lights);
  const up = useBumpKey(lv.index);
  const moved = useBumpKey(lights);
  return (
    <div className={`flex flex-col gap-1.5 ${className}`}>
      <div className="flex items-center gap-1.5 text-[13px] text-neutral-200">
        <i key={up} aria-hidden="true" className={`ph-fill ph-sparkle text-accent-300 ${up ? "glint" : ""}`} />
        <span>{lv.name}</span>
        <span className="ml-auto text-xs text-neutral-400 tabular-nums">
          <span key={moved} className={moved ? "tick-in" : ""}>{lights}</span> {lights === 1 ? "luz" : "luzes"}
        </span>
      </div>
      <Progress value={Math.round(lv.pct * 100)} aria-label={`Nível ${lv.name}`} className="h-1" />
      <span className="text-xs text-neutral-400">
        {lv.next ? `Faltam ${lv.toNext} ${lv.toNext === 1 ? "luz" : "luzes"} para ${lv.next.name}` : "Nível mais alto alcançado"}
      </span>
    </div>
  );
}
