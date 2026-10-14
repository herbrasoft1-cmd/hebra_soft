"use server";

import { sendContactMessage } from "@/lib/email";

export type ContactState = { error?: string; sent?: boolean };

export async function sendContact(_: ContactState, formData: FormData): Promise<ContactState> {
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const message = String(formData.get("message") ?? "").trim();

  if (!name || !email || !message) return { error: "Completa los tres campos." };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Escribe un correo válido." };

  await sendContactMessage({ fromName: name, fromEmail: email, message });
  return { sent: true };
}
