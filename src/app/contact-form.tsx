"use client";

import { useActionState } from "react";
import { sendContact, type ContactState } from "./contact-actions";

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(sendContact, {});

  if (state.sent) {
    return (
      <p className="text-center text-[15px] text-ink-2">
        Listo, te vamos a responder a tu correo. Gracias por escribirnos.
      </p>
    );
  }

  return (
    <form action={action} className="mx-auto flex w-full max-w-md flex-col gap-3.5">
      <div className="grid gap-3.5 sm:grid-cols-2">
        <label className="field">
          Tu nombre
          <input className="input" name="name" required />
        </label>
        <label className="field">
          Tu correo
          <input className="input" name="email" type="email" required />
        </label>
      </div>
      <label className="field">
        Mensaje
        <textarea className="input min-h-28 py-2.5" name="message" required />
      </label>
      {state.error && (
        <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm text-primary-hover">
          {state.error}
        </p>
      )}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Enviando…" : "Enviar mensaje"}
      </button>
    </form>
  );
}
