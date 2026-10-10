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

export async function signIn(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? "").trim(),
    password: String(formData.get("password") ?? ""),
  });
  if (error) return { error: "Correo o contraseña incorrectos." };
  redirect("/inicio");
}

export async function signUp(_: AuthState, formData: FormData): Promise<AuthState> {
  const supabase = await createClient();
  const businessName = String(formData.get("business") ?? "").trim();
  const industry = String(formData.get("industry") ?? "crochet");
  const password = String(formData.get("password") ?? "");

  if (businessName.length < 2) return { error: "Escribe el nombre de tu negocio." };
  if (password.length < 8) return { error: "La contraseña debe tener al menos 8 caracteres." };

  const { data, error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? "").trim(),
    password,
    options: {
      emailRedirectTo: `${await siteOrigin()}/auth/callback`,
      // Se guardan para crear el negocio después de confirmar el correo
      data: {
        full_name: String(formData.get("name") ?? "").trim(),
        business_name: businessName,
        industry,
      },
    },
  });
  if (error) return { error: error.message };

  // Si el proyecto no exige confirmar correo, ya hay sesión: creamos el negocio de una vez.
  if (data.session) {
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
