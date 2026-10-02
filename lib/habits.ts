export type HabitType = "check" | "qty" | "weekly";

export type Habit = {
  id: string;
  name: string;
  type: HabitType;
  target: number;
  unit: string;
  /** How much the + and − buttons add for a quantity habit (default 1, e.g. 250 for a glass in ml). */
  step?: number;
  /** First day the habit counts for (YYYY-MM-DD). Days before it are not held against the person. */
  createdAt?: string;
};

export type DayLog = {
  h: Record<string, number>;
  mood: number;
  energy: number;
  sleep: number | "";
  note: string;
};

export type Goal = {
  id: string;
  scope: "month" | "year";
  period: string;
  title: string;
  kind: "habit" | "manual";
  habitId?: string;
  target: number;
  progress?: number;
  unit?: string;
  step?: number;
};

export type Data = {
  habits: Habit[];
  logs: Record<string, DayLog>;
  goals: Goal[];
  /** Set only on the sample data, so it is never mistaken for the person's own records. */
  example?: boolean;
};

export const STORAGE_KEY = "constancia.v1";
export const MESES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
export const DIAS = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];

/* ---------- dates (all as YYYY-MM-DD strings) ---------- */
const pad = (n: number) => String(n).padStart(2, "0");
export const ds = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s: string) => {
  const [a, b, c] = s.split("-").map(Number);
  return new Date(a, b - 1, c);
};
export const addDays = (s: string, n: number) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return ds(d);
};
export const weekStart = (s: string) => {
  const d = parse(s);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return ds(d);
};
export const fmtShort = (d: string) => {
  const x = parse(d);
  return `${pad(x.getDate())}/${pad(x.getMonth() + 1)}`;
};
export const capitalize = (s: string) => s[0].toUpperCase() + s.slice(1);

/* ---------- limits and number formatting ---------- */
export const MAX_QTY = 9999;
export const MAX_WEEKLY = 7;
export const MAX_GOAL = 9_999_999;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const round1 = (n: number) => Math.round(n * 10) / 10;
/** Numbers shown the Brazilian way: 2,5 */
export const fmtNum = (n: number) => String(n).replace(".", ",");
/** A habit's target within what the screen can draw and the person can meet: weekly 1-7, quantity up to one decimal. */
/** Step of the + and − buttons: one decimal, from 0.1 up to the cap. */
export const normalizeStep = (n: number) => clamp(round1(Number.isFinite(n) ? n : 1), 0.1, MAX_QTY);
export function normalizeTarget(type: HabitType, n: number) {
  if (type === "check") return 1;
  const v = Number.isFinite(n) ? n : 1;
  return type === "weekly" ? clamp(Math.round(v), 1, MAX_WEEKLY) : clamp(round1(v), 0.1, MAX_QTY);
}

/* ---------- seed data ---------- */
export function seed(today: string): Data {
  let a = 20261002;
  const r = () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const habits: Habit[] = [
    { id: "h1", name: "Beber água", type: "qty", target: 8, unit: "copos" },
    { id: "h2", name: "Ler 20 páginas", type: "check", target: 1, unit: "" },
    { id: "h3", name: "Treinar", type: "weekly", target: 3, unit: "" },
    { id: "h4", name: "Meditar 10 min", type: "check", target: 1, unit: "" },
    { id: "h5", name: "Sem celular após 22h", type: "check", target: 1, unit: "" },
  ];
  const since = addDays(today, -170);
  habits.forEach((h) => (h.createdAt = since));
  const notes = ["Dia produtivo, treino pesado.", "Dormi mal, pouca energia.", "Li no parque à tarde.", "Reunião longa, pulei a meditação.", "Semana começou bem."];
  const logs: Record<string, DayLog> = {};
  const N = 170;
  for (let i = N; i >= 1; i--) {
    const d = addDays(today, -i);
    const p = 0.42 + 0.42 * (1 - i / N);
    const wd = parse(d).getDay();
    const h = {
      h1: Math.max(0, Math.min(10, Math.round(r() * 3 + p * 7))),
      h2: r() < p + 0.05 ? 1 : 0,
      h3: ([1, 3, 5].includes(wd) ? r() < p + 0.2 : r() < 0.06) ? 1 : 0,
      h4: r() < p ? 1 : 0,
      h5: r() < p - 0.08 ? 1 : 0,
    };
    const q = r();
    logs[d] = {
      h,
      mood: Math.max(1, Math.min(5, Math.round(1.6 + p * 2.4 + q * 1.4 - 0.5))),
      energy: Math.max(1, Math.min(5, Math.round(1.5 + p * 2.5 + r() * 1.5 - 0.6))),
      sleep: Math.round((5.8 + r() * 2 + p) * 2) / 2,
      note: r() < 0.12 ? notes[Math.floor(r() * notes.length)] : "",
    };
  }
  logs[today] = { h: { h1: 3, h2: 1 }, mood: 0, energy: 0, sleep: 7, note: "" };
  const m = today.slice(0, 7);
  const y = today.slice(0, 4);
  const goals: Goal[] = [
    { id: "g1", scope: "month", period: m, title: "Treinar 12 vezes", kind: "habit", habitId: "h3", target: 12 },
    { id: "g2", scope: "month", period: m, title: "Ler em 25 dias do mês", kind: "habit", habitId: "h2", target: 25 },
    { id: "g3", scope: "month", period: m, title: "Guardar R$ 500", kind: "manual", target: 500, progress: 150, unit: "R$", step: 50 },
    { id: "g4", scope: "year", period: y, title: "Ler 12 livros", kind: "manual", target: 12, progress: 8, unit: "livros", step: 1 },
    { id: "g5", scope: "year", period: y, title: "Meditar 200 dias", kind: "habit", habitId: "h4", target: 200 },
    { id: "g6", scope: "year", period: y, title: "Treinar 150 vezes", kind: "habit", habitId: "h3", target: 150 },
  ];
  return { habits, logs, goals, example: true };
}

/* ---------- derived values ---------- */
export class Calc {
  /** First day each habit counts for: its creation day, or for older data without one, the first day it was logged. */
  readonly starts: Map<string, string>;

  constructor(public data: Data, public today: string) {
    const first: Record<string, string> = {};
    for (const d of Object.keys(data.logs).sort()) {
      const h = data.logs[d].h;
      for (const id in h) if (h[id] > 0 && !(id in first)) first[id] = d;
    }
    this.starts = new Map(
      data.habits.map((h) => {
        const c = h.createdAt && /^\d{4}-\d{2}-\d{2}$/.test(h.createdAt) ? h.createdAt : undefined;
        const f = first[h.id];
        return [h.id, c ?? f ?? today];
      }),
    );
  }

  active(h: Habit, d: string) {
    return d >= (this.starts.get(h.id) ?? this.today);
  }
  /** How many habits count on that day. */
  activeCount(d: string) {
    return this.data.habits.filter((h) => this.counts(h, d)).length;
  }
  /** Whether a habit weighs on that day's count. A weekly habit only does on the days it was done, so rest days cost nothing. */
  counts(h: Habit, d: string) {
    return this.active(h, d) && (h.type !== "weekly" || this.hit(h, d));
  }
  /** Whole days since the habit started counting. */
  since(h: Habit) {
    return Math.max(0, Math.round((parse(this.today).getTime() - parse(this.starts.get(h.id) ?? this.today).getTime()) / 864e5));
  }

  val(h: Habit, d: string) {
    return this.data.logs[d]?.h?.[h.id] || 0;
  }
  hit(h: Habit, d: string) {
    return h.type === "qty" ? this.val(h, d) >= h.target : this.val(h, d) >= 1;
  }
  weekCount(h: Habit, d: string) {
    let s = weekStart(d);
    let n = 0;
    while (s <= d) {
      if (this.val(h, s) >= 1) n++;
      s = addDays(s, 1);
    }
    return n;
  }
  done(h: Habit, d: string) {
    return this.hit(h, d);
  }
  doneOn(d: string) {
    return this.data.habits.filter((h) => this.counts(h, d) && this.done(h, d)).length;
  }
  score(d: string, only?: string | null): number | null {
    const hs = only ? this.data.habits.filter((h) => h.id === only && this.active(h, d)) : this.data.habits.filter((h) => this.counts(h, d));
    if (!hs.length) return null;
    if (only && hs[0].type === "qty") return Math.min(1, this.val(hs[0], d) / hs[0].target);
    // A weekly habit on its own has no verdict on a rest day: nothing to light, nothing missed.
    if (only) return this.hit(hs[0], d) ? 1 : hs[0].type === "weekly" ? null : 0;
    return hs.filter((h) => this.done(h, d)).length / hs.length;
  }
  streak(h: Habit) {
    const daily = h.type !== "weekly";
    const step = daily ? 1 : 7;
    const unit = daily ? "dia" : "semana";
    const ok = daily
      ? (d: string) => this.hit(h, d)
      : (d: string) => {
          let n = 0;
          for (let i = 0; i < 7; i++) {
            const x = addDays(d, i);
            if (x > this.today) break;
            if (this.val(h, x) >= 1) n++;
          }
          return n >= h.target;
        };
    let c = daily ? this.today : weekStart(this.today);
    if (!ok(c)) c = addDays(c, -step);
    let cur = 0;
    while (ok(c)) {
      cur++;
      c = addDays(c, -step);
    }
    const f = (n: number) => `${n} ${unit}${n === 1 ? "" : "s"}`;
    return { cur, curL: f(cur) };
  }
  /**
   * How well the last 30 days went: the share of counted days it was done, or for a weekly habit the sessions done
   * against the sessions its target asks for. The day in progress is left out until something was done.
   * Null until the habit has a week of history.
   */
  rate30(h: Habit) {
    let n = 0;
    let days = 0;
    for (let i = 0; i < 30; i++) {
      const d = addDays(this.today, -i);
      if (!this.active(h, d)) continue;
      const done = this.done(h, d);
      if (d === this.today && !done) continue;
      days++;
      if (done) n++;
    }
    if (days < 7) return null;
    return h.type === "weekly" ? Math.min(1, n / ((h.target * days) / 7)) : n / days;
  }
  periodDays(scope: "month" | "year", period: string) {
    const [y, m] = period.split("-").map(Number);
    const start = scope === "month" ? `${y}-${pad(m)}-01` : `${y}-01-01`;
    const endD = scope === "month" ? new Date(y, m, 0) : new Date(y, 11, 31);
    const end = ds(endD);
    const total = Math.round((endD.getTime() - parse(start).getTime()) / 864e5) + 1;
    const last = end < this.today ? end : this.today;
    const days: string[] = [];
    for (let d = start; d <= last; d = addDays(d, 1)) days.push(d);
    return { days, total };
  }
}

export function level(s: number | null) {
  if (s == null) return "transparent";
  if (s <= 0) return "var(--color-neutral-800)";
  if (s < 0.3) return "var(--color-accent-700)";
  if (s < 0.55) return "var(--color-accent-600)";
  if (s < 0.8) return "var(--color-accent-500)";
  if (s < 1) return "var(--color-accent-300)";
  return "var(--color-accent-100)";
}
