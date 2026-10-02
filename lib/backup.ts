const EXPORT_KEY = "constancia.v1.export";
const REMIND_KEY = "constancia.v1.remind";

const read = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

/** Saves the backup as a file download. */
export function downloadJson(json: string, day: string) {
  const url = URL.createObjectURL(new Blob([json], { type: "application/json" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = `constancia-${day}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export const lastExport = () => read(EXPORT_KEY);
export const markExported = () => write(EXPORT_KEY, new Date().toISOString());

/** Whole days between an ISO timestamp and now. */
export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / 864e5));

/** A gentle nudge at most every two weeks. */
export function shouldRemind(lastCopy: string | null, firstDay: string | undefined): boolean {
  const asked = read(REMIND_KEY);
  if (asked && daysSince(asked) < 14) return false;
  const since = lastCopy ?? (firstDay ? `${firstDay}T00:00:00` : null);
  return since !== null && daysSince(since) >= 30;
}
export const markReminded = () => write(REMIND_KEY, new Date().toISOString());
