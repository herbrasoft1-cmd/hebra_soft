"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState } from "react";
import { signIn, type AuthState } from "../actions";

function LoginForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signIn, {});
  const params = useSearchParams();
  const next = params.get("next");
  const registerHref = next ? `/registro?next=${encodeURIComponent(next)}` : "/registro";

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Inicia sesión</h1>
      {next && <input type="hidden" name="next" value={next} />}
      <label className="field">
        Correo
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Contraseña
        <input className="input" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm text-primary-hover">
          {state.error}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Entrando…" : "Entrar"}
      </button>
      <p className="text-center text-sm text-ink-2">
        ¿Primera vez?{" "}
        <Link href={registerHref} className="font-semibold text-primary">
          Crea tu cuenta
        </Link>
      </p>
    </form>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
