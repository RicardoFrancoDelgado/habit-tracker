"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Goal, MAX_GOAL, MESES, capitalize, ds } from "@/lib/habits";
import { focusNeighbor } from "@/lib/focus";
import type { Store } from "@/lib/use-store";
import { useId, useRef, useState } from "react";

const KICKER = "text-[11px] font-normal tracking-[.1em] text-primary uppercase";
const LABEL = "text-xs font-normal text-foreground/70";
const SEG_ITEM = "h-9 px-3 text-[13px] font-normal data-[state=on]:bg-transparent data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-primary data-[state=on]:ring-inset pointer-coarse:min-h-11";

type Form = { id?: string; title: string; kind: "habit" | "manual"; habitId: string; target: number; unit: string; step: number };

export function GoalsView({ store }: { store: Store }) {
  const { calc, data, today, update, removeGoal, notify } = store;
  const [scope, setScope] = useState<"month" | "year">("month");
  const [gMonth, setGMonth] = useState(today.slice(0, 7));
  const [gYear, setGYear] = useState(today.slice(0, 4));
  const [gf, setGf] = useState<Form | null>(null);
  const uid = useId();
  const titleRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLButtonElement>(null);
  if (!calc || !data) return null;

  const { habits } = data;
  const month = scope === "month";
  const period = month ? gMonth : gYear;
  const [py, pm] = period.split("-").map(Number);
  const { days, total } = calc.periodDays(scope, period);
  const frac = days.length / total;
  const isCurrent = month ? period === today.slice(0, 7) : period === today.slice(0, 4);
  const list = data.goals.filter((g) => g.scope === scope && g.period === period);

  const patchGoal = (id: string, fn: (g: Goal) => Goal) => update((d) => ({ ...d, goals: d.goals.map((x) => (x.id === id ? fn(x) : x)) }));
  const patchForm = (p: Partial<Form>) => setGf((f) => (f ? { ...f, ...p } : f));
  const setScopeTo = (s: "month" | "year") => {
    setScope(s);
    setGf(null);
  };
  const shift = (dir: -1 | 1) => (month ? setGMonth(ds(new Date(py, pm - 1 + dir, 1)).slice(0, 7)) : setGYear(String(py + dir)));
  const closeForm = () => {
    setGf(null);
    setTimeout(() => newRef.current?.focus(), 0);
  };
  const save = () => {
    if (!gf || invalid) return;
    const title = gf.title.trim();
    const target = Math.min(gf.kind === "habit" ? 366 : MAX_GOAL, Math.max(1, Math.round(gf.target)));
    if (gf.id) {
      patchGoal(gf.id, (x) => ({
        ...x,
        title,
        target,
        ...(x.kind === "habit" ? { habitId: gf.habitId } : { unit: gf.unit, step: gf.step }),
      }));
      notify({ text: `Atualizei a meta “${title}”.` });
    } else {
      const g: Goal = { ...gf, target, id: "g" + Date.now(), scope, period, title, progress: 0 };
      if (g.kind === "manual") delete g.habitId;
      update((d) => ({ ...d, goals: [...d.goals, g] }));
      notify({ text: `Adicionei a meta “${title}”.` });
    }
    closeForm();
  };

  const cards = list.map((g) => {
    const h = habits.find((x) => x.id === g.habitId);
    const value = g.kind === "habit" ? (h ? days.filter((d) => calc.hit(h, d)).length : 0) : g.progress || 0;
    const pct = Math.min(1, value / g.target);
    const expected = Math.round(g.target * frac);
    const done = value >= g.target;
    const unit = g.kind === "habit" ? (h && h.type === "weekly" ? "vezes" : "dias") : g.unit || "";
    const ahead = value >= expected;
    return { g, h, value, pct, expected, done, unit, ahead };
  });
  const focusTitleField = () => setTimeout(() => titleRef.current?.focus(), 0);
  const openForm = () => {
    setGf({ title: "", kind: habits.length ? "habit" : "manual", habitId: habits[0]?.id || "", target: month ? 20 : 200, unit: "", step: 1 });
    focusTitleField();
  };
  const openEdit = (g: Goal) => {
    setGf({ id: g.id, title: g.title, kind: g.kind, habitId: g.habitId || habits[0]?.id || "", target: g.target, unit: g.unit || "", step: g.step || 1 });
    focusTitleField();
  };
  const gHabit = gf?.kind === "habit" ? habits.find((x) => x.id === gf.habitId) : undefined;
  const invalid = !gf || !gf.title.trim() || !(gf.target > 0) || (gf.kind === "habit" && !gf.habitId);

  return (
    <div className="flex flex-col gap-(--space-6)">
      <header className="flex flex-wrap items-end gap-(--space-3)">
        <div className="mr-auto flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-widest text-primary">{`${cards.length} ${cards.length === 1 ? "meta" : "metas"} · ${cards.filter((c) => c.done).length} ${cards.filter((c) => c.done).length === 1 ? "concluída" : "concluídas"}`}</span>
          <h1 className="m-0 text-[30px] leading-tight font-medium">Metas</h1>
        </div>
        <ToggleGroup type="single" variant="outline" spacing={0} aria-label="Período das metas" value={scope} onValueChange={(v) => v && setScopeTo(v as "month" | "year")}>
          <ToggleGroupItem value="month" className={SEG_ITEM}>
            Mensais
          </ToggleGroupItem>
          <ToggleGroupItem value="year" className={SEG_ITEM}>
            Anuais
          </ToggleGroupItem>
        </ToggleGroup>
      </header>

      <div className="flex flex-wrap items-center gap-(--space-2)">
        <Button variant="outline" size="icon" onClick={() => shift(-1)} aria-label="Período anterior">
          <i aria-hidden="true" className="ph ph-caret-left" />
        </Button>
        <span className="min-w-[170px] text-center text-lg">{month ? `${capitalize(MESES[pm - 1])} de ${py}` : String(py)}</span>
        <Button variant="outline" size="icon" onClick={() => shift(1)} aria-label="Próximo período">
          <i aria-hidden="true" className="ph ph-caret-right" />
        </Button>
        <span className="ml-(--space-2) text-xs text-neutral-400">{isCurrent ? `${Math.round(frac * 100)}% do período decorrido` : days.length ? "Período encerrado" : "Período futuro"}</span>
        <div className="ml-auto">
          <Button ref={newRef} onClick={openForm}>
            <i aria-hidden="true" className="ph ph-plus" />
            Nova meta
          </Button>
        </div>
      </div>

      {gf && (
        <Card className="elev-md max-w-[720px] py-(--space-4) ring-1 ring-accent-600">
          <CardContent>
            <form className="flex flex-col gap-(--space-3)" onKeyDown={(e) => { if (e.key === "Escape") closeForm(); }} onSubmit={(e) => { e.preventDefault(); save(); }}>
              <CardTitle className={KICKER}>{gf.id ? "Editar meta" : month ? `Nova meta mensal · ${MESES[pm - 1]}` : `Nova meta anual · ${py}`}</CardTitle>
              <Field>
                <FieldLabel htmlFor={`${uid}-title`} className={LABEL}>Título</FieldLabel>
                <Input ref={titleRef} id={`${uid}-title`} maxLength={80} value={gf.title} onChange={(e) => patchForm({ title: e.target.value })} placeholder="ex.: Treinar 12 vezes" />
              </Field>
              {!gf.id && (
                <Field>
                  <FieldLabel id={`${uid}-kind`} className={LABEL}>Como medir</FieldLabel>
                  <ToggleGroup type="single" variant="outline" spacing={0} aria-labelledby={`${uid}-kind`} value={gf.kind} onValueChange={(v) => v && patchForm({ kind: v as Form["kind"] })}>
                    <ToggleGroupItem value="habit" className={SEG_ITEM}>
                      Vinculada a um hábito
                    </ToggleGroupItem>
                    <ToggleGroupItem value="manual" className={SEG_ITEM}>
                      Progresso manual
                    </ToggleGroupItem>
                  </ToggleGroup>
                </Field>
              )}
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-(--space-3)">
                {gf.kind === "habit" && (
                  <Field>
                    <FieldLabel htmlFor={`${uid}-habit`} className={LABEL}>Hábito</FieldLabel>
                    <Select value={gf.habitId} onValueChange={(v) => patchForm({ habitId: v })}>
                      <SelectTrigger id={`${uid}-habit`} className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {habits.map((o) => (
                          <SelectItem key={o.id} value={o.id}>
                            {o.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
                <Field>
                  <FieldLabel htmlFor={`${uid}-target`} className={LABEL}>{gf.kind === "habit" ? (gHabit?.type === "weekly" ? "Alvo (vezes)" : "Alvo (dias)") : "Alvo"}</FieldLabel>
                  <Input id={`${uid}-target`} type="number" min={1} max={gf.kind === "habit" ? 366 : MAX_GOAL} value={gf.target} onChange={(e) => patchForm({ target: Number(e.target.value) })} />
                </Field>
                {gf.kind === "manual" && (
                  <>
                    <Field>
                      <FieldLabel htmlFor={`${uid}-unit`} className={LABEL}>Unidade</FieldLabel>
                      <Input id={`${uid}-unit`} value={gf.unit} onChange={(e) => patchForm({ unit: e.target.value })} placeholder="livros, R$, km" />
                    </Field>
                    <Field>
                      <FieldLabel htmlFor={`${uid}-step`} className={LABEL}>Somar a cada toque</FieldLabel>
                      <Input id={`${uid}-step`} type="number" min={1} value={gf.step} onChange={(e) => patchForm({ step: Math.max(1, Number(e.target.value) || 1) })} />
                    </Field>
                  </>
                )}
              </div>
              <div className="flex gap-(--space-2)">
                <Button type="submit" disabled={invalid}>
                  Salvar meta
                </Button>
                <Button type="button" variant="outline" onClick={closeForm}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {!cards.length && !gf && (
        <div className="flex max-w-[560px] flex-col items-start gap-(--space-3)">
          <div className="flex flex-col gap-1.5">
            <h2 className="m-0 text-base font-medium text-neutral-200">{month ? "Nenhuma meta neste mês" : "Nenhuma meta neste ano"}</h2>
            <p className="m-0 text-sm text-neutral-300">
              {habits.length
                ? "Uma meta dá um destino à sua constância. Ligada a um hábito, o progresso se calcula sozinho."
                : "Uma meta dá um destino à sua constância. Sem hábitos ainda, você pode criar uma com progresso manual, como livros lidos ou dinheiro guardado."}
            </p>
          </div>
          <Button onClick={openForm}>
            <i aria-hidden="true" className="ph ph-plus" />
            Criar meta
          </Button>
        </div>
      )}

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-(--space-3)">
        {cards.map(({ g, h, value, pct, expected, done, unit, ahead }, idx) => {
          const showPace = isCurrent && !done;
          return (
            <Card key={g.id} size="sm" className={`py-(--space-4) ring-1 ${done ? "ring-accent-700" : "ring-transparent"}`}>
              <CardContent className="flex flex-col gap-(--space-3)">
                <div className="flex items-center gap-2">
                  <span className={`${KICKER} mr-auto`}>{g.kind === "habit" ? (h ? h.name : "Hábito removido") : "Manual"}</span>
                  {done && (
                    <Badge>
                      <i aria-hidden="true" className="ph ph-check mr-1" />
                      Concluída
                    </Badge>
                  )}
                  <Button variant="ghost" size="icon-sm" className="text-neutral-400 hover:text-neutral-400" onClick={() => openEdit(g)} aria-label={`Editar meta ${g.title}`}>
                    <i aria-hidden="true" className="ph ph-pencil-simple" />
                  </Button>
                  <Button
                    data-delete-goal
                    variant="ghost"
                    size="icon-sm"
                    className="text-neutral-400 hover:text-neutral-400"
                    onClick={() => {
                      removeGoal(g.id);
                      focusNeighbor("[data-delete-goal]", idx);
                    }}
                    aria-label={`Excluir meta ${g.title}`}
                  >
                    <i aria-hidden="true" className="ph ph-trash" />
                  </Button>
                </div>
                <CardTitle className="wrap-anywhere text-[17px] leading-[1.2]">{g.title}</CardTitle>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-[32px] leading-none font-medium tabular-nums">{unit === "R$" ? `R$ ${value}` : value}</span>
                  <span className="text-[13px] text-neutral-400">{unit === "R$" ? `de R$ ${g.target}` : `de ${g.target} ${unit}`}</span>
                </div>
                <div className="relative">
                  <Progress value={pct * 100} aria-label={g.title} className="h-1.5" />
                  {showPace && <div title="Ritmo esperado" className="absolute -top-1 -bottom-1 w-0.5 rounded-[1px] bg-neutral-200" style={{ left: `${frac * 100}%` }} />}
                </div>
                <div className="flex items-center gap-2">
                  <span className="mr-auto text-xs text-neutral-300">
                    {done
                      ? `${Math.round((value / g.target) * 100)}% concluído`
                      : isCurrent
                        ? ahead
                          ? `${Math.round(pct * 100)}% · no ritmo (esperado ${expected})`
                          : `${Math.round(pct * 100)}% · faltam ${expected - value} para o ritmo`
                        : `${Math.round(pct * 100)}%`}
                  </span>
                  {g.kind === "manual" && (
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="icon-sm" aria-label={`Diminuir ${g.title}`} onClick={() => patchGoal(g.id, (x) => ({ ...x, progress: Math.max(0, (x.progress || 0) - (x.step || 1)) }))}>
                        <i aria-hidden="true" className="ph ph-minus" />
                      </Button>
                      <Button size="icon-sm" aria-label={`Aumentar ${g.title}`} onClick={() => patchGoal(g.id, (x) => ({ ...x, progress: (x.progress || 0) + (x.step || 1) }))}>
                        <i aria-hidden="true" className="ph ph-plus" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
