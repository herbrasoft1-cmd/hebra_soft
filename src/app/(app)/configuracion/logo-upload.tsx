"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { uploadLogo } from "./actions";

export function LogoUpload({ logoUrl }: { logoUrl: string | null }) {
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      action={async (fd) => {
        const res = await uploadLogo(fd);
        setError(res.error ?? null);
      }}
      className="card flex flex-col gap-3 p-5"
    >
      <h2 className="font-display text-xl font-semibold">Logo para remisiones</h2>
      <div className="flex items-center gap-4">
        {logoUrl ? (
          <img src={logoUrl} alt="Logo actual" className="size-16 rounded-xl border border-border object-contain" />
        ) : (
          <span className="flex size-16 items-center justify-center rounded-xl border border-dashed border-border-strong text-xs text-muted">
            Sin logo
          </span>
        )}
        <label className="field flex-1">
          Imagen PNG o JPG
          <input className="text-sm" type="file" name="logo" accept="image/png,image/jpeg" required />
        </label>
      </div>
      {error && <p className="text-sm text-primary-hover">{error}</p>}
      <SubmitButton className="btn-ghost" pendingText="Subiendo…">
        Subir logo
      </SubmitButton>
    </form>
  );
}
