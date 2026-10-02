"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Toggle } from "@/components/ui/toggle";
import { useBumpKey, useLitKey } from "@/lib/motion";
import { MAX_QTY, MAX_WEEKLY, fmtNum as fmt, round1 } from "@/lib/habits";
import type { Habit } from "@/lib/habits";
import { useEffect, useRef, useState } from "react";

type Props = {
  habit: Habit;
  value: number;
  done: boolean;
  weekCount: number;
  /** False on a day before the habit started counting. */
  counts: boolean;
  /** Progress of the goal this habit feeds, when there is one for the period. */
  goal?: string;
  onChange: (n: number) => void;
};


export function HabitRow(props: Props) {
  return props.habit.type === "qty" ? <QtyRow {...props} /> : <ToggleRow {...props} />;
}

/** Sim/não and weekly habits: the whole row is the control. */
function ToggleRow({ habit: h, value: v, done, weekCount: wc, counts, goal, onChange }: Props) {
  const weekly = h.type === "weekly";
  const on = done;
  const lit = useLitKey(on);
  return (
    <Toggle
      data-habit={h.id}
      pressed={on}
      onPressedChange={() => onChange(v >= 1 ? 0 : 1)}
      className={`h-auto w-full justify-start gap-(--space-3) rounded-md border bg-card p-(--space-3) text-left font-normal whitespace-normal text-foreground transition-[background-color,border-color,transform] duration-200 active:scale-[0.99] ${on && lit ? "row-warm" : ""} hover:bg-[color-mix(in_srgb,var(--card)_92%,var(--foreground))] data-[state=on]:bg-card aria-pressed:bg-card`}
      style={{ borderColor: done ? "var(--color-accent-600)" : "transparent" }}
    >
      <span
        className="relative grid size-[30px] flex-none place-items-center rounded-sm border-[1.5px] text-bg transition-[background-color,border-color,box-shadow] duration-200"
        style={{
          borderColor: on ? "var(--primary)" : "var(--color-neutral-600)",
          background: on ? "var(--primary)" : "transparent",
          boxShadow: on ? "0 0 12px color-mix(in srgb, var(--primary) 55%, transparent)" : "none",
        }}
      >
        {on && lit > 0 && <span key={lit} aria-hidden="true" className="light-ring" />}
        <i key={on ? lit : "off"} aria-hidden="true" className={`ph-bold ph-check text-[15px] ${on && lit ? "check-pop" : ""}`} style={{ opacity: on ? 1 : 0 }} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="wrap-anywhere text-[15px]">{h.name}</span>
        <span className="text-xs text-neutral-400">{!counts ? "Ainda não contava neste dia" : weekly ? `${wc} de ${h.target} nesta semana${on ? "" : " · folga não custa nada"}` : "Diário"}</span>
        {goal && <GoalNote text={goal} />}
      </span>
      {weekly && (
        <span className="flex gap-[3px]" aria-hidden="true">
          {Array.from({ length: Math.min(h.target, MAX_WEEKLY) }, (_, i) => (
            <span key={i} className="size-2 rounded-full" style={{ background: i < wc ? "var(--primary)" : "var(--color-neutral-600)" }} />
          ))}
        </span>
      )}
    </Toggle>
  );
}

/** Quantity habits: − and + for small steps, and a tap on the count to type the exact number. */
function QtyRow({ habit: h, value: v, done, counts, goal, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const counter = useRef<HTMLButtonElement>(null);
  const cancelled = useRef(false);
  const refocus = useRef(false);
  const unit = h.unit ? ` ${h.unit}` : "";
  const step = h.step ?? 1;
  const bump = useBumpKey(v);
  const lit = useLitKey(done);

  useEffect(() => {
    if (editing) input.current?.select();
    else if (refocus.current) {
      refocus.current = false;
      counter.current?.focus();
    }
  }, [editing]);

  const start = () => {
    cancelled.current = false;
    setDraft(String(v));
    setEditing(true);
  };

  // Leaving the field by tapping elsewhere commits the number and leaves focus where the person put it;
  // only Enter and Escape bring focus back to the counter.
  const finish = () => {
    if (!cancelled.current) {
      const n = Number(draft.replace(",", "."));
      if (draft.trim() !== "" && Number.isFinite(n) && n >= 0) onChange(Math.min(MAX_QTY, round1(n)));
    }
    setEditing(false);
  };

  return (
    <Card size="sm" className={`@container relative flex-row flex-wrap items-center gap-(--space-3) px-(--space-3) py-(--space-3) ring-1 transition-colors duration-200 ${done ? "ring-accent-600" : "ring-transparent"} ${done && lit ? "row-warm row-glow" : ""}`}>
      <div className="flex min-w-0 flex-1 basis-0 flex-col gap-0.5 @max-[400px]:basis-full">
        <span className="wrap-anywhere text-[15px]">{h.name}</span>
        <span className="text-xs text-neutral-400">{counts ? `Meta diária: ${fmt(h.target)}${unit}` : "Ainda não contava neste dia"}</span>
        {goal && <GoalNote text={goal} />}
      </div>
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="icon-sm" onClick={() => onChange(Math.max(0, round1(v - step)))} aria-label={`Diminuir ${h.name} em ${fmt(step)}${unit}`}>
          <i aria-hidden="true" className="ph ph-minus" />
        </Button>
        {editing ? (
          <Input
            ref={input}
            className="h-8 min-h-8 w-16 px-1.5 py-1 text-center tabular-nums pointer-coarse:min-h-11"
            type="number"
            inputMode="decimal"
            min={0}
            max={MAX_QTY}
            step={0.1}
            value={draft}
            aria-label={`${h.name}: quantidade do dia`}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={finish}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                refocus.current = true;
                e.currentTarget.blur();
              }
              if (e.key === "Escape") {
                cancelled.current = true;
                refocus.current = true;
                e.currentTarget.blur();
              }
            }}
          />
        ) : (
          <Button
            ref={counter}
            variant="ghost"
            data-habit={h.id}
            className="h-8 min-w-16 px-1.5 text-center text-sm font-normal tabular-nums hover:bg-foreground/7"
            style={{ color: done ? "var(--color-accent-300)" : "var(--color-text)" }}
            onClick={start}
            aria-label={`${fmt(v)}/${fmt(h.target)}${unit}, ${h.name}. Digitar valor`}
          >
            <span key={bump} className={bump ? "nudge" : "inline-block"}>{`${fmt(v)}/${fmt(h.target)}`}</span>
          </Button>
        )}
        <Button size="icon-sm" onClick={() => onChange(Math.min(MAX_QTY, round1(v + step)))} aria-label={`Aumentar ${h.name} em ${fmt(step)}${unit}`}>
          <i aria-hidden="true" className="ph ph-plus" />
        </Button>
      </div>
    </Card>
  );
}

/** The goal this habit feeds, so ticking it shows where it leads. */
function GoalNote({ text }: { text: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-neutral-300">
      <i aria-hidden="true" className="ph ph-target" />
      {text}
    </span>
  );
}
