"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { updateProfile } from "@/app/(app)/account-actions";
import { IconHelp } from "./icons";
import { LogoutButton } from "./logout-button";
import { Sheet } from "./sheet";
import { SubmitButton } from "./submit-button";
import { Avatar } from "./ui/avatar";

/**
 * Menú de cuenta: editar el nombre propio, ir a Ayuda, cerrar sesión. Accesible para
 * cualquier rol (antes, cerrar sesión solo vivía dentro de Configuración, bloqueada
 * para ventas/tejedora — ahí no tenían ninguna forma de salir de la cuenta).
 */
export function AccountMenu({ userId, userName, roleLabel, children }: { userId: string; userName: string; roleLabel: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(userName);
  const [error, setError] = useState<string | null>(null);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} aria-label="Mi cuenta" className="contents cursor-pointer text-left">
        {children}
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} title="Mi cuenta">
        <div className="flex items-center gap-3">
          <Avatar id={userId} name={name} size={48} />
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[15px] font-semibold">{name}</span>
            <span className="text-[13px] text-muted">{roleLabel}</span>
          </div>
        </div>

        <form
          action={async (fd) => {
            setError(null);
            const res = await updateProfile(fd);
            if (res.error) setError(res.error);
            else setName(String(fd.get("full_name") ?? name));
          }}
          className="flex flex-col gap-2.5"
        >
          <label className="field">
            Tu nombre
            <input className="input" name="full_name" defaultValue={userName} required />
          </label>
          {error && <p className="text-sm text-danger-ink">{error}</p>}
          <SubmitButton className="btn-ghost" pendingText="Guardando…">
            Guardar nombre
          </SubmitButton>
        </form>

        <Link href="/ayuda" onClick={() => setOpen(false)} className="btn-ghost min-h-11 w-full justify-start gap-2.5">
          <IconHelp size={18} /> Ayuda
        </Link>

        <LogoutButton />
      </Sheet>
    </>
  );
}
