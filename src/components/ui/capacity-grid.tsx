/**
 * DESIGN.md §6: celdas 38px — 0h #F7F4EF, ≤6h success-soft, ≤8h #F6DFC9, >8h #E9B3A8.
 * Lista para la Fase 3 (Producción › Capacidad); hoy sin datos reales.
 */
function cellColor(hours: number) {
  if (hours === 0) return "#F7F4EF";
  if (hours <= 6) return "var(--color-success-soft)";
  if (hours <= 8) return "#F6DFC9";
  return "#E9B3A8";
}

export function CapacityGrid({ rows, days }: { rows: { label: string; hours: number[] }[]; days: string[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr>
            <th className="w-32 pb-2 text-left font-medium text-muted">Persona</th>
            {days.map((d) => (
              <th key={d} className="pb-2 text-center font-medium text-muted">
                {d}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.label}>
              <td className="py-1 pr-2">{r.label}</td>
              {r.hours.map((h, i) => (
                <td key={i} className="p-0.5">
                  <div
                    className="flex size-[38px] items-center justify-center rounded-lg text-[12px] tabular-nums"
                    style={{ background: cellColor(h) }}
                  >
                    {h > 0 ? h : ""}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
