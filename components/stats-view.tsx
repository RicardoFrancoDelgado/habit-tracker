"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ACHIEVEMENTS, earned, readReached } from "@/lib/gamification";
import { useCountUp } from "@/lib/motion";
import { MESES, addDays, fmtShort, level, parse, weekStart } from "@/lib/habits";
import type { Store } from "@/lib/use-store";
import { useMemo, useState, type CSSProperties } from "react";

const H2 = "m-0 text-base font-medium";
const MUTED = "var(--color-neutral-400)";

/** A KPI value that counts up once when the screen opens: "73%" rises through 0 to 73, "—" stays as it is. */
function KpiValue({ value }: { value: string }) {
  const m = /^(\d+(?:,\d+)?)(.*)$/.exec(value);
  const n = m ? Number(m[1].replace(",", ".")) : 0;
  const decimals = m && m[1].includes(",") ? 1 : 0;
  const v = useCountUp(n);
  if (!m) return <>{value}</>;
  return <>{`${v.toFixed(decimals).replace(".", ",")}${m[2]}`}</>;
}

/** What has been reached, in the same quiet voice as the rest: what is still dark just says how to light it. */
function Achievements({ store }: { store: Store }) {
  const { calc } = store;
  const have = useMemo(() => {
    const now = calc ? earned(calc) : new Set<string>();
    return new Set([...(readReached() ?? []), ...now]);
  }, [calc]);
  return (
    <Card className="py-(--space-4)">
      <CardContent className="flex flex-col gap-(--space-3)">
        <div className="flex items-baseline gap-(--space-2)">
          <h2 className={`${H2} mr-auto`}>Conquistas</h2>
          <span className="text-xs text-neutral-400 tabular-nums">{`${have.size} de ${ACHIEVEMENTS.length}`}</span>
        </div>
        <ul className="m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(100%,210px),1fr))] gap-(--space-2) p-0">
          {ACHIEVEMENTS.map((a, i) => {
            const on = have.has(a.id);
            return (
              <li key={a.id} className="badge-in flex items-start gap-(--space-3) rounded-md px-(--space-2) py-(--space-2)" style={{ "--i": i } as CSSProperties}>
                <span
                  aria-hidden="true"
                  className="grid size-9 flex-none place-items-center rounded-md border text-lg"
                  style={on ? { borderColor: "var(--color-accent-600)", color: "var(--primary)", boxShadow: "0 0 12px color-mix(in srgb, var(--primary) 35%, transparent)" } : { borderColor: "var(--color-neutral-600)", color: "var(--color-neutral-500)" }}
                >
                  <i className={`ph ${on ? a.icon : "ph-lock-simple"}`} />
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className={`text-sm ${on ? "text-foreground" : "text-neutral-300"}`}>{a.title}</span>
                  <span className="text-xs text-neutral-400">{on ? "Conquistada" : a.hint}</span>
                </span>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}

export function StatsView({ store, goToday }: { store: Store; goToday: () => void }) {
  const { calc, data, today: T } = store;
  const [heatHabit, setHeatHabit] = useState("all");
  if (!calc || !data) return null;

  const { habits, logs } = data;
  // The day in progress stays out of the averages until it is complete, so a half-done morning never drags them down.
  const scoreOf = (d: string) => {
    const v = calc.score(d);
    return d === T && v !== null && v < 1 ? null : v;
  };
  const only = heatHabit === "all" ? null : heatHabit;

  /* heatmap */
  const start = addDays(weekStart(T), -25 * 7);
  const cells: { bg: string; title: string; outline: string; key: string }[] = [];
  let fullDays = 0;
  // Whether anything was ever done, over every habit, so picking one habit in the map never hides the screen.
  const anyDone = Object.keys(logs).some((d) => calc.doneOn(d) > 0);
  const months: string[] = [];
  let lastM = -1;
  for (let w = 0; w < 26; w++) {
    const ws = addDays(start, w * 7);
    const m = parse(ws).getMonth();
    months.push(m !== lastM ? MESES[m].slice(0, 3) : "");
    lastM = m;
    for (let i = 0; i < 7; i++) {
      const d = addDays(ws, i);
      const fut = d > T;
      const sc = fut ? null : calc.score(d, only);
      if (sc === 1) fullDays++;
      cells.push({ key: d, bg: fut ? "transparent" : level(sc), title: fut ? "" : `${fmtShort(d)} · ${Math.round((sc || 0) * 100)}%`, outline: d === T ? "1px solid var(--primary)" : "none" });
    }
  }

  /* KPIs */
  const avg = (a: number, b: number) => {
    let t = 0;
    let n = 0;
    for (let i = a; i < b; i++) {
      const sc = scoreOf(addDays(T, -i));
      if (sc != null) {
        t += sc;
        n++;
      }
    }
    return n ? t / n : null;
  };
  const r7 = avg(0, 7);
  const p7 = avg(7, 14);
  const r30 = avg(0, 30);
  const topCur = habits
    .map((h) => ({ h, st: calc.streak(h) }))
    .filter((x) => x.h.type !== "weekly")
    .sort((a, b) => b.st.cur - a.st.cur)[0];
  let moodT = 0;
  let moodN = 0;
  for (let i = 0; i < 30; i++) {
    const l = logs[addDays(T, -i)];
    if (l && l.mood) {
      moodT += l.mood;
      moodN++;
    }
  }
  const delta = r7 !== null && p7 !== null ? Math.round((r7 - p7) * 100) : null;
  const kpis = [
    { label: "Conclusão em 30 dias", value: r30 === null ? "—" : `${Math.round(r30 * 100)}%`, sub: "média diária de todos os hábitos", subColor: MUTED },
    { label: "Últimos 7 dias", value: r7 === null ? "—" : `${Math.round(r7 * 100)}%`, sub: delta === null ? "primeira semana, sem comparação" : delta === 0 ? "igual à semana anterior" : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${Math.abs(delta) === 1 ? "ponto" : "pontos"} vs. semana anterior`, subColor: MUTED },
    { label: "Maior sequência atual", value: topCur && topCur.st.cur > 0 ? String(topCur.st.cur) : "—", sub: topCur && topCur.st.cur > 0 ? `dias · ${topCur.h.name}` : "nenhuma ativa", subColor: MUTED },
    { label: "Humor médio · 30 dias", value: moodN ? (moodT / moodN).toFixed(1).replace(".", ",") : "—", sub: "escala de 1 a 5", subColor: MUTED },
  ];

  /* weekly bars */
  const cw = weekStart(T);
  const weekBars = Array.from({ length: 12 }, (_, i) => {
    const ws = addDays(cw, (i - 11) * 7);
    let t = 0;
    let n = 0;
    for (let k = 0; k < 7; k++) {
      const d = addDays(ws, k);
      if (d > T) break;
      const sc = scoreOf(d);
      if (sc != null) {
        t += sc;
        n++;
      }
    }
    const has = n > 0;
    const v = has ? t / n : 0;
    const cur = i === 11;
    return { has, h: `${Math.max(2, v * 100)}%`, val: Math.round(v * 100), label: fmtShort(ws), title: has ? `Semana de ${fmtShort(ws)}` : `Semana de ${fmtShort(ws)}: sem hábitos ainda`, bg: !has ? "var(--color-neutral-800)" : cur ? "var(--primary)" : "var(--color-accent-700)", glow: cur ? "0 0 12px color-mix(in srgb, var(--primary) 50%, transparent)" : "none" };
  });

  /* trend */
  type Pt = [number, number] | null;
  const pts: Pt[] = [];
  const mp: Pt[] = [];
  for (let i = 29; i >= 0; i--) {
    let t = 0;
    let n = 0;
    let mt = 0;
    let mn = 0;
    for (let k = 0; k < 7; k++) {
      const d = addDays(T, -(i + k));
      const sc = scoreOf(d);
      if (sc != null) {
        t += sc;
        n++;
      }
      const l = logs[d];
      if (l && l.mood) {
        mt += l.mood;
        mn++;
      }
    }
    const x = ((29 - i) / 29) * 300;
    pts.push(n ? [x, 100 - (t / n) * 100] : null);
    mp.push(mn ? [x, 100 - ((mt / mn - 1) / 4) * 100] : null);
  }
  // Days with nothing to measure leave a gap instead of a drop to zero.
  const line = (p: Pt[]) => {
    let pen = false;
    return p
      .map((q) => {
        if (!q) {
          pen = false;
          return "";
        }
        const seg = `${pen ? "L" : "M"}${q[0].toFixed(1)} ${q[1].toFixed(1)}`;
        pen = true;
        return seg;
      })
      .filter(Boolean)
      .join(" ");
  };
  const known = pts.filter((q): q is [number, number] => q !== null);
  const trendLabels = [fmtShort(addDays(T, -29)), fmtShort(addDays(T, -15)), "hoje"];

  if (!habits.length || !anyDone) {
    return (
      <div className="flex flex-col gap-(--space-6)">
        <header className="flex flex-col gap-1">
          <span className="text-[11px] uppercase tracking-widest text-primary">Visão geral</span>
          <h1 className="m-0 text-[30px] leading-tight font-medium">Estatísticas</h1>
        </header>
        <div className="flex max-w-[560px] flex-col items-start gap-(--space-3)">
          <div className="flex flex-col gap-1.5">
            <h2 className={`${H2} text-neutral-200`}>{habits.length ? "Ainda não há o que mostrar" : "As estatísticas aparecem com os primeiros hábitos"}</h2>
            <p className="m-0 text-sm text-neutral-300">
              {habits.length
                ? "Assim que você marcar um hábito, o mapa de consistência, as semanas e a tendência começam a se desenhar aqui. Dias antes de cada hábito existir não contam contra você."
                : "Crie um hábito e marque o dia. Aqui você verá o mapa de consistência, as semanas e a tendência, contados só a partir de quando cada hábito começou."}
            </p>
          </div>
          <Button onClick={goToday}>
            {habits.length ? "Ir para Hoje" : "Começar por Hoje"}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-(--space-6)">
      <header className="flex flex-col gap-1">
        <span className="text-[11px] uppercase tracking-widest text-primary">Visão geral</span>
        <h1 className="m-0 text-[30px] leading-tight font-medium">Estatísticas</h1>
      </header>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,160px),1fr))] gap-(--space-3)">
        {kpis.map((k) => (
          <div key={k.label} className="flex flex-col gap-1.5 py-(--space-2)">
            <span className="text-xs text-neutral-400">{k.label}</span>
            <span className="text-[34px] leading-none font-medium tabular-nums"><KpiValue value={k.value} /></span>
            <span className="text-xs" style={{ color: k.subColor }}>
              {k.sub}
            </span>
          </div>
        ))}
      </div>

      <Card className="py-(--space-4)">
        <CardContent className="flex flex-col gap-(--space-3)">
        <div className="flex flex-wrap items-center gap-(--space-2)">
          <h2 className={`${H2} mr-auto`}>Mapa de consistência</h2>
          <Select value={heatHabit} onValueChange={setHeatHabit}>
            <SelectTrigger aria-label="Hábito exibido no mapa" className="min-w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os hábitos</SelectItem>
              {habits.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="overflow-x-auto pt-(--space-2)">
          <div role="img" aria-label={`Mapa dos últimos 6 meses: ${fullDays} ${fullDays === 1 ? "dia" : "dias"} com ${only ? "o hábito concluído" : "todos os hábitos concluídos"}.`} className="grid min-w-[520px] grid-cols-[24px_minmax(0,1fr)] gap-1.5">
            <span />
            <div className="grid grid-cols-[repeat(26,minmax(0,1fr))] gap-[3px]">
              {months.map((m, i) => (
                <span key={i} className="overflow-visible text-[11px] whitespace-nowrap text-neutral-400">
                  {m}
                </span>
              ))}
            </div>
            <div className="grid grid-rows-[repeat(7,minmax(0,1fr))] gap-[3px] text-[11px] text-neutral-500">
              <span>seg</span>
              <span />
              <span>qua</span>
              <span />
              <span>sex</span>
              <span />
              <span>dom</span>
            </div>
            <div className="grid grid-flow-col grid-cols-[none] auto-cols-[minmax(0,1fr)] grid-rows-[repeat(7,auto)] gap-[3px]">
              {cells.map((c, i) => (
                <span key={c.key} title={c.title} className="cell-in aspect-square rounded-[2px]" style={{ background: c.bg, outline: c.outline, outlineOffset: 1, "--w": Math.floor(i / 7) } as CSSProperties} />
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[11px] text-neutral-400">
          <span className="mr-1">menos</span>
          {["neutral-800", "accent-700", "accent-600", "accent-500", "accent-300", "accent-100"].map((c) => (
            <span key={c} className="size-2.5 rounded-[2px]" style={{ background: `var(--color-${c})` }} />
          ))}
          <span className="ml-1">mais</span>
        </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,400px),1fr))] gap-(--space-3)">
        <Card className="py-(--space-4)">
          <CardContent className="flex flex-col gap-(--space-3)">
          <div className="flex flex-col gap-0.5">
            <h2 className={H2}>Conclusão por semana</h2>
            <span className="text-xs text-neutral-400">Média diária de cada semana, em %</span>
          </div>
          <div role="img" aria-label={`Conclusão por semana, de ${weekBars[0].label} a hoje: ${weekBars.map((b) => `${b.label} ${b.has ? `${b.val}%` : "sem dados"}`).join(", ")}.`} className="flex h-[170px] items-end gap-1.5 pt-[18px]">
            {weekBars.map((b, i) => (
              <div key={i} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
                <span className="text-[11px] text-neutral-300 tabular-nums">{b.has ? b.val : "–"}</span>
                <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                  <div title={b.title} className="rise w-full max-w-7 rounded-t-sm rounded-b-[1px]" style={{ height: b.h, background: b.bg, boxShadow: b.glow, "--i": i } as CSSProperties} />
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            {weekBars.map((b, i) => (
              <span key={i} className="min-w-0 flex-1 overflow-visible text-center text-[11px] whitespace-nowrap text-neutral-500">
                {i % 2 === 1 ? b.label : ""}
              </span>
            ))}
          </div>
          </CardContent>
        </Card>

        <Card className="py-(--space-4)">
          <CardContent className="flex flex-col gap-(--space-3)">
          <div className="flex flex-wrap items-start gap-(--space-2)">
            <div className="mr-auto flex flex-col gap-0.5">
              <h2 className={H2}>Tendência · 30 dias</h2>
              <span className="text-xs text-neutral-400">Média móvel de 7 dias</span>
            </div>
            <div className="flex gap-3 text-[11px] text-neutral-300">
              <span className="flex items-center gap-[5px]">
                <span className="h-0.5 w-3 bg-primary" />
                Conclusão
              </span>
              <span className="flex items-center gap-[5px]">
                <span className="h-0 w-3 border-t-2 border-dashed border-neutral-300" />
                Humor
              </span>
            </div>
          </div>
          <div role="img" aria-label={`Tendência de 30 dias: conclusão média de ${known.length ? Math.round(100 - known[0][1]) : 0}% para ${known.length ? Math.round(100 - known[known.length - 1][1]) : 0}%.`} className="relative h-[170px]">
            <div className="pointer-events-none absolute inset-0 flex flex-col justify-between">
              {["100%", "50%", ""].map((l, i) => (
                <span key={i} className="border-t border-text/7 text-[11px] text-neutral-500" style={i === 2 ? { height: 0 } : undefined}>
                  {l}
                </span>
              ))}
            </div>
            <svg viewBox="0 0 300 100" preserveAspectRatio="none" className="draw absolute inset-0 size-full overflow-visible">
              {known.length > 1 && <path d={`${line(known)} L${known[known.length - 1][0].toFixed(1)} 100 L${known[0][0].toFixed(1)} 100 Z`} style={{ fill: "color-mix(in srgb, var(--primary) 14%, transparent)", stroke: "none" }} />}
              <path d={line(mp)} style={{ fill: "none", stroke: "var(--color-neutral-300)", strokeWidth: 1.5, strokeDasharray: "4 4", vectorEffect: "non-scaling-stroke" }} />
              <path d={line(pts)} style={{ fill: "none", stroke: "var(--primary)", strokeWidth: 2, vectorEffect: "non-scaling-stroke", filter: "drop-shadow(0 0 4px var(--primary))" }} />
            </svg>
          </div>
          <div className="flex justify-between text-[11px] text-neutral-500">
            {trendLabels.map((l) => (
              <span key={l}>{l}</span>
            ))}
          </div>
          </CardContent>
        </Card>
      </div>

      <Achievements store={store} />

      <Card className="py-(--space-4)">
        <CardContent className="flex flex-col gap-(--space-2)">
          <h2 className={`${H2} mb-1`}>Sequências</h2>
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead scope="col">Hábito</TableHead>
                <TableHead scope="col">Atual</TableHead>
                <TableHead scope="col">Taxa 30 dias</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {habits.map((h) => {
                const st = calc.streak(h);
                const r30 = calc.rate30(h);
                const rt = r30 === null ? null : Math.round(r30 * 100);
                const days = calc.since(h);
                return (
                  <TableRow key={h.id} className="hover:bg-transparent">
                    <TableCell>{h.name}</TableCell>
                    <TableCell>
                      {st.cur > 0 ? (
                        <span className="inline-flex items-center gap-[5px]" style={{ color: "var(--color-accent-300)" }}>
                          <i aria-hidden="true" className="ph-fill ph-fire glint" />
                          {st.curL}
                        </span>
                      ) : (
                        <span style={{ color: MUTED }}>—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {rt === null ? (
                        <span className="text-xs text-neutral-400">{days === 0 ? "Começou hoje" : days === 1 ? "Começou ontem" : `Começou há ${days} dias`}</span>
                      ) : (
                        <div className="flex min-w-[140px] items-center gap-2">
                          <Progress value={rt} aria-label={`${h.name}: taxa em 30 dias`} className="h-1 flex-1" />
                          <span className="w-[34px] text-right text-xs tabular-nums">{rt}%</span>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
