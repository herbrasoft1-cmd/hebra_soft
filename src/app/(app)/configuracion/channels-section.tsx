import { SubmitButton } from "@/components/submit-button";
import { money } from "@/lib/format";
import type { SalesChannel } from "@/lib/types";
import { createSalesChannel } from "./actions";

export function ChannelsSection({ channels }: { channels: SalesChannel[] }) {
  return (
    <section className="card flex flex-col gap-4 p-5">
      <div>
        <h2 className="font-display text-xl font-semibold">Canales de venta</h2>
        <p className="text-sm text-ink-2">Comisión y valor fijo de cada canal, para el simulador de precio y los pedidos.</p>
      </div>

      <ul className="card flex flex-col overflow-hidden">
        {channels.map((c) => (
          <li key={c.id} className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 last:border-0">
            <span className="truncate text-[15px] font-medium">{c.name}</span>
            <span className="shrink-0 text-sm text-muted">
              {c.commission_pct > 0 && `${c.commission_pct}%`}
              {c.commission_pct > 0 && c.fixed_fee > 0 && " + "}
              {c.fixed_fee > 0 && money(c.fixed_fee)}
              {c.commission_pct === 0 && c.fixed_fee === 0 && "Sin comisión"}
            </span>
          </li>
        ))}
      </ul>

      <form action={createSalesChannel} className="grid grid-cols-[1fr_90px_110px_auto] items-end gap-2">
        <label className="field">
          Nuevo canal
          <input className="input" name="name" placeholder="Ej. Ferias" required />
        </label>
        <label className="field">
          % comisión
          <input className="input" name="commission_pct" type="number" min="0" max="100" step="0.01" defaultValue="0" />
        </label>
        <label className="field">
          Valor fijo
          <input className="input" name="fixed_fee" type="number" min="0" step="any" defaultValue="0" />
        </label>
        <SubmitButton className="btn-ghost" pendingText="Creando…">
          Agregar
        </SubmitButton>
      </form>
    </section>
  );
}
