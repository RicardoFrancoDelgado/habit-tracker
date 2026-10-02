"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { focusTitle } from "@/lib/focus";
import type { Habit } from "@/lib/habits";
import type { Store } from "@/lib/use-store";
import { useState } from "react";

type Suggestion = Omit<Habit, "id">;

const SUGGESTIONS: { habit: Suggestion; meta: string }[] = [
  { habit: { name: "Beber água", type: "qty", target: 8, unit: "copos" }, meta: "8 copos por dia" },
  { habit: { name: "Ler 20 páginas", type: "check", target: 1, unit: "" }, meta: "Diário" },
  { habit: { name: "Treinar", type: "weekly", target: 3, unit: "" }, meta: "3 vezes por semana" },
];

/** Shown on Hoje while there are no habits: first use, or after everything was cleared. */
export function FirstRun({ store, goHabits }: { store: Store; goHabits: () => void }) {
  const { addHabits, loadExample } = store;
  const [picked, setPicked] = useState<boolean[]>(() => SUGGESTIONS.map(() => true));
  const count = picked.filter(Boolean).length;

  // This panel goes away once there are habits, so focus moves to the screen title.
  const start = () => {
    addHabits(SUGGESTIONS.filter((_, i) => picked[i]).map((s) => s.habit));
    focusTitle();
  };

  return (
    <section className="flex max-w-[560px] flex-col gap-(--space-4)">
      <div className="flex flex-col gap-1.5">
        <h2 className="m-0 text-base font-medium text-neutral-200">Comece com poucos hábitos</h2>
        <p className="m-0 text-sm text-neutral-300">Três bastam para ver o dia fechar. Desmarque o que não faz sentido; dá para mudar tudo depois.</p>
      </div>

      <div className="flex flex-col gap-(--space-2)">
        {SUGGESTIONS.map(({ habit, meta }, i) => {
          const on = picked[i];
          const id = `suggestion-${i}`;
          return (
            <Label key={habit.name} htmlFor={id} className="block cursor-pointer">
              <Card size="sm" className={`flex-row items-center gap-(--space-3) px-(--space-3) py-(--space-3) text-[15px] font-normal ring-1 transition-colors duration-200 ${on ? "ring-accent-800" : "ring-transparent"}`}>
                <Checkbox
                  id={id}
                  checked={on}
                  onCheckedChange={(v) => setPicked((p) => p.map((x, j) => (j === i ? v === true : x)))}
                  className="size-[30px] rounded-sm border-[1.5px] border-neutral-600 data-[state=checked]:border-primary data-[state=checked]:shadow-[0_0_12px_color-mix(in_srgb,var(--primary)_55%,transparent)] [&_svg]:size-4"
                />
                <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span>{habit.name}</span>
                  <span className="text-xs text-neutral-400">{meta}</span>
                </span>
              </Card>
            </Label>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-(--space-2)">
        <Button onClick={start} disabled={!count}>
          {count === 1 ? "Começar com 1 hábito" : `Começar com ${count} hábitos`}
        </Button>
        <Button variant="ghost" className="text-[13px]" onClick={goHabits}>
          Criar os meus
        </Button>
        <Button
          variant="ghost"
          className="text-[13px]"
          onClick={() => {
            loadExample();
            focusTitle();
          }}
        >
          Ver com dados de exemplo
        </Button>
      </div>
    </section>
  );
}
