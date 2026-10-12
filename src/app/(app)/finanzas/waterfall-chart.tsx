import type { IncomeStatement } from "@/lib/finance";
import { compactMoney } from "@/lib/format";

type Bar = { label: string; value: number; tone: "income" | "deduction" | "profit" };

/** Cascada "De ingresos a utilidad" (Ent-Finanzas.dc.html): cada barra de deducción flota a la
 * altura acumulada que le corresponde, para leerse como una resta visual paso a paso. */
export function WaterfallChart({ statement }: { statement: IncomeStatement }) {
  const bars: Bar[] = [
    { label: "Ingresos", value: statement.income, tone: "income" },
    { label: "Materiales", value: statement.materials, tone: "deduction" },
    { label: "Mano de obra", value: statement.labor, tone: "deduction" },
    { label: "Comisiones", value: statement.commissions, tone: "deduction" },
    { label: "Gastos fijos", value: statement.fixedExpenses, tone: "deduction" },
    { label: "Utilidad neta", value: statement.netProfit, tone: "profit" },
  ];
  const scale = Math.max(statement.income, 1);
  let running = statement.income;

  return (
    <div className="flex flex-col gap-2">
      <div className="grid h-[200px] grid-cols-6 items-end gap-3 border-b border-border">
        {bars.map((b, i) => {
          const isDeduction = b.tone === "deduction";
          const bottomPct = isDeduction ? Math.max(0, ((running - b.value) / scale) * 100) : 0;
          if (isDeduction) running -= b.value;
          const heightPct = Math.min(100, Math.max(0.5, (Math.abs(b.value) / scale) * 100));
          return (
            <div key={i} className="relative h-full">
              <div
                className={`absolute inset-x-0 rounded-md ${isDeduction ? "bg-primary/70" : "bg-success"}`}
                style={{ bottom: `${bottomPct}%`, height: `${heightPct}%` }}
              />
              <span
                className={`absolute inset-x-0 text-center text-xs font-semibold ${isDeduction ? "text-primary-hover" : "text-success-ink"}`}
                style={{ bottom: `calc(${bottomPct + heightPct}% + 6px)` }}
              >
                {isDeduction ? "−" : ""}
                {compactMoney(b.value)}
              </span>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-6 gap-3 text-center text-xs text-ink-2">
        {bars.map((b, i) => (
          <span key={i} className={i === bars.length - 1 ? "font-semibold text-ink" : ""}>
            {b.label}
          </span>
        ))}
      </div>
    </div>
  );
}
