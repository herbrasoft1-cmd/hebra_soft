"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrength } from "@/components/password-strength";
import { signUp, type AuthState } from "../actions";

function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const [password, setPassword] = useState("");
  const params = useSearchParams();
  const next = params.get("next");
  const invite = params.get("invite");

  if (!invite) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-2xl">Necesitas una invitación</h1>
        <p className="text-ink-2">
          HEBRA es de uso privado: pedile a quien administra tu negocio que te invite, con el código o el enlace que
          te comparta.
        </p>
        <Link href="/invitar" className="btn-primary mt-1 w-full">
          Tengo un código
        </Link>
        <Link href="/login" className="text-sm font-semibold text-primary">
          Ya tengo cuenta
        </Link>
      </div>
    );
  }

  if (state.message) {
    return (
      <div className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-display text-2xl">Revisa tu correo</h1>
        <p className="text-ink-2">{state.message}</p>
        <Link href="/login" className="btn-primary mt-1 w-full">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Acepta la invitación</h1>
      {next && <input type="hidden" name="next" value={next} />}
      <input type="hidden" name="invite" value={invite} />
      <label className="field">
        Tu nombre
        <input className="input" name="name" autoComplete="name" required />
      </label>
      <label className="field">
        Correo
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Contraseña
        <PasswordInput name="password" autoComplete="new-password" minLength={8} value={password} onChange={setPassword} />
      </label>
      <PasswordStrength password={password} />
      {state.error && (
        <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm text-primary-hover">
          {state.error}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Creando…" : "Crear cuenta"}
      </button>
      <p className="text-center text-xs text-muted">
        Al crear tu cuenta aceptas el{" "}
        <Link href="/privacidad" className="underline hover:text-ink-2">
          tratamiento de datos y privacidad
        </Link>{" "}
        de HEBRA.
      </p>
      <p className="text-center text-sm text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}
