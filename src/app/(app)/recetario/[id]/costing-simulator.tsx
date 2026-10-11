"use client";

import { useMemo, useState } from "react";
import { ChoiceCard } from "@/components/ui/choice-card";
import { Toggle } from "@/components/ui/toggle";
import { IVA_PCT, SIMULATOR_MARGINS, simulatorPrice } from "@/lib/costing";
import { duration, money } from "@/lib/format";
import type { SalesChannel } from "@/lib/types";
import { publishProductVersion } from "../actions";

const TIME_STEP_MIN = 10;
const RATE_STEP = 500;

type StackSegment = { key: string; label: string; amount: number; color: string };

export function CostingSimulator({
  productId,
  initialMinutes,
  hourlyRate,
  toolWearPct,
  materials,
  channels,
}: {
  productId: string;
  initialMinutes: number;
  hourlyRate: number;
  toolWearPct: number;
  materials: number;
  channels: SalesChannel[];
}) {
  const firstChannel = channels[0];
  const [minutes, setMinutes] = useState(Math.max(30, initialMinutes));
  const [rate, setRate] = useState(hourlyRate);
  const [channelId, setChannelId] = useState(firstChannel?.id ?? "");
  const [marginPct, setMarginPct] = useState<number>(40);
  const [includeIva, setIncludeIva] = useState(false);
  const [monthlyFixedCosts, setMonthlyFixedCosts] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [published, setPublished] = useState<string | null>(null);

  const channel = channels.find((c) => c.id === channelId) ?? firstChannel;

  const result = useMemo(
    () =>
      simulatorPrice({
        materials,
        laborSeconds: minutes * 60,
        hourlyRate: rate,
        toolWearPct,
        channel: channel ? { commissionPct: channel.commission_pct, fixedFee: channel.fixed_fee } : { commissionPct: 0, fixedFee: 0 },
        marginPct,
        includeIva,
      }),
    [materials, minutes, rate, toolWearPct, channel, marginPct, includeIva],
  );

  const segments: StackSegment[] = [
    { key: "mat", label: "Materiales", amount: result.materials, color: "#C9906F" },
    { key: "lab", label: "Mano de obra", amount: result.labor, color: "#E2A285" },
    { key: "wear", label: `Desgaste ${toolWearPct}%`, amount: result.wear, color: "#8A6A3B" },
    { key: "fee", label: "Comisión canal", amount: result.commissionAmount, color: "#7A7168" },
    { key: "tax", label: "IVA", amount: result.ivaAmount, color: "#5A5E7A" },
    { key: "profit", label: "Utilidad", amount: Math.max(0, result.profit), color: "#7FB08F" },
  ];
  const stackTotal = result.finalPrice || 1;

  const fixedCostsNum = Number(monthlyFixedCosts.replace(/\D/g, "")) || 0;
  const breakeven = fixedCostsNum > 0 && result.profit > 0 ? Math.ceil(fixedCostsNum / result.profit) : null;

  const reset = () => {
    setMinutes(Math.max(30, initialMinutes));
    setRate(hourlyRate);
    setChannelId(firstChannel?.id ?? "");
    setMarginPct(40);
    setIncludeIva(false);
    setPublished(null);
  };

  const publish = async () => {
    setPublishing(true);
    try {
      const v = await publishProductVersion({
        productId,
        materialsCost: result.materials,
        laborCost: result.labor,
        wearCost: result.wear,
        hourlyRate: rate,
        laborSeconds: minutes * 60,
        channelName: channel?.name ?? null,
        commissionPct: channel?.commission_pct ?? 0,
        fixedFee: channel?.fixed_fee ?? 0,
        marginPct,
        ivaIncluded: includeIva,
        netPrice: result.netPrice,
      });
      setPublished(`Versión ${v.version_number} publicada`);
    } finally {
      setPublishing(false);
    }
  };

  return (
    <section className="card flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Simulador de precio</h2>
        <button type="button" onClick={reset} className="text-[13px] font-medium text-primary hover:text-primary-hover">
          Restablecer
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Stepper
          label="Tiempo de tejido"
          value={duration(minutes * 60)}
          onMinus={() => setMinutes((m) => Math.max(30, m - TIME_STEP_MIN))}
          onPlus={() => setMinutes((m) => m + TIME_STEP_MIN)}
          minusLabel={`Restar ${TIME_STEP_MIN} minutos`}
          plusLabel={`Sumar ${TIME_STEP_MIN} minutos`}
        />
        <Stepper
          label="Valor de la hora"
          value={money(rate)}
          onMinus={() => setRate((r) => Math.max(5000, r - RATE_STEP))}
          onPlus={() => setRate((r) => r + RATE_STEP)}
          minusLabel="Restar 500 pesos"
          plusLabel="Sumar 500 pesos"
        />
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted">Canal de venta</span>
        {channels.length === 0 ? (
          <p className="text-sm text-muted">Agrega un canal en Configuración para poder elegirlo aquí.</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {channels.map((c) => (
              <ChoiceCard key={c.id} selected={c.id === channelId} onClick={() => setChannelId(c.id)}>
                <span className="block text-[13px] font-semibold">{c.name}</span>
                <span className="text-[11px] text-muted">
                  {c.commission_pct > 0 && `${c.commission_pct}% por venta`}
                  {c.commission_pct > 0 && c.fixed_fee > 0 && " + "}
                  {c.fixed_fee > 0 && money(c.fixed_fee)}
                  {c.commission_pct === 0 && c.fixed_fee === 0 && "Sin comisión"}
                </span>
              </ChoiceCard>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted">Margen objetivo (sobre precio de venta)</span>
        <div className="grid grid-cols-4 gap-1.5">
          {SIMULATOR_MARGINS.map((m) => {
            const active = m === marginPct;
            return (
              <button
                key={m}
                type="button"
                aria-pressed={active}
                onClick={() => setMarginPct(m)}
                className={`min-h-9 rounded-lg text-[13px] font-semibold transition-colors ${
                  active ? "bg-night text-on-night" : "border border-border-strong text-ink-2 hover:bg-surface-muted"
                }`}
              >
                {m}%
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex min-h-11 items-center justify-between rounded-[10px] border border-border-strong px-3 text-[13px]">
        <span>Incluir IVA {IVA_PCT}% en el precio al público</span>
        <Toggle checked={includeIva} onChange={setIncludeIva} label="Incluir IVA en el precio" />
      </div>

      <div className="flex flex-col gap-3.5 rounded-2xl bg-night p-4.5 text-on-night">
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-on-night-muted">Precio sugerido</span>
            <span className="font-display text-[36px] leading-none tabular-nums">{money(result.finalPrice)}</span>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-xs text-on-night-muted">Ganas por pieza</span>
            <span className="text-lg font-semibold text-success tabular-nums">{money(result.profit)}</span>
          </div>
        </div>
        <div className="flex h-3 overflow-hidden rounded-md">
          {segments.map((s) => (
            <div key={s.key} style={{ width: `${(s.amount / stackTotal) * 100}%`, background: s.color }} />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-on-night-muted">
          {segments.map((s) => (
            <span key={s.key} className={`flex justify-between ${s.key === "profit" ? "text-success" : ""}`}>
              <span>{s.label}</span>
              <span className="tabular-nums">{money(s.amount)}</span>
            </span>
          ))}
        </div>
      </div>

      <label className="field">
        Gastos fijos mensuales de la sede (para el punto de equilibrio)
        <input
          className="input"
          inputMode="numeric"
          placeholder="Ej. 1.900.000"
          value={monthlyFixedCosts}
          onChange={(e) => setMonthlyFixedCosts(e.target.value)}
        />
      </label>
      {breakeven !== null && (
        <p className="text-[13px] text-ink-2">
          Con este precio necesitas vender <strong>{breakeven}</strong> piezas al mes para cubrir esos gastos fijos.
        </p>
      )}

      <button type="button" onClick={publish} disabled={publishing || !channel} className="btn-primary w-full">
        {publishing ? "Publicando…" : `Publicar precio ${money(result.finalPrice)}`}
      </button>
      {published && <p className="text-center text-[13px] text-success-ink">{published}</p>}
    </section>
  );
}

function Stepper({
  label,
  value,
  onMinus,
  onPlus,
  minusLabel,
  plusLabel,
}: {
  label: string;
  value: string;
  onMinus: () => void;
  onPlus: () => void;
  minusLabel: string;
  plusLabel: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs text-muted">{label}</span>
      <div className="flex items-center overflow-hidden rounded-[10px] border border-border-strong">
        <button type="button" onClick={onMinus} aria-label={minusLabel} className="flex size-10 shrink-0 items-center justify-center bg-surface-muted text-lg">
          −
        </button>
        <span className="flex-1 text-center text-[13px] font-semibold tabular-nums">{value}</span>
        <button type="button" onClick={onPlus} aria-label={plusLabel} className="flex size-10 shrink-0 items-center justify-center bg-surface-muted text-lg">
          +
        </button>
      </div>
    </div>
  );
}
