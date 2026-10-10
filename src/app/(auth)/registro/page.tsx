"use client";

import Link from "next/link";
import { useActionState } from "react";
import { INDUSTRY_OPTIONS } from "@/modules";
import { signUp, type AuthState } from "../actions";

export default function RegisterPage() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signUp, {});

  if (state.message) {
    return (
      <div className="card flex flex-col gap-3 p-5 text-center">
        <h1 className="font-display text-2xl">Revisa tu correo</h1>
        <p className="text-ink-2">{state.message}</p>
        <Link href="/login" className="btn-primary">
          Ir a iniciar sesión
        </Link>
      </div>
    );
  }

  return (
    <form action={action} className="flex flex-col gap-4">
      <h1 className="font-display text-2xl">Crea tu cuenta</h1>
      <label className="field">
        Tu nombre
        <input className="input" name="name" autoComplete="name" required />
      </label>
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
      <label className="field">
        Correo
        <input className="input" name="email" type="email" autoComplete="email" required />
      </label>
      <label className="field">
        Contraseña (mínimo 8 caracteres)
        <input className="input" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm text-primary-ink">
          {state.error}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Creando…" : "Crear cuenta"}
      </button>
      <p className="text-center text-sm text-ink-2">
        ¿Ya tienes cuenta?{" "}
        <Link href="/login" className="font-semibold text-primary">
          Inicia sesión
        </Link>
      </p>
    </form>
  );
}
