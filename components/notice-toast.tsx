"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { focusTitle } from "@/lib/focus";
import type { Notice } from "@/lib/use-store";
import { useEffect, useState } from "react";

const MS = 8000;
const MS_WITH_ACTION = 15000;

/** The floating notice. It waits while the pointer or keyboard focus is on it, and starts over when it leaves. */
export function NoticeToast({ notice, onDismiss }: { notice: Notice; onDismiss: () => void }) {
  const [held, setHeld] = useState(false);

  useEffect(() => {
    if (held) return;
    const t = setTimeout(onDismiss, notice.action ? MS_WITH_ACTION : MS);
    return () => clearTimeout(t);
  }, [notice.action, held, onDismiss]);

  return (
    <Alert
      role="status"
      className="elev-md toast-in fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-20 flex items-start gap-(--space-3) rounded-md border-0 bg-card p-(--space-3) text-sm min-[820px]:inset-x-auto min-[820px]:bottom-(--space-6) min-[820px]:left-[236px] min-[820px]:max-w-[520px]"
      onMouseEnter={() => setHeld(true)}
      onMouseLeave={() => setHeld(false)}
      onFocus={() => setHeld(true)}
      onBlur={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setHeld(false);
      }}
    >
      <i className={`${notice.icon ?? "ph ph-info"} mt-0.5 text-lg text-accent-300 ${notice.icon ? "glint" : ""}`} aria-hidden="true" />
      <span className="min-w-0 flex-1 text-neutral-200">{notice.text}</span>
      {notice.action && (
        <Button
          variant="ghost"
          className="flex-none text-[13px]"
          onClick={() => {
            notice.action?.run();
            focusTitle();
          }}
        >
          {notice.action.label}
        </Button>
      )}
      <Button
        variant="ghost"
        size="icon-sm"
        className="-my-1 flex-none"
        onClick={() => {
          onDismiss();
          focusTitle();
        }}
        aria-label="Fechar aviso"
      >
        <i aria-hidden="true" className="ph ph-x" />
      </Button>
    </Alert>
  );
}
