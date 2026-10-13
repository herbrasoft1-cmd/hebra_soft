"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useActionState, useState } from "react";
import { PasswordInput } from "@/components/password-input";
import { PasswordStrength } from "@/components/password-strength";
import { INDUSTRY_OPTIONS } from "@/modules";
import { signUp, type AuthState } from "../actions";

function RegisterForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});
  const [password, setPassword] = useState("");
  const params = useSearchParams();
  const next = params.get("next");
  const invite = params.get("invite");

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
      <h1 className="font-display text-2xl">{invite ? "Acepta la invitación" : "Crea tu cuenta"}</h1>
      {next && <input type="hidden" name="next" value={next} />}
      {invite && <input type="hidden" name="invite" value={invite} />}
      <div className={invite ? "" : "grid gap-3.5 sm:grid-cols-2"}>
        <label className="field">
          Tu nombre
          <input className="input" name="name" autoComplete="name" required />
        </label>
        <label className="field">
          Correo
          <input className="input" name="email" type="email" autoComplete="email" required />
        </label>
      </div>
      {!invite && (
        <div className="grid gap-3.5 sm:grid-cols-2">
          <label className="field">
            Nombre de tu negocio
            <input className="input" name="business" placeholder="Ej: Hilos y Ovillos" required />
          </label>
          <label className="field">
            ¿Qué haces?
            <select className="input" name="industry" defaultValue="crochet">
              {INDUSTRY_OPTIONS.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
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
