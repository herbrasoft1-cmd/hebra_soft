"use client";

import { useTransition } from "react";
import { assignOrder } from "../actions";

/** "Sumar apoyo": reasignar el pedido a otra tejedora (reutiliza assignOrder). */
export function SupportAssignForm({ orderId, crew, currentUserId }: { orderId: string; crew: { user_id: string; email: string }[]; currentUserId: string | null }) {
  const [pending, startTransition] = useTransition();
  return (
    <select
      className="input"
      defaultValue={currentUserId ?? ""}
      disabled={pending}
      onChange={(e) => startTransition(() => assignOrder(orderId, e.target.value || null))}
    >
      <option value="">Sin asignar</option>
      {crew.map((m) => (
        <option key={m.user_id} value={m.user_id}>
          {m.email.split("@")[0]}
        </option>
      ))}
    </select>
  );
}
