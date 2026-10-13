"use client";

import { useActionState, useState } from "react";
import { IconCheck, IconPlus } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { SubmitButton } from "@/components/submit-button";
import { ROLE_LABEL, ROLE_OPTIONS } from "@/lib/roles";
import type { Location } from "@/lib/types";
import { createInvitation, type InviteState } from "./team-actions";

export function InviteSheet({ locations }: { locations: Location[] }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<InviteState, FormData>(createInvitation, {});
  const [copied, setCopied] = useState<"link" | "code" | null>(null);
  const link = state.invitation ? `${window.location.origin}/invitar/${state.invitation.token}` : null;
  const code = state.invitation?.code ?? null;

  const copy = async (value: string, which: "link" | "code") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      setTimeout(() => setCopied(null), 2000);
    } catch {}
  };

  const close = () => {
    setOpen(false);
    setCopied(null);
  };

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        <IconPlus size={18} /> Invitar
      </button>
      <Sheet open={open} onClose={close} title="Invitar a tu equipo">
        {link && code ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2">
              Solo funciona para el correo que invitaste y vence en 7 días.
            </p>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-2">Código para decirle o escribirle (más fácil por WhatsApp)</span>
              <div className="flex items-center gap-2">
                <span className="input flex-1 text-center font-mono text-lg font-semibold tracking-[0.2em]">
                  {code.slice(0, 4)}-{code.slice(4)}
                </span>
                <button onClick={() => copy(code, "code")} className="btn-ghost shrink-0 px-4">
                  {copied === "code" ? <IconCheck size={18} /> : "Copiar"}
                </button>
              </div>
              <p className="text-xs text-muted">Lo escribe en hebrasoft.com → Tengo una invitación.</p>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-semibold text-ink-2">O el enlace directo</span>
              <div className="flex items-center gap-2">
                <input className="input" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
                <button onClick={() => copy(link, "link")} className="btn-ghost shrink-0 px-4">
                  {copied === "link" ? <IconCheck size={18} /> : "Copiar"}
                </button>
              </div>
            </div>
            <button onClick={close} className="btn-primary">
              Listo
            </button>
          </div>
        ) : (
          <form action={action} className="flex flex-col gap-3.5">
            <label className="field">
              Correo de la persona
              <input className="input" name="email" type="email" required autoFocus />
            </label>
            <label className="field">
              Rol
              <select className="input" name="role" defaultValue="tejedora">
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
            {locations.length > 0 && (
              <label className="field">
                Sede
                <select className="input" name="location_id" defaultValue="">
                  <option value="">Todas</option>
                  {locations.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {state.error && (
              <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm text-primary-hover">
                {state.error}
              </p>
            )}
            <SubmitButton pendingText="Creando…">Crear invitación</SubmitButton>
          </form>
        )}
      </Sheet>
    </>
  );
}
