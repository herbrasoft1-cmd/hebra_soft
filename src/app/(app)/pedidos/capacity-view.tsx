"use client";

import { useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { ProgressBar } from "@/components/ui/progress-bar";
import { committedHours, suggestReassignment, weeklyAvailableHours, type OrderForLoad, type PersonLoad } from "@/lib/production";
import type { Availability } from "@/lib/types";
import { applySuggestion, upsertAvailability } from "./actions";

const WEEKDAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

type Member = { user_id: string; email: string; avatar_url: string | null };

function cellTone(h: number) {
  if (h <= 0) return "bg-surface-muted";
  if (h <= 6) return "bg-success-soft";
  if (h <= 8) return "bg-warning-soft";
  return "bg-danger-soft";
}

/**
 * Disponibilidad semanal recurrente por persona y día (no un reparto día a día de
 * pedidos: ver la nota de la Fase 3 en docs/bitacora.md sobre por qué). "Capacidad
 * semanal" y la sugerencia de reparto comparan totales reales de la semana.
 */
export function CapacityView({
  members,
  availability,
  orders,
  viewerId,
  canEditAny,
}: {
  members: Member[];
  availability: Availability[];
  orders: OrderForLoad[];
  viewerId: string;
  canEditAny: boolean;
}) {
  const [hours, setHours] = useState<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const a of availability) map[`${a.user_id}-${a.weekday}`] = Number(a.hours);
    return map;
  });

  const people: PersonLoad[] = members.map((m) => ({
    userId: m.user_id,
    name: m.email,
    availableHours: weeklyAvailableHours(
      Array.from({ length: 7 }, (_, w) => ({ user_id: m.user_id, hours: hours[`${m.user_id}-${w}`] ?? 0 })),
      m.user_id,
    ),
    committedHours: committedHours(orders, m.user_id),
  }));
  const totalAvailable = people.reduce((s, p) => s + p.availableHours, 0);
  const totalCommitted = people.reduce((s, p) => s + p.committedHours, 0);
  const suggestion = suggestReassignment(people, orders);
  const fromName = members.find((m) => m.user_id === suggestion?.fromUserId)?.email;
  const toName = members.find((m) => m.user_id === suggestion?.toUserId)?.email;

  const saveCell = (userId: string, weekday: number, value: number) => {
    setHours((prev) => ({ ...prev, [`${userId}-${weekday}`]: value }));
  };
  const commitCell = (userId: string, weekday: number, value: number) => {
    upsertAvailability(userId, weekday, value).catch(() => {});
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
      <section className="card flex flex-col gap-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold">Disponibilidad por persona</h2>
          <div className="flex gap-4 text-xs text-ink-2">
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-success-soft" />
              Holgada
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-warning-soft" />
              Llena
            </span>
            <span className="flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-danger-soft" />
              Sobrecarga
            </span>
          </div>
        </div>

        {members.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted">No hay personas con cronómetro habilitado todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              <div className="grid grid-cols-[170px_repeat(7,1fr)_64px] gap-1.5 px-1 text-xs text-muted">
                <span>Persona</span>
                {WEEKDAYS.map((d) => (
                  <span key={d} className="text-center">
                    {d}
                  </span>
                ))}
                <span className="text-right">Total</span>
              </div>
              {members.map((m) => {
                const canEdit = canEditAny || m.user_id === viewerId;
                const total = weeklyAvailableHours(
                  Array.from({ length: 7 }, (_, w) => ({ user_id: m.user_id, hours: hours[`${m.user_id}-${w}`] ?? 0 })),
                  m.user_id,
                );
                return (
                  <div
                    key={m.user_id}
                    className="mt-1.5 grid grid-cols-[170px_repeat(7,1fr)_64px] items-center gap-1.5 rounded-lg px-1 py-0.5 text-sm"
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar id={m.user_id} name={m.email} avatarUrl={m.avatar_url} size={26} />
                      <span className="truncate">{m.email}</span>
                    </span>
                    {Array.from({ length: 7 }, (_, weekday) => {
                      const h = hours[`${m.user_id}-${weekday}`] ?? 0;
                      return canEdit ? (
                        <input
                          key={weekday}
                          type="number"
                          min="0"
                          max="24"
                          step="0.5"
                          value={h || ""}
                          onChange={(e) => saveCell(m.user_id, weekday, Number(e.target.value) || 0)}
                          onBlur={(e) => commitCell(m.user_id, weekday, Number(e.target.value) || 0)}
                          className={`h-9 rounded-lg text-center text-[13px] font-medium outline-none ${cellTone(h)}`}
                        />
                      ) : (
                        <span key={weekday} className={`flex h-9 items-center justify-center rounded-lg text-[13px] font-medium ${cellTone(h)}`}>
                          {h || "—"}
                        </span>
                      );
                    })}
                    <span className="text-right font-semibold tabular-nums">{total} h</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-col gap-4">
        <div className="card flex flex-col gap-2 p-5">
          <span className="text-[13px] text-muted">Capacidad semanal</span>
          <span className="font-display text-[28px] font-medium tabular-nums">
            {Math.round(totalCommitted)} / {Math.round(totalAvailable)} h
          </span>
          <ProgressBar
            value={totalAvailable > 0 ? Math.min(100, (totalCommitted / totalAvailable) * 100) : 0}
            tone={totalCommitted > totalAvailable ? "danger" : "primary"}
          />
          <span className="text-[13px] text-ink-2">{Math.max(0, Math.round(totalAvailable - totalCommitted))} h libres</span>
        </div>

        {suggestion && fromName && toName && (
          <div className="flex flex-col gap-3 rounded-2xl bg-night p-5 text-on-night">
            <span className="text-[13px] font-semibold text-accent-light">Sugerencia de reparto</span>
            <p className="text-sm">
              Mover el pedido <strong>{suggestion.orderTitle}</strong> ({suggestion.hours.toFixed(1)} h) de {fromName} a {toName}{" "}
              equilibra la semana.
            </p>
            <form action={async () => void (await applySuggestion(suggestion.orderId, suggestion.toUserId))}>
              <button className="btn w-full bg-accent-light text-ink hover:brightness-95">Aplicar cambio</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
