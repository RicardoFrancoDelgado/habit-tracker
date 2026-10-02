"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { focusTitle } from "@/lib/focus";
import { useBumpKey } from "@/lib/motion";
import { DIAS, MESES, addDays, fmtNum, fmtShort, parse } from "@/lib/habits";
import { readShortcuts, writeShortcuts } from "@/lib/prefs";
import type { Store } from "@/lib/use-store";
import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { DayIndex } from "./day-index";
import { DayPage } from "./day-page";
import { FirstRun } from "./first-run";
import { HabitRow } from "./habit-row";
import { LevelMeter } from "./level-meter";

const longDate = (d: string) => {
  const dt = parse(d);
  return `${DIAS[dt.getDay()]}, ${dt.getDate()} de ${MESES[dt.getMonth()]}`;
};

/** The day's count and bar. Closing the day, not loading a closed one, lights the bar and lets a few lights leave it. */
function DayCount({ day, dn, total, pct }: { day: string; dn: number; total: number; pct: number }) {
  const complete = total > 0 && dn === total;
  const moved = useBumpKey(dn);
  const [prev, setPrev] = useState({ day, complete });
  const [burst, setBurst] = useState(0);
  if (prev.day !== day || prev.complete !== complete) {
    setPrev({ day, complete });
    if (prev.day === day && complete) setBurst((b) => b + 1);
    else if (prev.day !== day) setBurst(0);
  }
  return (
    <div className="mb-1 flex flex-col gap-(--space-2)">
      <div className="flex items-baseline gap-(--space-2)">
        <span className="text-[22px] leading-none font-medium tabular-nums">
          <span key={moved} className={moved ? "tick-in" : "inline-block"}>{dn}</span>
          {` de ${total}`}
        </span>
        <span className="text-sm text-neutral-300">{total === 1 ? "hábito concluído" : "hábitos concluídos"}</span>
      </div>
      <div className="relative flex items-center gap-(--space-3)">
        <div key={`bar${burst}`} className={`flex-1 ${burst ? "bar-flash" : ""}`}>
          <Progress value={pct} aria-label="Hábitos concluídos no dia" className="h-1.5" />
        </div>
        <span className="w-9 text-right text-xs text-neutral-400 tabular-nums">{`${pct}%`}</span>
        {burst > 0 && (
          <span key={`burst${burst}`} aria-hidden="true" className="burst" style={{ left: "40%" }}>
            {Array.from({ length: 14 }, (_, i) => {
              const a = (i / 14) * Math.PI * 2;
              const r = 22 + (i % 3) * 9;
              return <i key={i} style={{ "--dx": `${Math.cos(a) * r * 2}px`, "--dy": `${Math.sin(a) * r}px`, "--d": `${(i % 4) * 35}ms` } as CSSProperties} />;
            })}
          </span>
        )}
      </div>
      {complete && (
        <span className={`flex items-center gap-1.5 text-[13px] text-accent-300 ${burst ? "lit-in" : ""}`}>
          <i aria-hidden="true" className={`ph-fill ph-sparkle ${burst ? "glint" : ""}`} />
          Dia aceso
        </span>
      )}
    </div>
  );
}

export function TodayView({ store, goHabits }: { store: Store; goHabits: () => void }) {
  const { calc, data, today, setLog, update } = store;
  // Following "today" until the person turns back a page, so the notebook moves on at midnight.
  const [picked, setPicked] = useState<string | null>(null);
  const day = picked !== null && picked < today ? picked : today;
  const setDay = (d: string) => setPicked(d >= today ? null : d);
  const uid = useId();
  const [shortcuts, setShortcuts] = useState(readShortcuts);
  const [indexOpen, setIndexOpen] = useState(false);
  const noteRef = useRef<HTMLTextAreaElement>(null);
  // One polite region for quantity changes and page turns, instead of one per row.
  const [said, setSaid] = useState("");
  // A mark on a day before the habit started counting waits for the person to say how it should count.
  const [ask, setAsk] = useState<{ id: string; name: string; day: string; n: number } | null>(null);
  const askRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (ask) askRef.current?.focus();
  }, [ask]);
  // Pending habits first, decided when a day opens. It does not re-sort while you tick, so a row never moves under your finger.
  const [snap, setSnap] = useState({ key: "", ids: [] as string[] });
  const hasHabits = !!data?.habits.length;

  // Keyboard: ← → turn the page, 1 to 5 set the mood. Ignored while typing in a field.
  useEffect(() => {
    if (!hasHabits || !shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey || e.shiftKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
        e.preventDefault();
        const next = addDays(day, e.key === "ArrowLeft" ? -1 : 1);
        if (next > today) return;
        setPicked(next >= today ? null : next);
        setSaid(longDate(next));
      } else if (/^[1-5]$/.test(e.key)) {
        const n = Number(e.key);
        setLog(day, (l) => ({ ...l, mood: l.mood === n ? 0 : n }));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [hasHabits, shortcuts, day, today, setLog]);

  if (!calc || !data) return null;

  const { habits } = data;
  const dn = calc.doneOn(day);
  const total = Math.max(dn, calc.activeCount(day));
  const pct = total ? Math.round((dn / total) * 100) : 0;
  const diff = Math.round((parse(today).getTime() - parse(day).getTime()) / 864e5);
  const relative = diff === 0 ? "Hoje" : diff === 1 ? "Ontem" : `Há ${diff} dias`;

  const prev = addDays(day, -1);
  const next = addDays(day, 1);
  const prevLabel = prev === addDays(today, -1) ? "ontem" : fmtShort(prev);
  const nextLabel = day >= today ? "amanhã" : next === today ? "hoje" : fmtShort(next);
  const yesterday = addDays(today, -1);
  const yesterdayNote = day === today ? data.logs[yesterday]?.note.trim() : "";

  // Turning a page moves focus to the date, so a screen reader announces where you landed.
  const turn = (d: string) => {
    setDay(d);
    setIndexOpen(false);
    setTimeout(focusTitle, 0);
  };

  // Where ticking a habit leads: the month's goal for it, or the year's.
  const goalNote = (id: string) => {
    const h = habits.find((x) => x.id === id);
    const found = data.goals.filter((g) => g.kind === "habit" && g.habitId === id && ((g.scope === "month" && g.period === day.slice(0, 7)) || (g.scope === "year" && g.period === day.slice(0, 4))));
    const g = found.find((x) => x.scope === "month") ?? found[0];
    if (!h || !g) return undefined;
    const { days } = calc.periodDays(g.scope, g.period);
    const value = days.filter((d) => calc.hit(h, d)).length;
    return `${g.scope === "month" ? "Meta do mês" : "Meta do ano"}: ${value} de ${g.target} ${h.type === "weekly" ? (g.target === 1 ? "vez" : "vezes") : g.target === 1 ? "dia" : "dias"}`;
  };
  const record = (id: string, d: string, n: number) =>
    setLog(d, (l) => {
      l.h[id] = n;
      return l;
    });
  const finishAsk = (mode: "from-here" | "only-log" | "cancel") => {
    if (!ask) return;
    if (mode !== "cancel") {
      if (mode === "from-here") {
        update((d) => ({ ...d, habits: d.habits.map((x) => (x.id === ask.id && (!x.createdAt || ask.day < x.createdAt) ? { ...x, createdAt: ask.day } : x)) }));
      }
      record(ask.id, ask.day, ask.n);
    }
    setAsk(null);
    setTimeout(() => document.querySelector<HTMLElement>(`[data-habit="${ask.id}"]`)?.focus(), 0);
  };

  const snapKey = `${day}|${habits.map((h) => h.id).join(",")}`;
  if (snap.key !== snapKey) {
    const open = habits.filter((h) => !calc.done(h, day));
    const closed = habits.filter((h) => calc.done(h, day));
    setSnap({ key: snapKey, ids: [...open, ...closed].map((h) => h.id) });
  }
  const rank = new Map(snap.ids.map((id, i) => [id, i]));
  const ordered = [...habits].sort((a, b) => (rank.get(a.id) ?? 1e6) - (rank.get(b.id) ?? 1e6));

  const headingId = `${uid}-folha`;

  return (
    <div className="flex flex-col gap-(--space-4)">
      <div role="status" className="sr-only">
        {said}
      </div>

      <header className="flex flex-wrap items-end gap-(--space-3)">
        <div className="mr-auto flex flex-col gap-1">
          <h1 className="m-0 text-[30px] leading-tight font-medium tracking-tight">{longDate(day)}</h1>
          <p className="m-0 text-xs text-neutral-400">{relative}</p>
        </div>
        {hasHabits && (
          <div className="flex flex-wrap items-center gap-1.5">
            <Button type="button" variant="outline" onClick={() => turn(prev)}>
              <i aria-hidden="true" className="ph ph-caret-left" />
              <span className="sr-only">Voltar para </span>
              {prevLabel}
            </Button>
            <Button type="button" variant="outline" onClick={() => turn(next)} disabled={day >= today}>
              <span className="sr-only">Ir para </span>
              {nextLabel}
              <i aria-hidden="true" className="ph ph-caret-right" />
            </Button>
            <Button type="button" variant="ghost" aria-expanded={indexOpen} onClick={() => setIndexOpen((o) => !o)}>
              <i aria-hidden="true" className="ph ph-book-open-text" />
              Dias escritos
            </Button>
          </div>
        )}
      </header>

      {hasHabits && (
        <p className="m-0 hidden items-center gap-1 text-[11px] text-neutral-400 pointer-fine:flex">
          {shortcuts ? "Atalhos: ← → viram a página · 1 a 5 registram o humor ·" : "Atalhos de teclado desligados ·"}
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-[11px] font-normal underline-offset-2 underline"
            onClick={() => {
              writeShortcuts(!shortcuts);
              setShortcuts(!shortcuts);
            }}
          >
            {shortcuts ? "desligar" : "ligar"}
          </Button>
        </p>
      )}

      {!habits.length ? (
        <FirstRun store={store} goHabits={goHabits} />
      ) : (
        <>
          {yesterdayNote && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => turn(yesterday)}
              className="line-clamp-2 block h-auto w-full max-w-[720px] justify-start px-(--space-2) py-(--space-2) text-left text-sm font-normal whitespace-normal text-neutral-300 wrap-anywhere hover:bg-foreground/7 hover:text-neutral-300"
            >
              <span className="text-neutral-400">Ontem: </span>
              {`“${yesterdayNote}”`}
            </Button>
          )}

          {indexOpen && <DayIndex data={data} calc={calc} today={today} onOpen={turn} onClose={() => setIndexOpen(false)} />}

          <div className="grid items-start gap-(--space-6) min-[945px]:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
            <section aria-label="Hábitos do dia" className="flex flex-col gap-(--space-2)">
              {total ? (
                <DayCount day={day} dn={dn} total={total} pct={pct} />
              ) : (
                <span className="mb-1 text-sm text-neutral-300">Nenhum hábito contava neste dia.</span>
              )}
              <LevelMeter calc={calc} className="mb-1 min-[820px]:hidden" />
              {/* The margin and the sheet stack below about 945px, which puts the page far down a long list. */}
              <Button type="button" variant="ghost" className="self-start text-[13px] min-[945px]:hidden" onClick={() => document.getElementById(headingId)?.focus()}>
                <i aria-hidden="true" className="ph ph-arrow-down" />
                Ir para a folha do dia
              </Button>
              {ask && (
                <Card size="sm" role="group" aria-labelledby={`${uid}-ask`} className="py-(--space-3) ring-1 ring-accent-600">
                  <CardContent className="flex flex-col gap-(--space-3)">
                    <p id={`${uid}-ask`} className="m-0 text-sm text-neutral-200">
                      {`“${ask.name}” só começou a contar em ${fmtShort(calc.starts.get(ask.id) ?? today)}. Contar desde ${fmtShort(ask.day)}?`}
                    </p>
                    <div className="flex flex-wrap gap-(--space-2)">
                      <Button ref={askRef} type="button" onClick={() => finishAsk("from-here")}>
                        Contar desde aqui
                      </Button>
                      <Button type="button" variant="outline" onClick={() => finishAsk("only-log")}>
                        Só registrar
                      </Button>
                      <Button type="button" variant="ghost" onClick={() => finishAsk("cancel")}>
                        Cancelar
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
              {/* Keyed by day: turning a page replays the entrance, ticking a habit never does. */}
              <div key={day} className="contents">
              {ordered.map((h, i) => (
                <div key={h.id} className="row-in" style={{ "--i": i } as CSSProperties}>
                <HabitRow
                  habit={h}
                  value={calc.val(h, day)}
                  done={calc.done(h, day)}
                  counts={calc.active(h, day)}
                  goal={goalNote(h.id)}
                  weekCount={h.type === "weekly" ? calc.weekCount(h, day) : 0}
                  onChange={(n) => {
                    if (n > 0 && !calc.active(h, day)) {
                      setAsk({ id: h.id, name: h.name, day, n });
                      return;
                    }
                    record(h.id, day, n);
                    if (h.type === "qty") setSaid(`${h.name}: ${fmtNum(n)} de ${fmtNum(h.target)}${h.unit ? ` ${h.unit}` : ""}`);
                  }}
                />
                </div>
              ))}
              </div>
            </section>

            <div key={day} className="fade-in">
              <DayPage store={store} day={day} complete={total > 0 && dn === total} headingId={headingId} noteRef={noteRef} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
