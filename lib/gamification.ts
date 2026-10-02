import type { Calc } from "./habits";

/**
 * Progression is derived from the records, never stored as a score: one "luz" for every habit done on a day.
 * Nothing here takes anything away. A day left dark adds nothing, and a level or achievement already reached stays reached.
 */

export const LEVELS = [
  { name: "Faísca", at: 0 },
  { name: "Vela", at: 12 },
  { name: "Lamparina", at: 40 },
  { name: "Lanterna", at: 90 },
  { name: "Farol", at: 170 },
  { name: "Aurora", at: 300 },
  { name: "Constelação", at: 500 },
  { name: "Lua cheia", at: 800 },
] as const;

export function totalLights(calc: Calc) {
  let n = 0;
  for (const d of Object.keys(calc.data.logs)) n += calc.doneOn(d);
  return n;
}

export function levelOf(lights: number) {
  let i = 0;
  while (i + 1 < LEVELS.length && lights >= LEVELS[i + 1].at) i++;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] ?? null;
  const pct = next ? (lights - cur.at) / (next.at - cur.at) : 1;
  return { index: i, name: cur.name, next, pct, toNext: next ? next.at - lights : 0 };
}

export type Achievement = { id: string; title: string; hint: string; icon: string };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "primeira-luz", title: "Primeira luz", hint: "Conclua um hábito pela primeira vez.", icon: "ph-flashlight" },
  { id: "dia-aceso", title: "Dia aceso", hint: "Conclua todos os hábitos de um dia.", icon: "ph-sun-horizon" },
  { id: "tres-dias", title: "Três dias seguidos", hint: "Mantenha um hábito diário por 3 dias.", icon: "ph-fire" },
  { id: "semana", title: "Semana inteira", hint: "Mantenha um hábito diário por 7 dias.", icon: "ph-calendar-check" },
  { id: "mes", title: "Um mês de luz", hint: "Mantenha um hábito diário por 30 dias.", icon: "ph-moon-stars" },
  { id: "cem-luzes", title: "Cem luzes", hint: "Some 100 hábitos concluídos.", icon: "ph-lightbulb-filament" },
  { id: "dez-acesos", title: "Dez dias acesos", hint: "Conclua todos os hábitos em 10 dias.", icon: "ph-sparkle" },
  { id: "diario", title: "Caderno em uso", hint: "Escreva a nota de 5 dias.", icon: "ph-notebook" },
];

/** Which achievements the records currently satisfy. */
export function earned(calc: Calc): Set<string> {
  const out = new Set<string>();
  const logs = calc.data.logs;
  let lights = 0;
  let perfect = 0;
  let notes = 0;
  for (const d of Object.keys(logs)) {
    const done = calc.doneOn(d);
    lights += done;
    const total = calc.activeCount(d);
    if (total > 0 && done === total) perfect++;
    if (logs[d].note.trim()) notes++;
  }
  let streak = 0;
  for (const h of calc.data.habits) if (h.type !== "weekly") streak = Math.max(streak, calc.streak(h).cur);
  if (lights >= 1) out.add("primeira-luz");
  if (perfect >= 1) out.add("dia-aceso");
  if (streak >= 3) out.add("tres-dias");
  if (streak >= 7) out.add("semana");
  if (streak >= 30) out.add("mes");
  if (lights >= 100) out.add("cem-luzes");
  if (perfect >= 10) out.add("dez-acesos");
  if (notes >= 5) out.add("diario");
  return out;
}

const KEY = "constancia.v1.conquistas";
const LEVEL_KEY = "constancia.v1.nivel";

/** Achievements reached before, kept so a later slip never takes one back. Null when nothing was ever recorded. */
export function readReached(): Set<string> | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === null) return null;
    const list = JSON.parse(raw);
    return new Set(Array.isArray(list) ? list.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return null;
  }
}

export function writeReached(ids: Set<string>) {
  try {
    localStorage.setItem(KEY, JSON.stringify([...ids]));
  } catch {}
}

export function readLevel(): number | null {
  try {
    const raw = localStorage.getItem(LEVEL_KEY);
    const n = raw === null ? NaN : Number(raw);
    return Number.isInteger(n) ? n : null;
  } catch {
    return null;
  }
}

export function writeLevel(n: number) {
  try {
    localStorage.setItem(LEVEL_KEY, String(n));
  } catch {}
}
