import { MAX_GOAL, MAX_QTY, normalizeStep, normalizeTarget, round1 } from "./habits";
import type { Data, DayLog, Goal, Habit, HabitType } from "./habits";

export const BACKUP_KEY = "constancia.v1.bak";

export const emptyData = (): Data => ({ habits: [], logs: {}, goals: [] });

export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

const num = (v: unknown, fallback = 0) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);
const str = (v: unknown) => (typeof v === "string" ? v : "");
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

const TYPES: HabitType[] = ["check", "qty", "weekly"];
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function habit(v: unknown): Habit | null {
  if (!isObj(v) || typeof v.id !== "string" || !v.id || !TYPES.includes(v.type as HabitType)) return null;
  const name = str(v.name).trim();
  if (!name) return null;
  const h: Habit = { id: v.id, name, type: v.type as HabitType, target: normalizeTarget(v.type as HabitType, num(v.target, 1)), unit: str(v.unit) };
  if (h.type === "qty" && typeof v.step === "number" && normalizeStep(v.step) !== 1) h.step = normalizeStep(v.step);
  if (typeof v.createdAt === "string" && DAY.test(v.createdAt)) h.createdAt = v.createdAt;
  return h;
}

function log(v: unknown): DayLog | null {
  if (!isObj(v)) return null;
  const h: Record<string, number> = {};
  if (isObj(v.h)) for (const [k, n] of Object.entries(v.h)) if (typeof n === "number" && Number.isFinite(n)) h[k] = clamp(round1(n), 0, MAX_QTY);
  return {
    h,
    mood: clamp(Math.round(num(v.mood)), 0, 5),
    energy: clamp(Math.round(num(v.energy)), 0, 5),
    sleep: typeof v.sleep === "number" && Number.isFinite(v.sleep) ? clamp(v.sleep, 0, 24) : "",
    note: str(v.note),
  };
}

function goal(v: unknown): Goal | null {
  if (!isObj(v) || typeof v.id !== "string" || !v.id) return null;
  if (v.scope !== "month" && v.scope !== "year") return null;
  if (v.kind !== "habit" && v.kind !== "manual") return null;
  const title = str(v.title).trim();
  const period = str(v.period);
  if (!title || !period) return null;
  const g: Goal = { id: v.id, scope: v.scope, period, title, kind: v.kind, target: clamp(Math.round(num(v.target, 1)), 1, MAX_GOAL) };
  if (v.kind === "habit") {
    if (typeof v.habitId !== "string") return null;
    g.habitId = v.habitId;
  } else {
    g.progress = clamp(num(v.progress), 0, MAX_GOAL);
    g.unit = str(v.unit);
    g.step = clamp(Math.round(num(v.step, 1)), 1, MAX_GOAL);
  }
  return g;
}

/** Validates untrusted data (storage or an imported file). Invalid entries are dropped; null means "not our data". */
export function sanitize(raw: unknown): Data | null {
  if (!isObj(raw) || !Array.isArray(raw.habits)) return null;
  const habits = raw.habits.map(habit).filter((h): h is Habit => h !== null);
  const ids = new Set(habits.map((h) => h.id));
  const logs: Record<string, DayLog> = {};
  if (isObj(raw.logs)) {
    for (const [d, l] of Object.entries(raw.logs)) {
      const clean = DAY.test(d) ? log(l) : null;
      if (clean) logs[d] = clean;
    }
  }
  const goals = (Array.isArray(raw.goals) ? raw.goals : [])
    .map(goal)
    .filter((g): g is Goal => g !== null && (g.kind === "manual" || ids.has(g.habitId ?? "")));
  return raw.example === true ? { habits, logs, goals, example: true } : { habits, logs, goals };
}

export type Loaded = { status: "new" } | { status: "ok"; data: Data } | { status: "corrupt" };

export function readStored(raw: string | null): Loaded {
  if (raw === null) return { status: "new" };
  try {
    const data = sanitize(JSON.parse(raw));
    return data ? { status: "ok", data } : { status: "corrupt" };
  } catch {
    return { status: "corrupt" };
  }
}
