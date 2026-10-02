"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Calc, Data, DayLog, Habit, STORAGE_KEY, ds, seed } from "./habits";
import { downloadJson, lastExport, markExported, markReminded, shouldRemind } from "./backup";
import { BACKUP_KEY, emptyData, isObj, readStored, sanitize } from "./storage";

export type Notice = {
  /** Changes with every notice, so the toast can restart its own timer. */
  id: number;
  text: string;
  /** Phosphor classes for the notice icon; set for good news (a level, an achievement) instead of the plain info mark. */
  icon?: string;
  /** A whole-data swap: its undo would drop later edits, so the next edit retires it. */
  replace?: boolean;
  /** `undo` marks the action that Ctrl+Z may run; other actions (like exporting) never get the shortcut. */
  action?: { label: string; run: () => void; undo?: boolean };
};

type NewNotice = Omit<Notice, "id">;

/** Persistent app data (localStorage). `data` is null until the client has loaded it. */
export function useStore() {
  const [today, setToday] = useState(() => ds(new Date()));
  const [data, setData] = useState<Data | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  /** A message that stays until dismissed, so a later notice never replaces it. */
  const [alert, setAlert] = useState<string | null>(null);
  /** Whether the browser is really keeping what is written. Driven by actual writes, not assumed. */
  const [saveState, setSaveState] = useState<"ok" | "failing">("ok");
  const [backupAt, setBackupAt] = useState<string | null>(null);
  // Nothing is written back until the person changes something, so a failed read never overwrites what is stored.
  const dirty = useRef(false);
  const dataRef = useRef<Data | null>(null);
  const noticeId = useRef(0);
  const skipSave = useRef(false);
  const askedPersist = useRef(false);
  const exportRef = useRef<() => void>(() => {});

  const notify = useCallback((n: NewNotice | null) => setNotice(n ? { ...n, id: ++noticeId.current } : null), []);

  useEffect(() => {
    let raw: string | null = null;
    let blocked = false;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch {
      blocked = true;
    }
    const res = readStored(raw);
    let next = emptyData();
    let warning: string | null = null;
    if (res.status === "ok") {
      next = res.data;
    } else if (res.status === "corrupt") {
      let kept = false;
      try {
        localStorage.setItem(BACKUP_KEY, raw ?? "");
        kept = true;
      } catch {}
      warning = kept
        ? "Não consegui ler seus dados salvos. Guardei uma cópia no navegador (constancia.v1.bak) e comecei do zero."
        : "Não consegui ler seus dados salvos e não deu para guardar uma cópia. Nada será apagado até você registrar algo.";
    }
    const last = lastExport();
    // Hydrate from localStorage after mount (server render has no access to it).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setData(next);
    setAlert(warning);
    setSaveState(blocked ? "failing" : "ok");
    setBackupAt(last);
    // A gentle nudge to keep a copy, never for sample data and at most every two weeks.
    const firstDay = Object.keys(next.logs).sort()[0];
    if (res.status === "ok" && !next.example && next.habits.length && shouldRemind(last, firstDay)) {
      markReminded();
      notify({ text: "Faz tempo que você não exporta uma cópia dos seus dados.", action: { label: "Exportar", run: () => exportRef.current() } });
    }
  }, [notify]);

  useEffect(() => {
    dataRef.current = data;
    if (skipSave.current) {
      skipSave.current = false;
      return;
    }
    if (!data || !dirty.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      setTimeout(() => setSaveState("ok"), 0);
      if (!askedPersist.current) {
        askedPersist.current = true;
        // Asks the browser not to clear the data when it is short on space; the answer is not needed.
        navigator.storage?.persist?.().catch(() => {});
      }
    } catch {
      setTimeout(() => setSaveState("failing"), 0);
    }
  }, [data]);

  // Another tab changed the data: take its version instead of overwriting it on the next edit.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.storageArea !== localStorage || e.key !== STORAGE_KEY || e.newValue === null) return;
      const res = readStored(e.newValue);
      if (res.status !== "ok") return;
      skipSave.current = true;
      setData(res.data);
      notify({ text: "Outra aba alterou seus dados; atualizei esta para não sobrescrever." });
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [notify]);

  // A tab left open past midnight, or woken from sleep, must not keep logging on yesterday.
  useEffect(() => {
    const sync = () => setToday((prev) => {
      const now = ds(new Date());
      return now === prev ? prev : now;
    });
    let timer: ReturnType<typeof setTimeout>;
    const schedule = () => {
      const now = new Date();
      const next = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 1);
      timer = setTimeout(() => {
        sync();
        schedule();
      }, next.getTime() - now.getTime());
    };
    schedule();
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("focus", sync);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  const update = useCallback((fn: (d: Data) => Data) => {
    dirty.current = true;
    setData((d) => (d ? fn(d) : d));
    setNotice((n) => (n?.replace ? null : n));
  }, []);

  const setLog = useCallback(
    (day: string, fn: (l: DayLog) => DayLog) =>
      update((d) => {
        const cur = d.logs[day] ?? { h: {}, mood: 0, energy: 0, sleep: "", note: "" };
        return { ...d, logs: { ...d.logs, [day]: fn({ ...cur, h: { ...cur.h } }) } };
      }),
    [update],
  );

  /** Swaps every record at once and offers to put the previous ones back, until the next edit. */
  const replaceAll = useCallback(
    (next: Data, text: string) => {
      const prev = dataRef.current;
      dirty.current = true;
      setData(next);
      notify({
        text,
        replace: true,
        action: prev
          ? {
              label: "Desfazer", undo: true,
              run: () => {
                dirty.current = true;
                setData(prev);
                notify(null);
              },
            }
          : undefined,
      });
    },
    [notify],
  );

  const loadExample = useCallback(() => replaceAll(seed(today), "Dados de exemplo carregados."), [replaceAll, today]);

  const addHabits = useCallback(
    (list: Omit<Habit, "id">[]) => {
      const stamp = Date.now();
      update((d) => ({ ...d, habits: [...d.habits, ...list.map((h, i) => ({ ...h, id: `h${stamp}${i}`, createdAt: today }))] }));
    },
    [update, today],
  );

  /** Undoing a single deletion puts back only that item, so edits made since are kept. */
  const removeHabit = useCallback(
    (id: string) => {
      const d = dataRef.current;
      const at = d?.habits.findIndex((x) => x.id === id) ?? -1;
      if (!d || at < 0) return;
      const h = d.habits[at];
      const goals = d.goals.map((g, i) => ({ g, i })).filter((x) => x.g.habitId === id);
      const also = goals.length ? ` e ${goals.length === 1 ? "a meta ligada a ele" : `as ${goals.length} metas ligadas a ele`}` : "";
      dirty.current = true;
      setData((cur) => (cur ? { ...cur, habits: cur.habits.filter((x) => x.id !== id), goals: cur.goals.filter((g) => g.habitId !== id) } : cur));
      notify({
        text: `Excluí o hábito “${h.name}”${also}.`,
        action: {
          label: "Desfazer", undo: true,
          run: () => {
            dirty.current = true;
            setData((cur) => {
              if (!cur || cur.habits.some((x) => x.id === id)) return cur;
              const habits = [...cur.habits];
              habits.splice(Math.min(at, habits.length), 0, h);
              const back = [...cur.goals];
              for (const { g, i } of goals) if (!back.some((x) => x.id === g.id)) back.splice(Math.min(i, back.length), 0, g);
              return { ...cur, habits, goals: back };
            });
            notify(null);
          },
        },
      });
    },
    [notify],
  );

  const removeGoal = useCallback(
    (id: string) => {
      const d = dataRef.current;
      const at = d?.goals.findIndex((x) => x.id === id) ?? -1;
      if (!d || at < 0) return;
      const g = d.goals[at];
      dirty.current = true;
      setData((cur) => (cur ? { ...cur, goals: cur.goals.filter((x) => x.id !== id) } : cur));
      notify({
        text: `Excluí a meta “${g.title}”.`,
        action: {
          label: "Desfazer", undo: true,
          run: () => {
            dirty.current = true;
            setData((cur) => {
              if (!cur || cur.goals.some((x) => x.id === id)) return cur;
              const goals = [...cur.goals];
              goals.splice(Math.min(at, goals.length), 0, g);
              return { ...cur, goals };
            });
            notify(null);
          },
        },
      });
    },
    [notify],
  );

  const clearAll = useCallback(() => replaceAll(emptyData(), "Todos os dados foram apagados."), [replaceAll]);

  const exportJson = useCallback(
    () => JSON.stringify({ app: "constancia", version: 1, exportedAt: new Date().toISOString(), data: dataRef.current ?? emptyData() }, null, 2),
    [],
  );

  const exportFile = useCallback(() => {
    downloadJson(exportJson(), ds(new Date()));
    markExported();
    setBackupAt(new Date().toISOString());
    notify({ text: "Cópia exportada." });
  }, [exportJson, notify]);

  useEffect(() => {
    exportRef.current = exportFile;
  }, [exportFile]);

  /** Returns an error message, or null when the file was imported. */
  const importJson = useCallback(
    (text: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return "O arquivo não é um JSON válido.";
      }
      const next = sanitize(isObj(parsed) && isObj(parsed.data) ? parsed.data : parsed);
      if (!next) return "Não encontrei hábitos neste arquivo. Use um arquivo exportado pelo Constância.";
      const n = next.habits.length;
      replaceAll(next, `Dados importados: ${n} ${n === 1 ? "hábito" : "hábitos"}.`);
      return null;
    },
    [replaceAll],
  );

  const dismissNotice = useCallback(() => notify(null), [notify]);
  const dismissAlert = useCallback(() => setAlert(null), []);

  const calc = useMemo(() => (data ? new Calc(data, today) : null), [data, today]);

  return { today, data, calc, update, setLog, notice, notify, dismissNotice, alert, dismissAlert, saveState, backupAt, exportFile, clearAll, removeHabit, removeGoal, loadExample, addHabits, exportJson, importJson };
}

export type Store = ReturnType<typeof useStore>;
