"use client";

import { useOptimistic, useTransition } from "react";
import { IconCheck } from "@/components/icons";
import type { ProductStep } from "@/lib/types";
import { toggleOrderStep } from "./actions";

export function ShiftSteps({ orderId, steps, doneStepIds }: { orderId: string; steps: ProductStep[]; doneStepIds: string[] }) {
  const [, startTransition] = useTransition();
  const [optimisticDone, toggleOptimistic] = useOptimistic(new Set(doneStepIds), (state, stepId: string) => {
    const next = new Set(state);
    if (next.has(stepId)) next.delete(stepId);
    else next.add(stepId);
    return next;
  });

  if (steps.length === 0) return null;
  const doneCount = steps.filter((s) => optimisticDone.has(s.id)).length;

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-xl font-semibold">Pasos del patrón</h2>
        <span className="text-sm text-muted">
          {doneCount} de {steps.length}
        </span>
      </div>
      <ul className="card flex flex-col overflow-hidden">
        {steps.map((step) => {
          const done = optimisticDone.has(step.id);
          return (
            <li key={step.id} className="border-b border-border last:border-0">
              <button
                onClick={() =>
                  startTransition(async () => {
                    toggleOptimistic(step.id);
                    await toggleOrderStep(orderId, step.id);
                  })
                }
                className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-muted"
              >
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    done ? "border-success bg-success text-on-primary" : "border-border-strong text-transparent"
                  }`}
                >
                  <IconCheck size={14} />
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className={`text-[15px] font-medium ${done ? "text-muted line-through" : ""}`}>{step.name}</span>
                  {step.detail && <span className="truncate text-[12px] text-muted">{step.detail}</span>}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
