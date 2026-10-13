"use client";

import Link from "next/link";
import { useActionState } from "react";
import { lookupInviteCode, type CodeState } from "./actions";
import { Shell } from "./shell";

export default function InviteCodePage() {
  const [state, action, pending] = useActionState<CodeState, FormData>(lookupInviteCode, {});

  return (
    <Shell
      title="Tengo un código"
      text="Escribe el código que te compartió quien te invitó a su negocio."
      action={
        <form action={action} className="flex flex-col gap-4">
          <label className="field">
            Código de invitación
            <input
              className="input text-center font-mono text-lg uppercase tracking-[0.2em]"
              name="code"
              placeholder="A3F9-7BC1"
              autoCapitalize="characters"
              autoFocus
              required
            />
          </label>
          {state.error && (
            <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm text-primary-hover">
              {state.error}
            </p>
          )}
          <button className="btn-primary" disabled={pending}>
            {pending ? "Buscando…" : "Continuar"}
          </button>
          <p className="text-center text-sm text-ink-2">
            ¿Ya tienes cuenta?{" "}
            <Link href="/login" className="font-semibold text-primary">
              Inicia sesión
            </Link>
          </p>
        </form>
      }
    />
  );
}
