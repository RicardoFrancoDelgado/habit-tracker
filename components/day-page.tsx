"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { Store } from "@/lib/use-store";
import { useEffect, useId, type RefObject } from "react";

const MOODS: [string, string][] = [
  ["Péssimo", "ph-smiley-x-eyes"],
  ["Ruim", "ph-smiley-sad"],
  ["Ok", "ph-smiley-meh"],
  ["Bom", "ph-smiley"],
  ["Ótimo", "ph-smiley-wink"],
];
const ENERGY = ["Muito baixa", "Baixa", "Média", "Alta", "Muito alta"];

export const NOTE_LIMIT = 4000;

/** The sheet of the day: how it felt at the top, the ruled lines to write on below. */
export function DayPage({
  store,
  day,
  complete,
  headingId,
  noteRef,
}: {
  store: Store;
  day: string;
  /** Every habit that counted was done. */
  complete: boolean;
  headingId: string;
  noteRef: RefObject<HTMLTextAreaElement | null>;
}) {
  const { data, setLog, saveState } = store;
  const uid = useId();
  const log = data?.logs[day];
  const mood = log?.mood || 0;
  const energy = log?.energy || 0;
  const note = log?.note ?? "";

  // The page grows with what is written, so the ruled lines always run to the last word.
  useEffect(() => {
    const fit = () => {
      const el = noteRef.current;
      if (!el) return;
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    fit();
    // The lines wrap differently when the window changes width.
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [note, noteRef]);

  return (
    <Card className="py-(--space-4) min-[945px]:py-(--space-6)">
      <CardContent className="flex flex-col gap-(--space-4) min-[945px]:px-(--space-6)">
      <h2 id={headingId} tabIndex={-1} className="sr-only">
        Folha do dia
      </h2>

      <div className="grid grid-cols-1 gap-(--space-4) min-[560px]:grid-cols-2">
        <div className="flex flex-col gap-2">
          <span id={`${uid}-mood`} className="text-xs text-neutral-300">
            Humor <span className="text-accent-300">{mood ? `· ${MOODS[mood - 1][0]}` : ""}</span>
          </span>
          <ToggleGroup
            type="single"
            aria-labelledby={`${uid}-mood`}
            value={mood ? String(mood) : ""}
            onValueChange={(v) =>
              setLog(day, (l) => {
                l.mood = v ? Number(v) : 0;
                return l;
              })
            }
            spacing={1.5}
            className="grid w-full grid-cols-5"
          >
            {MOODS.map(([label, icon], i) => (
              <ToggleGroupItem
                key={label}
                value={String(i + 1)}
                variant="outline"
                title={label}
                aria-label={label}
                className="h-10 rounded-md border-neutral-600 text-xl text-neutral-400 hover:text-neutral-400 data-[state=on]:border-primary data-[state=on]:bg-primary/14 data-[state=on]:text-primary pointer-coarse:h-11"
              >
                <i aria-hidden="true" className={`ph ${icon}`} />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
        <div className="flex flex-col gap-2">
          <span id={`${uid}-energy`} className="text-xs text-neutral-300">
            Energia <span className="text-accent-300">{energy ? `· ${ENERGY[energy - 1]}` : ""}</span>
          </span>
          <ToggleGroup
            type="single"
            aria-labelledby={`${uid}-energy`}
            value={energy ? String(energy) : ""}
            onValueChange={(v) =>
              setLog(day, (l) => {
                l.energy = v ? Number(v) : 0;
                return l;
              })
            }
            spacing={1.5}
            className="grid w-full grid-cols-5"
          >
            {ENERGY.map((label, i) => (
              <ToggleGroupItem
                key={label}
                value={String(i + 1)}
                variant="outline"
                title={label}
                aria-label={label}
                className="h-7 rounded-sm border-neutral-600 hover:bg-transparent data-[state=on]:bg-transparent pointer-coarse:h-11"
                style={
                  i < energy
                    ? { borderColor: "var(--primary)", background: `color-mix(in srgb, var(--primary) ${18 + i * 12}%, transparent)` }
                    : undefined
                }
              />
            ))}
          </ToggleGroup>
        </div>
        <Field className="max-w-[180px]">
          <FieldLabel htmlFor={`${uid}-sleep`} className="text-xs font-normal text-foreground/70">Horas de sono</FieldLabel>
          <Input
            id={`${uid}-sleep`}
            type="number"
            min={0}
            max={24}
            step={0.5}
            placeholder="ex.: 7,5"
            value={log?.sleep ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setLog(day, (l) => {
                l.sleep = v === "" ? "" : Math.min(24, Math.max(0, Number(v)));
                return l;
              });
            }}
          />
        </Field>
      </div>

      {complete && !note.trim() && (
        <p className="m-0 flex flex-wrap items-center gap-x-(--space-2) text-sm text-neutral-300">
          Dia concluído. Quer deixar uma linha sobre ele?
          <Button type="button" variant="ghost" className="text-[13px]" onClick={() => noteRef.current?.focus()}>
            Escrever
          </Button>
        </p>
      )}

      <div className="flex flex-col gap-1">
        <label htmlFor={`${uid}-note`} className="sr-only">
          Anotações do dia
        </label>
        <div className="notebook">
          <Textarea
            ref={noteRef}
            id={`${uid}-note`}
            className="notebook-text min-h-0 rounded-none border-0 bg-transparent px-0 py-0 shadow-none focus-visible:ring-0"
            placeholder="Como foi o dia?"
            maxLength={NOTE_LIMIT}
            value={note}
            onChange={(e) => {
              const v = e.target.value;
              setLog(day, (l) => {
                l.note = v;
                return l;
              });
            }}
          />
        </div>
        {note.length >= NOTE_LIMIT - 500 && <span className="text-right text-[11px] text-neutral-400 tabular-nums">{`restam ${NOTE_LIMIT - note.length} caracteres`}</span>}
      </div>

      <span className="flex items-center gap-1.5 text-[11px] text-neutral-500">
        <i aria-hidden="true" className={`ph ${saveState === "ok" ? "ph-check-circle" : "ph-warning-circle"}`} />
        {saveState === "ok" ? "Salvo neste navegador" : "Não está salvando"}
      </span>
      </CardContent>
    </Card>
  );
}
