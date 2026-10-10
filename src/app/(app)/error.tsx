"use client";

import { useEffect } from "react";
import { Logo } from "@/components/icons";
import { reportError } from "@/lib/report-error";

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportError(error, "app");
  }, [error]);

  return (
    <main className="flex min-h-[70dvh] flex-col items-center justify-center gap-5 p-8 text-center">
      <Logo size={64} />
      <h1 className="font-display text-3xl">Algo salió mal</h1>
      <p className="max-w-sm text-ink-2">
        Tuvimos un problema para cargar esta pantalla. Tus datos están seguros; intenta de nuevo.
      </p>
      <button onClick={reset} className="btn-primary">
        Reintentar
      </button>
    </main>
  );
}
