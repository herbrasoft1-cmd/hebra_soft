"use client";

import { useState } from "react";
import { IconPlus } from "@/components/icons";
import { EmptyState } from "@/components/page-header";
import { Sheet } from "@/components/sheet";
import { SubmitButton } from "@/components/submit-button";
import { initials, money, whatsappLink } from "@/lib/format";
import type { Customer } from "@/lib/types";
import { deleteCustomer, saveCustomer } from "./actions";

type Row = Customer & { stats: { count: number; total: number } };

export function CustomersView({ customers }: { customers: Row[] }) {
  const [editing, setEditing] = useState<Row | "new" | null>(null);
  const [q, setQ] = useState("");
  const list = customers.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end gap-3">
        <label className="field min-w-56 flex-1">
          Buscar cliente
          <input className="input" type="search" value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button className="btn-primary" onClick={() => setEditing("new")}>
          <IconPlus size={18} /> Nuevo cliente
        </button>
      </div>

      {customers.length === 0 ? (
        <EmptyState title="Sin clientes aún" text="Se crean solos al registrar un pedido, o puedes agregarlos aquí." />
      ) : (
        <ul className="grid gap-2.5 md:grid-cols-2">
          {list.map((c) => {
            const wa = whatsappLink(c.whatsapp);
            return (
              <li key={c.id} className="card flex items-center gap-3 p-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-sage-soft text-sm font-semibold text-sage-ink">
                  {initials(c.name)}
                </span>
                <button onClick={() => setEditing(c)} className="flex min-w-0 flex-1 flex-col text-left">
                  <span className="truncate text-[15px] font-semibold">{c.name}</span>
                  <span className="truncate text-xs text-muted">
                    {c.stats.count} pedido{c.stats.count === 1 ? "" : "s"} · {money(c.stats.total)}
                    {c.instagram ? ` · @${c.instagram}` : ""}
                  </span>
                </button>
                {wa && (
                  <a href={wa} target="_blank" rel="noreferrer" className="btn-ghost min-h-11 px-3 text-sm">
                    WhatsApp
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing === "new" ? "Nuevo cliente" : "Ficha del cliente"}>
        {editing !== null && (
          <div className="flex flex-col gap-3">
            <form
              key={editing === "new" ? "new" : editing.id}
              action={async (fd) => {
                await saveCustomer(fd);
                setEditing(null);
              }}
              className="flex flex-col gap-3.5"
            >
              {editing !== "new" && <input type="hidden" name="id" value={editing.id} />}
              <label className="field">
                Nombre
                <input className="input" name="name" defaultValue={editing === "new" ? "" : editing.name} required />
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className="field">
                  WhatsApp
                  <input className="input" name="whatsapp" inputMode="tel" defaultValue={editing === "new" ? "" : (editing.whatsapp ?? "")} />
                </label>
                <label className="field">
                  Instagram
                  <input className="input" name="instagram" placeholder="@" defaultValue={editing === "new" ? "" : (editing.instagram ?? "")} />
                </label>
              </div>
              <label className="field">
                Dirección de envío
                <textarea className="input min-h-20 py-2.5" name="address" defaultValue={editing === "new" ? "" : (editing.address ?? "")} />
              </label>
              <SubmitButton>Guardar</SubmitButton>
            </form>
            {editing !== "new" && (
              <form
                action={async (fd) => {
                  await deleteCustomer(fd);
                  setEditing(null);
                }}
                onSubmit={(e) => !confirm("¿Eliminar este cliente?") && e.preventDefault()}
              >
                <input type="hidden" name="id" value={editing.id} />
                <button className="btn w-full text-sm text-muted">Eliminar cliente</button>
              </form>
            )}
          </div>
        )}
      </Sheet>
    </div>
  );
}
