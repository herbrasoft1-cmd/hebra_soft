"use client";

import Link from "next/link";
import { useState } from "react";
import { IconBell } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { Tooltip } from "@/components/ui/tooltip";
import type { Notification } from "@/lib/notifications";

const SEVERITY_TONE: Record<Notification["severity"], string> = {
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
};

export function NotificationsButton({ notifications }: { notifications: Notification[] }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip label="Notificaciones" side="bottom">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Notificaciones"
          className="icon-btn relative size-[38px] border border-border-strong bg-surface"
        >
          <IconBell size={15} />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-on-primary">
              {notifications.length}
            </span>
          )}
        </button>
      </Tooltip>
      <Sheet open={open} onClose={() => setOpen(false)} title="Notificaciones">
        {notifications.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No tienes notificaciones nuevas.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {notifications.map((n) => (
              <li key={n.id}>
                <Link
                  href={n.href}
                  onClick={() => setOpen(false)}
                  className="flex flex-col gap-1.5 rounded-xl border border-border p-3.5 transition-colors hover:bg-surface-muted"
                >
                  <span className={`chip self-start ${SEVERITY_TONE[n.severity]}`}>{n.title}</span>
                  <span className="text-sm text-ink-2">{n.text}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Sheet>
    </>
  );
}
