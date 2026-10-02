/** Moves focus to the current screen's title, so it is never lost when something on the page goes away. */
export function focusTitle() {
  const h1 = document.querySelector<HTMLElement>("main h1");
  if (!h1) return;
  h1.tabIndex = -1;
  h1.focus({ preventScroll: true });
}

/** After a row is deleted, puts focus on the row that took its place (or the one before it), else on the title. */
export function focusNeighbor(selector: string, index: number) {
  setTimeout(() => {
    const items = document.querySelectorAll<HTMLElement>(selector);
    const next = items[index] ?? items[index - 1];
    if (next) next.focus();
    else focusTitle();
  }, 0);
}
