"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
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
  const businessName = String(formData.get("business") ?? "").trim();
  const industry = String(formData.get("industry") ?? "crochet");
  const password = String(formData.get("password") ?? "");

  // Si viene de una invitación, se une al negocio del que invitó: no hace falta nombre de negocio.
  if (!invite && businessName.length < 2) return { error: "Escribe el nombre de tu negocio." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const redirectTo = new URL("/auth/callback", await siteOrigin());
  if (invite) redirectTo.searchParams.set("invite", invite);

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
    options: {
      emailRedirectTo: redirectTo.toString(),
      // Se guardan para crear el negocio después de confirmar el correo
      data: {
        full_name: String(formData.get("name") ?? "").trim(),
        business_name: businessName,
        industry,
      },
    },
  });
  if (error) return { error: error.message };

  // Si el proyecto no exige confirmar correo, ya hay sesión.
  if (data.session) {
    if (invite) redirect(`/invitar/${invite}`);
    const { error: rpcError } = await supabase.rpc("create_tenant", {
      p_name: businessName,
      p_industry: industry,
    });
    if (rpcError) return { error: rpcError.message };
    redirect("/inicio");
  }

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
