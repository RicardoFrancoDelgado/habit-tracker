const SHORTCUTS_KEY = "constancia.v1.shortcuts";

/** Keyboard shortcuts are on unless the person turned them off. */
export function readShortcuts() {
  try {
    return localStorage.getItem(SHORTCUTS_KEY) !== "off";
  } catch {
    return true;
  }
}

export function writeShortcuts(on: boolean) {
  try {
    localStorage.setItem(SHORTCUTS_KEY, on ? "on" : "off");
  } catch {}
}
