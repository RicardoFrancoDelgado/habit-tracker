"use client";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Habit, HabitType, MAX_QTY, MAX_WEEKLY, addDays, fmtNum, fmtShort, level, normalizeStep, normalizeTarget } from "@/lib/habits";
import { daysSince } from "@/lib/backup";
import { focusNeighbor, focusTitle } from "@/lib/focus";
import type { Store } from "@/lib/use-store";
import { useId, useRef, useState } from "react";

const TYPES: [HabitType, string][] = [
  ["check", "Sim / não"],
  ["qty", "Quantidade"],
  ["weekly", "Semanal"],
];

const MAX_IMPORT = 5 * 1024 * 1024;

const KICKER = "text-[11px] font-normal tracking-[.1em] text-primary uppercase";
const LABEL = "text-xs font-normal text-foreground/70";

const EMPTY = { name: "", type: "check" as HabitType, target: 1, unit: "", step: 1 };

export function HabitsView({ store }: { store: Store }) {
  const { calc, data, today, update, notify, removeHabit, clearAll, exportFile, backupAt, importJson } = store;
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<{ id: string; name: string; target: number; unit: string; step: number } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const nameRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  if (!calc || !data) return null;

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (file.size > MAX_IMPORT) {
      setImportError("O arquivo é grande demais para ser um backup do Constância.");
      return;
    }
    setImportError(importJson(await file.text()));
  };

  const { habits } = data;
  const patch = (p: Partial<typeof EMPTY>) => setForm((f) => ({ ...f, ...p }));

  const add = () => {
    if (!form.name.trim()) return;
    const h: Habit = {
      id: "h" + Date.now(),
      name: form.name.trim(),
      type: form.type,
      target: normalizeTarget(form.type, form.target),
      unit: form.unit.trim(),
      createdAt: today,
    };
    if (form.type === "qty" && normalizeStep(form.step) !== 1) h.step = normalizeStep(form.step);
    update((d) => ({ ...d, habits: [...d.habits, h] }));
    notify({ text: `Adicionei o hábito “${h.name}”.` });
    setForm(EMPTY);
    nameRef.current?.focus();
  };

  const stopEditing = (id: string) => {
    setEditing(null);
    setTimeout(() => document.querySelector<HTMLElement>(`[data-edit-habit="${id}"]`)?.focus(), 0);
  };

  const saveEdit = () => {
    if (!editing || !editing.name.trim()) return;
    const { id, target, unit, step } = editing;
    const name = editing.name.trim();
    update((d) => ({
      ...d,
      habits: d.habits.map((x) => {
        if (x.id !== id) return x;
        const next = { ...x, name, target: normalizeTarget(x.type, target), unit: x.type === "qty" ? unit.trim() : x.unit };
        if (x.type === "qty") {
          if (normalizeStep(step) !== 1) next.step = normalizeStep(step);
          else delete next.step;
        }
        return next;
      }),
    }));
    notify({ text: `Atualizei o hábito “${name}”.` });
    stopEditing(id);
  };


  return (
    <div className="flex flex-col gap-(--space-6)">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-widest text-primary">{`${habits.length} ${habits.length === 1 ? "ativo" : "ativos"}`}</span>
        <h1 className="m-0 text-[30px] leading-tight font-medium">Hábitos</h1>
      </header>

      <Card className="max-w-[720px] py-(--space-4)">
        <CardContent>
          <form className="flex flex-col gap-(--space-3)" onSubmit={(e) => { e.preventDefault(); add(); }}>
            <CardTitle className={KICKER}>Novo hábito</CardTitle>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,200px),1fr))] items-end gap-(--space-3)">
              <Field className="col-span-full">
                <FieldLabel htmlFor={`${uid}-name`} className={LABEL}>Nome</FieldLabel>
                <Input ref={nameRef} id={`${uid}-name`} maxLength={60} value={form.name} onChange={(e) => patch({ name: e.target.value })} placeholder="ex.: Beber água, Ler, Correr" />
              </Field>
              <Field className="col-span-full">
                <FieldLabel id={`${uid}-type`} className={LABEL}>Tipo</FieldLabel>
                <ToggleGroup
                  type="single"
                  variant="outline"
                  spacing={0}
                  aria-labelledby={`${uid}-type`}
                  value={form.type}
                  onValueChange={(k) => k && patch({ type: k as HabitType, target: k === "qty" ? 8 : k === "weekly" ? 3 : 1 })}
                >
                  {TYPES.map(([k, l]) => (
                    <ToggleGroupItem key={k} value={k} className="h-9 px-3 text-[13px] font-normal data-[state=on]:bg-transparent data-[state=on]:text-primary data-[state=on]:ring-1 data-[state=on]:ring-primary data-[state=on]:ring-inset pointer-coarse:min-h-11">
                      {l}
                    </ToggleGroupItem>
                  ))}
                </ToggleGroup>
              </Field>
              {form.type !== "check" && (
                <Field>
                  <FieldLabel htmlFor={`${uid}-target`} className={LABEL}>{form.type === "qty" ? "Meta por dia" : "Vezes por semana"}</FieldLabel>
                  <Input id={`${uid}-target`} type="number" min={form.type === "qty" ? 0.1 : 1} max={form.type === "qty" ? MAX_QTY : MAX_WEEKLY} step={form.type === "qty" ? 0.1 : 1} value={form.target || ""} required onChange={(e) => patch({ target: Number(e.target.value) })} />
                </Field>
              )}
              {form.type === "qty" && (
                <Field>
                  <FieldLabel htmlFor={`${uid}-unit`} className={LABEL}>Unidade</FieldLabel>
                  <Input id={`${uid}-unit`} value={form.unit} onChange={(e) => patch({ unit: e.target.value })} placeholder="copos, páginas, km" />
                </Field>
              )}
              {form.type === "qty" && (
                <Field>
                  <FieldLabel htmlFor={`${uid}-step`} className={LABEL}>Quanto somar a cada toque</FieldLabel>
                  <Input id={`${uid}-step`} type="number" min={0.1} max={MAX_QTY} step={0.1} value={form.step || ""} required onChange={(e) => patch({ step: Number(e.target.value) })} placeholder="1" />
                </Field>
              )}
            </div>
            <div>
              <Button type="submit" disabled={!form.name.trim()}>
                <i aria-hidden="true" className="ph ph-plus" />
                Adicionar hábito
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="flex flex-col gap-(--space-2)">
        {!habits.length && <p className="m-0 max-w-[720px] text-sm text-neutral-300">Nenhum hábito ainda. Adicione o primeiro acima; ele aparece em Hoje para você marcar.</p>}
        {habits.map((h, idx) => {
          const st = calc.streak(h);
          const r30 = calc.rate30(h);
          const days = calc.since(h);
          const started = days === 0 ? "Começou hoje" : days === 1 ? "Começou ontem" : `Começou há ${days} dias`;
          const rateText = r30 === null ? started : `${Math.round(r30 * 100)}% em 30 dias`;
          const n30 = Array.from({ length: 30 }, (_, i) => addDays(today, i - 29)).filter((d) => calc.score(d, h.id) === 1).length;
          const typeLabel = h.type === "qty" ? `${fmtNum(h.target)} ${h.unit || ""} por dia`.replace("  ", " ") : h.type === "weekly" ? `${h.target}x por semana` : "Diário";
          if (editing?.id === h.id) {
            const patchEdit = (p: Partial<NonNullable<typeof editing>>) => setEditing((e) => (e ? { ...e, ...p } : e));
            return (
              <Card key={h.id} size="sm">
                <CardContent>
                  <form
                    className="flex flex-col gap-(--space-3)"
                    onSubmit={(e) => {
                      e.preventDefault();
                      saveEdit();
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") stopEditing(h.id);
                    }}
                  >
                    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] items-end gap-(--space-3)">
                      <Field className="col-span-full">
                        <FieldLabel htmlFor={`${uid}-e-name`} className={LABEL}>Nome</FieldLabel>
                        <Input id={`${uid}-e-name`} maxLength={60} autoFocus value={editing.name} onChange={(e) => patchEdit({ name: e.target.value })} />
                      </Field>
                      {h.type !== "check" && (
                        <Field>
                          <FieldLabel htmlFor={`${uid}-e-target`} className={LABEL}>{h.type === "qty" ? "Meta por dia" : "Vezes por semana"}</FieldLabel>
                          <Input id={`${uid}-e-target`} type="number" min={h.type === "qty" ? 0.1 : 1} max={h.type === "qty" ? MAX_QTY : MAX_WEEKLY} step={h.type === "qty" ? 0.1 : 1} value={editing.target || ""} required onChange={(e) => patchEdit({ target: Number(e.target.value) })} />
                        </Field>
                      )}
                      {h.type === "qty" && (
                        <Field>
                          <FieldLabel htmlFor={`${uid}-e-unit`} className={LABEL}>Unidade</FieldLabel>
                          <Input id={`${uid}-e-unit`} value={editing.unit} onChange={(e) => patchEdit({ unit: e.target.value })} />
                        </Field>
                      )}
                      {h.type === "qty" && (
                        <Field>
                          <FieldLabel htmlFor={`${uid}-e-step`} className={LABEL}>Quanto somar a cada toque</FieldLabel>
                          <Input id={`${uid}-e-step`} type="number" min={0.1} max={MAX_QTY} step={0.1} value={editing.step || ""} required onChange={(e) => patchEdit({ step: Number(e.target.value) })} />
                        </Field>
                      )}
                    </div>
                    <div className="flex gap-(--space-2)">
                      <Button type="submit" disabled={!editing.name.trim()}>
                        Salvar
                      </Button>
                      <Button type="button" variant="outline" onClick={() => stopEditing(h.id)}>
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            );
          }
          return (
            <Card key={h.id} size="sm">
              <CardContent className="grid grid-cols-1 items-center gap-(--space-3) min-[560px]:grid-cols-[minmax(0,1fr)_auto]">
                <div className="flex min-w-0 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="wrap-anywhere text-[15px]">{h.name}</span>
                    <Badge variant="secondary">{typeLabel}</Badge>
                  </div>
                  <div role="img" aria-label={`Últimos 30 dias de ${h.name}: ${n30} ${n30 === 1 ? "dia concluído" : "dias concluídos"}`} className="grid max-w-[420px] grid-cols-[repeat(30,minmax(0,1fr))] gap-0.5">
                    {Array.from({ length: 30 }, (_, i) => {
                      const d = addDays(today, i - 29);
                      return <span key={d} title={fmtShort(d)} className="aspect-square rounded-[2px]" style={{ background: level(calc.score(d, h.id)) }} />;
                    })}
                  </div>
                  <span className="text-xs text-neutral-400">{st.cur > 0 ? `Sequência ${st.curL} · ${rateText}` : rateText}</span>
                </div>
                <div className="flex flex-wrap justify-start gap-1 min-[560px]:justify-end">
                  <Button
                    data-edit-habit={h.id}
                    variant="ghost"
                    className="text-[13px]"
                    onClick={() => setEditing({ id: h.id, name: h.name, target: h.target, unit: h.unit, step: h.step ?? 1 })}
                    aria-label={`Editar ${h.name}`}
                  >
                    <i aria-hidden="true" className="ph ph-pencil-simple" />
                    Editar
                  </Button>
                  <Button
                    data-delete-habit
                    variant="ghost"
                    className="text-[13px]"
                    onClick={() => {
                      removeHabit(h.id);
                      focusNeighbor("[data-delete-habit]", idx);
                    }}
                    aria-label={`Excluir ${h.name}`}
                  >
                    <i aria-hidden="true" className="ph ph-trash" />
                    Excluir
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </section>

      <Card className="max-w-[720px] py-(--space-4)">
        <CardContent className="flex flex-col gap-(--space-3)">
          <h2 className="m-0 text-base font-medium text-neutral-200">Seus dados</h2>
          <p className="m-0 text-sm text-neutral-300">
            Tudo fica salvo só neste navegador. Exporte uma cópia para guardar ou levar para outro aparelho.{" "}
            {backupAt ? `Última cópia: ${daysSince(backupAt) === 0 ? "hoje" : daysSince(backupAt) === 1 ? "ontem" : `há ${daysSince(backupAt)} dias`}.` : "Você ainda não exportou uma cópia."}
          </p>
          <div className="flex flex-wrap items-center gap-(--space-2)">
            <Button variant="outline" onClick={exportFile}>
              <i aria-hidden="true" className="ph ph-download-simple" />
              Exportar
            </Button>
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <i aria-hidden="true" className="ph ph-upload-simple" />
              Importar
            </Button>
            <Input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={onFile} aria-label="Arquivo de dados para importar" />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" className="text-[13px]">
                  <i aria-hidden="true" className="ph ph-trash" />
                  Apagar tudo
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Apagar todos os hábitos, registros e metas?</AlertDialogTitle>
                  <AlertDialogDescription>Isso remove tudo o que está salvo neste navegador. Exporte uma cópia antes se quiser guardar.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      clearAll();
                      focusTitle();
                    }}
                  >
                    Apagar tudo
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
          {importError && (
            <p role="alert" className="m-0 text-sm text-accent-300">
              {importError}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
