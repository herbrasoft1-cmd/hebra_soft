"use client";

import { useActionState, useState } from "react";
import { IconCheck, IconPlus } from "@/components/icons";
import { Sheet } from "@/components/sheet";
import { SubmitButton } from "@/components/submit-button";
import { ROLE_LABEL, ROLE_OPTIONS } from "@/lib/roles";
import { createInvitation, type InviteState } from "./team-actions";

export function InviteSheet() {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState<InviteState, FormData>(createInvitation, {});
  const [copied, setCopied] = useState(false);
  const link = state.invitation ? `${window.location.origin}/invitar/${state.invitation.token}` : null;

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const close = () => {
    setOpen(false);
    setCopied(false);
  };

  return (
    <>
      <button className="btn-ghost" onClick={() => setOpen(true)}>
        <IconPlus size={18} /> Invitar
      </button>
      <Sheet open={open} onClose={close} title="Invitar a tu equipo">
        {link ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-ink-2">
              Comparte este enlace — solo funciona para el correo que invitaste y vence en 7 días.
            </p>
            <div className="flex items-center gap-2">
              <input className="input" readOnly value={link} onFocus={(e) => e.currentTarget.select()} />
              <button onClick={copy} className="btn-ghost shrink-0 px-4">
                {copied ? <IconCheck size={18} /> : "Copiar"}
              </button>
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
              <select className="input" name="role" defaultValue="staff">
                {ROLE_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    {ROLE_LABEL[r]}
                  </option>
                ))}
              </select>
            </label>
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
