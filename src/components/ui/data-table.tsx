import type { ReactNode } from "react";

export type Column<T> = {
  key: string;
  label: string;
  align?: "left" | "right";
  render: (row: T) => ReactNode;
};

/** DESIGN.md §6: encabezado 13px muted con borde inferior border; filas con divider; números a la derecha. */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
}: {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] text-[14px]">
        <thead>
          <tr className="border-b border-border">
            {columns.map((c) => (
              <th
                key={c.key}
                className={`pb-2.5 text-[13px] font-medium text-muted ${c.align === "right" ? "text-right" : "text-left"}`}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={rowKey(row)} className="border-b border-divider last:border-0">
              {columns.map((c) => (
                <td key={c.key} className={`py-3 ${c.align === "right" ? "text-right tabular-nums" : "text-left"}`}>
                  {c.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
