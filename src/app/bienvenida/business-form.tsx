"use client";

import { useActionState } from "react";
import { INDUSTRY_OPTIONS } from "@/modules";
import { createBusiness, type AuthState } from "../(auth)/actions";

export function BusinessForm({ defaultName, defaultIndustry }: { defaultName: string; defaultIndustry: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(createBusiness, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="field">
        Nombre de tu negocio
        <input className="input" name="business" defaultValue={defaultName} required />
      </label>
      <label className="field">
        ¿Qué haces?
        <select className="input" name="industry" defaultValue={defaultIndustry}>
          {INDUSTRY_OPTIONS.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm text-primary-hover">
          {state.error}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Creando…" : "Empezar"}
      </button>
    </form>
  );
}
