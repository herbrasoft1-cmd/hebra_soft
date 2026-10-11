"use client";

import { useState } from "react";

/** Comparte (o copia) el link del portal público de seguimiento. */
export function ShareTrackingButton({ token }: { token: string | null }) {
  const [copied, setCopied] = useState(false);
  if (!token) return null;

  const share = async () => {
    const url = `${window.location.origin}/seguimiento/${token}`;
    if (navigator.share) {
      try {
        await navigator.share({ url, title: "Seguimiento de tu pedido" });
        return;
      } catch {
        /* el usuario canceló el share nativo, probamos copiar */
      }
    }
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button onClick={share} className="btn-ghost min-h-11 w-full text-sm">
      {copied ? "Link copiado" : "Compartir seguimiento"}
    </button>
  );
}
