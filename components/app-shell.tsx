"use client";

import { useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { focusTitle } from "@/lib/focus";
import { useStore } from "@/lib/use-store";
import { useProgressionAlerts } from "@/lib/use-progression";
import { LevelMeter } from "./level-meter";
import { NoticeToast } from "./notice-toast";
import { HabitsView } from "./habits-view";
import { GoalsView } from "./goals-view";
import { StatsView } from "./stats-view";
import { TodayView } from "./today-view";

type View = "hoje" | "habitos" | "metas" | "stats";

const VIEWS: { key: View; label: string; icon: string }[] = [
  { key: "hoje", label: "Hoje", icon: "ph-sun" },
  { key: "habitos", label: "Hábitos", icon: "ph-list-checks" },
  { key: "metas", label: "Metas", icon: "ph-target" },
  { key: "stats", label: "Estatísticas", icon: "ph-chart-line-up" },
];

const GROUND = "radial-gradient(1200px 600px at 0% 0%, var(--color-neutral-800), transparent 60%), var(--color-bg)";

export function AppShell() {
  const store = useStore();
  const [view, setView] = useState<View>("hoje");
  const { calc, data, today, notice, dismissNotice, alert, dismissAlert, saveState, exportFile, clearAll } = store;
  const mounted = useRef(false);
  useProgressionAlerts(store);

  // The tab title follows the screen, so it says where you are.
  useEffect(() => {
    document.title = `${VIEWS.find((n) => n.key === view)?.label ?? "Hoje"} · Constância`;
  }, [view]);

  // Ctrl/Cmd+Z runs the notice's Desfazer, unless the person is typing in a field.
  const undo = notice?.action?.undo ? notice.action.run : undefined;
  useEffect(() => {
    if (!undo) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() !== "z" || e.shiftKey || e.altKey || !(e.ctrlKey || e.metaKey) || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      e.preventDefault();
      undo();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  // Moves focus to the new screen's title so keyboard and screen-reader users land on it.
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    focusTitle();
  }, [view]);

  if (!calc || !data) {
    return (
      <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] min-[820px]:grid-cols-[220px_minmax(0,1fr)]" style={{ background: GROUND }} aria-busy="true">
        <aside className="hidden flex-col gap-(--space-4) px-(--space-3) py-(--space-4) min-[820px]:flex" aria-hidden="true">
          <Skeleton className="h-[26px] w-32 rounded-sm bg-neutral-900" />
          <div className="flex flex-col gap-1.5">
            {VIEWS.map((n) => (
              <Skeleton key={n.key} className="h-9 rounded-md bg-neutral-900" />
            ))}
          </div>
        </aside>
        <main className="px-3 pt-4 min-[820px]:px-(--space-6) min-[820px]:pt-(--space-6)" role="status">
          <span className="sr-only">Carregando seus hábitos…</span>
          <div className="flex max-w-[1080px] flex-col gap-(--space-6)" aria-hidden="true">
            <Skeleton className="h-9 w-72 max-w-full rounded-md bg-neutral-900" />
            <Skeleton className="h-12 w-44 rounded-md bg-neutral-900" />
            <Skeleton className="h-40 max-w-[560px] rounded-md bg-neutral-900" />
          </div>
        </main>
      </div>
    );
  }

  const tDone = calc.doneOn(today);
  const tTotal = calc.activeCount(today);
  const tPct = tTotal ? Math.round((tDone / tTotal) * 100) : 0;

  return (
    <div className="grid min-h-screen grid-cols-[minmax(0,1fr)] min-[820px]:grid-cols-[220px_minmax(0,1fr)]" style={{ background: GROUND }}>
      <aside
        className="sticky top-0 hidden h-screen flex-col gap-(--space-4) px-(--space-3) py-(--space-4) min-[820px]:flex"
        style={{ background: "linear-gradient(to bottom, transparent, var(--color-divider) 48px, var(--color-divider) calc(100% - 48px), transparent) no-repeat right / 1px 100%" }}
      >
        <div className="flex items-center gap-2.5 px-(--space-2)">
          <div className="grid size-[26px] place-items-center rounded-sm border border-primary text-primary shadow-[0_0_16px_color-mix(in_srgb,var(--primary)_35%,transparent)]">
            <i aria-hidden="true" className="ph ph-check-fat text-sm" />
          </div>
          <span className="text-[17px] font-medium">Constância</span>
        </div>
        <nav aria-label="Telas" className="flex flex-col gap-0.5">
          {VIEWS.map((n) => {
            const on = view === n.key;
            return (
              <Button
                key={n.key}
                variant="ghost"
                onClick={() => setView(n.key)}
                aria-current={on ? "page" : undefined}
                className={`h-auto justify-start gap-2.5 px-(--space-2) py-[9px] text-sm font-normal ${
                  on ? "bg-primary/12 text-primary" : "text-neutral-300 hover:bg-foreground/6 hover:text-neutral-300"
                }`}
              >
                <i aria-hidden="true" className={`ph ${n.icon} text-lg`} />
                <span>{n.label}</span>
              </Button>
            );
          })}
        </nav>
        <div className="mt-auto flex flex-col gap-(--space-4) px-(--space-2)">
          <LevelMeter calc={calc} />
          <div className="flex flex-col gap-1.5">
          <span className="text-[11px] uppercase tracking-[.08em] text-neutral-400">Hoje</span>
          <Progress value={tPct} aria-label="Hábitos concluídos hoje" className="h-1" />
          <span className="text-xs text-neutral-300">{`${tDone} de ${tTotal} ${tTotal === 1 ? "hábito" : "hábitos"}`}</span>
          </div>
        </div>
      </aside>

      <main className={`min-w-0 px-3 pt-4 min-[820px]:px-(--space-6) min-[820px]:pt-(--space-6) ${notice ? "pb-44 min-[820px]:pb-28" : "pb-24 min-[820px]:pb-(--space-8)"}`}>
        <div className="flex max-w-[1080px] flex-col gap-(--space-6)">
          {saveState === "failing" && (
            <Alert className="flex flex-wrap items-center gap-x-(--space-3) gap-y-(--space-2) border-0 p-(--space-3) text-sm text-neutral-200">
              <i className="ph ph-warning-circle text-lg text-accent-300" aria-hidden="true" />
              <span className="min-w-0 flex-1">Não está salvando: este navegador bloqueou ou lotou o armazenamento, e o que você registrar pode se perder ao fechar a página.</span>
              <Button variant="outline" onClick={exportFile}>
                Exportar cópia
              </Button>
            </Alert>
          )}
          {alert && (
            <Alert role="status" className="flex flex-wrap items-center gap-x-(--space-3) gap-y-(--space-2) border-0 p-(--space-3) text-sm text-neutral-200">
              <i className="ph ph-info text-lg text-accent-300" aria-hidden="true" />
              <span className="min-w-0 flex-1">{alert}</span>
              <Button variant="ghost" onClick={dismissAlert}>
                Entendi
              </Button>
            </Alert>
          )}
          {data.example && (
            <div className="flex flex-wrap items-center gap-x-(--space-3) gap-y-1 text-sm text-neutral-300">
              <span>Você está vendo dados de exemplo.</span>
              <Button
                variant="ghost"
                className="text-[13px]"
                onClick={() => {
                  clearAll();
                  focusTitle();
                }}
              >
                Começar do zero
              </Button>
            </div>
          )}
          <div key={view} className="view-enter flex flex-col gap-(--space-6)">
            {view === "hoje" && <TodayView store={store} goHabits={() => setView("habitos")} />}
            {view === "habitos" && <HabitsView store={store} />}
            {view === "metas" && <GoalsView store={store} />}
            {view === "stats" && <StatsView store={store} goToday={() => setView("hoje")} />}
          </div>
        </div>
      </main>

      <div role="status" aria-live="polite" className="sr-only">
        {notice ? `${notice.text}${notice.action?.undo ? " Para desfazer, use o botão Desfazer ou Ctrl+Z." : ""}` : ""}
      </div>
      {notice && <NoticeToast key={notice.id} notice={notice} onDismiss={dismissNotice} />}

      <nav
        aria-label="Telas"
        className="fixed inset-x-0 bottom-0 z-10 grid grid-cols-4 p-1.5 backdrop-blur-md min-[820px]:hidden"
        style={{
          paddingBottom: "calc(6px + env(safe-area-inset-bottom))",
          background: "color-mix(in srgb, var(--color-bg) 88%, transparent)",
          boxShadow: "0 -1px 0 var(--color-divider)",
        }}
      >
        {VIEWS.map((n) => (
          <Button
            key={n.key}
            variant="ghost"
            onClick={() => setView(n.key)}
            aria-current={view === n.key ? "page" : undefined}
            className={`h-auto min-h-[52px] flex-col gap-[3px] text-[11px] font-normal hover:text-inherit ${
              view === n.key ? "text-primary hover:text-primary" : "text-neutral-300"
            }`}
          >
            <i aria-hidden="true" className={`ph ${n.icon} text-[22px]`} />
            {n.label}
          </Button>
        ))}
      </nav>
    </div>
  );
}
