"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { passwordMeetsAllRules } from "@/lib/password";
import { createClient } from "@/lib/supabase/server";

export type AuthState = { error?: string; message?: string };

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Solo rutas relativas del propio sitio — nunca redirigir a una URL externa. */
function safeNext(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "");
  return s.startsWith("/") && !s.startsWith("//") ? s : null;
}

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect(safeNext(formData.get("next")) ?? "/inicio");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const invite = String(formData.get("invite") ?? "").trim() || null;
  const password = String(formData.get("password") ?? "");

  // HEBRA es de uso privado, no un SaaS de autorregistro: solo se puede crear cuenta
  // aceptando una invitación (código o enlace) de alguien que ya administra un negocio.
  // No es solo un gate de UI: esta acción también lo exige aunque se la invoque directo.
  if (!invite) return { error: "Necesitas una invitación para crear tu cuenta." };
  if (!passwordMeetsAllRules(password)) {
    return { error: "La contraseña debe tener mínimo 8 caracteres, una mayúscula, un número y un carácter especial." };
  }

  const redirectTo = new URL("/auth/callback", await siteOrigin());
  redirectTo.searchParams.set("invite", invite);

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
    options: {
      emailRedirectTo: redirectTo.toString(),
      data: { full_name: String(formData.get("name") ?? "").trim() },
    },
  });
  if (error) return { error: error.message };

  // Si el proyecto no exige confirmar correo, ya hay sesión: va directo a aceptar la invitación.
  if (data.session) redirect(`/invitar/${invite}`);

  return { message: "Te enviamos un correo para confirmar tu cuenta. Ábrelo y luego inicia sesión." };
}

export async function createBusiness(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const name = String(formData.get("business") ?? "").trim();
  if (name.length < 2) return { error: "Escribe el nombre de tu negocio." };
  const { error } = await supabase.rpc("create_tenant", {
    p_name: name,
    p_industry: String(formData.get("industry") ?? "crochet"),
  });
  if (error) return { error: error.message };
  redirect("/inicio");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
