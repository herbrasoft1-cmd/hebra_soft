"use client";

import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { updateProfile, uploadAvatar } from "@/app/(app)/account-actions";
import { IconCamera, IconChevronDown, IconHelp } from "./icons";
import { LogoutButton } from "./logout-button";
import { Sheet } from "./sheet";
import { SubmitButton } from "./submit-button";
import { Avatar } from "./ui/avatar";

/**
 * Menú de cuenta: editar el nombre y la foto propios, ir a Ayuda, cerrar sesión. Accesible para
 * cualquier rol (antes, cerrar sesión solo vivía dentro de Configuración, bloqueada
 * para ventas/tejedora — ahí no tenían ninguna forma de salir de la cuenta).
 */
export function AccountMenu({
  userId,
  userName,
  roleLabel,
  avatarUrl,
  children,
}: {
  userId: string;
  userName: string;
  roleLabel: string;
  avatarUrl?: string | null;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(userName);
  const [photo, setPhoto] = useState(avatarUrl ?? null);
  const [error, setError] = useState<string | null>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickPhoto = async (file: File) => {
    setPhotoError(null);
    setUploading(true);
    const fd = new FormData();
    fd.set("avatar", file);
    const res = await uploadAvatar(fd);
    setUploading(false);
    if (res.error) setPhotoError(res.error);
    else setPhoto(URL.createObjectURL(file));
  };

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Mi cuenta" className="contents cursor-pointer text-left">
        {children}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Mi cuenta">
        <div className="flex flex-col items-center gap-3 pb-1 text-center">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            aria-label="Cambiar foto de perfil"
            className="group relative overflow-hidden rounded-full focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-primary/30"
          >
            <Avatar id={userId} name={name} avatarUrl={photo} size={76} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-ink/0 text-transparent transition-colors group-hover:bg-ink/45 group-hover:text-white">
              {uploading ? (
                <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />
              ) : (
                <IconCamera size={22} />
              )}
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) pickPhoto(file);
            }}
          />
          <div className="flex flex-col gap-1">
            <span className="text-[16px] font-semibold">{name}</span>
            <span className="chip self-center bg-surface-muted text-[11px] text-ink-2">{roleLabel}</span>
          </div>
          {photoError && <p className="text-xs text-danger-ink">{photoError}</p>}
        </div>

        <section className="card flex flex-col gap-2.5 p-4">
          {editingName ? (
            <form
              action={async (fd) => {
                setError(null);
                const res = await updateProfile(fd);
                if (res.error) setError(res.error);
                else {
                  setName(String(fd.get("full_name") ?? name));
                  setEditingName(false);
                }
              }}
              className="flex flex-col gap-2.5"
            >
              <label className="field">
                Tu nombre
                <input className="input" name="full_name" defaultValue={name} autoFocus required />
              </label>
              {error && <p className="text-sm text-danger-ink">{error}</p>}
              <div className="flex gap-2">
                <SubmitButton className="btn-primary flex-1" pendingText="Guardando…">
                  Guardar
                </SubmitButton>
                <button type="button" onClick={() => setEditingName(false)} className="btn-ghost">
                  Cancelar
                </button>
              </div>
            </form>
          ) : (
            <button type="button" onClick={() => setEditingName(true)} className="flex items-center justify-between gap-3 text-left">
              <span className="flex flex-col">
                <span className="text-xs text-muted">Tu nombre</span>
                <span className="text-sm font-medium">{name}</span>
              </span>
              <span className="text-[13px] font-semibold text-primary">Editar</span>
            </button>
          )}
        </section>

        <div className="flex flex-col gap-1">
          <Link
            href="/ayuda"
            onClick={() => setOpen(false)}
            className="flex min-h-12 items-center gap-3 rounded-xl px-2.5 text-sm font-medium text-ink transition-colors hover:bg-surface-muted"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <IconHelp size={16} />
            </span>
            <span className="flex-1">Ayuda</span>
            <IconChevronDown size={16} className="-rotate-90 text-muted" />
          </Link>
          <LogoutButton />
        </div>
      </Sheet>
    </>
  );
}
