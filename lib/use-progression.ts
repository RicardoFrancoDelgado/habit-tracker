import { useEffect } from "react";
import { ACHIEVEMENTS, earned, levelOf, readLevel, readReached, totalLights, writeLevel, writeReached } from "./gamification";
import type { Store } from "./use-store";

/**
 * Announces a new level or achievement the moment it is reached. The first visit only records where the person
 * already stands, so loading old data never fires a burst of announcements, and a swap of all data (import, sample)
 * is recorded without one.
 */
export function useProgressionAlerts({ calc, notice, notify }: Pick<Store, "calc" | "notice" | "notify">) {
  useEffect(() => {
    if (!calc) return;
    const now = earned(calc);
    const lv = levelOf(totalLights(calc));
    const reached = readReached();
    const seen = readLevel();
    if (reached === null || seen === null) {
      writeReached(now);
      writeLevel(lv.index);
      return;
    }
    const fresh = ACHIEVEMENTS.filter((a) => now.has(a.id) && !reached.has(a.id));
    const levelUp = lv.index > seen;
    if (!fresh.length && !levelUp) return;
    // Another notice may carry a Desfazer: wait for it to go rather than replace it.
    if (notice && !notice.replace) return;
    writeReached(new Set([...reached, ...now]));
    if (levelUp) writeLevel(lv.index);
    if (notice?.replace) return;
    const parts: string[] = [];
    if (fresh.length) parts.push(`Conquista: ${fresh[0].title}${fresh.length > 1 ? ` e mais ${fresh.length - 1}` : ""}.`);
    if (levelUp) parts.push(`Você chegou a ${lv.name}.`);
    notify({ text: parts.join(" "), icon: "ph-fill ph-sparkle" });
  }, [calc, notice, notify]);
}
