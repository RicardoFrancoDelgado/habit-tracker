"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DIAS, parse } from "@/lib/habits";
import type { Calc, Data } from "@/lib/habits";
import { useState } from "react";

const MOOD_ICONS = ["ph-smiley-x-eyes", "ph-smiley-sad", "ph-smiley-meh", "ph-smiley", "ph-smiley-wink"];
const MOOD_NAMES = ["Péssimo", "Ruim", "Ok", "Bom", "Ótimo"];
const PAGE = 30;

const excerpt = (note: string, max = 90) => {
  const one = note.replace(/\s+/g, " ").trim();
  return one.length > max ? `${one.slice(0, max).trimEnd()}…` : one;
};

/** The days that have something written, newest first. Opening one turns the notebook to that page. */
export function DayIndex({ data, calc, today, onOpen, onClose }: { data: Data; calc: Calc; today: string; onOpen: (d: string) => void; onClose: () => void }) {
  const [shown, setShown] = useState(PAGE);
  const days = Object.keys(data.logs)
    .filter((d) => d <= today && data.logs[d].note.trim())
    .sort()
    .reverse();

  return (
    <Card aria-label="Dias escritos" className="py-(--space-4)">
      <CardContent className="flex flex-col gap-(--space-3)">
      <div className="flex items-center gap-(--space-3)">
        <h2 className="m-0 mr-auto text-base font-medium text-neutral-200">Dias escritos</h2>
        <Button type="button" variant="ghost" className="text-[13px]" onClick={onClose}>
          Fechar
        </Button>
      </div>
      {days.length === 0 ? (
        <p className="m-0 text-sm text-neutral-300">Ainda não há dias escritos. Quando você deixar uma nota, o dia aparece aqui.</p>
      ) : (
        <>
          <ul className="m-0 flex max-h-80 list-none flex-col gap-0.5 overflow-y-auto p-0">
            {days.slice(0, shown).map((d) => {
              const l = data.logs[d];
              const dt = parse(d);
              const counted = calc.activeCount(d);
              const full = counted > 0 && calc.doneOn(d) === counted;
              return (
                <li key={d}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => onOpen(d)}
                    className="h-auto w-full items-start justify-start gap-(--space-3) px-(--space-2) py-(--space-2) text-left font-normal whitespace-normal text-inherit hover:bg-foreground/7 hover:text-inherit"
                  >
                    <span className="w-[88px] flex-none text-sm text-neutral-200 tabular-nums">{`${DIAS[dt.getDay()].slice(0, 3)}, ${String(dt.getDate()).padStart(2, "0")}/${String(dt.getMonth() + 1).padStart(2, "0")}`}</span>
                    <span className="min-w-0 flex-1 text-sm text-neutral-300 wrap-anywhere">{excerpt(l.note)}</span>
                    {l.mood > 0 && (
                      <>
                        <i aria-hidden="true" className={`ph ${MOOD_ICONS[l.mood - 1]} flex-none text-lg text-neutral-400`} />
                        <span className="sr-only">{`Humor: ${MOOD_NAMES[l.mood - 1]}.`}</span>
                      </>
                    )}
                    <span className="mt-1.5 size-1.5 flex-none rounded-full" style={{ background: full ? "var(--primary)" : "transparent" }} aria-hidden="true" />
                    {full && <span className="sr-only">Todos os hábitos concluídos.</span>}
                  </Button>
                </li>
              );
            })}
          </ul>
          {days.length > shown && (
            <Button type="button" variant="outline" className="self-start" onClick={() => setShown((n) => n + PAGE)}>
              Mostrar mais
            </Button>
          )}
        </>
      )}
      </CardContent>
    </Card>
  );
}
