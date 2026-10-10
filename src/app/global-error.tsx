"use client";

import { useEffect } from "react";

/** Última red de seguridad: solo se activa si el propio layout raíz falla. */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="es">
      <body
        style={{
          display: "flex",
          minHeight: "100dvh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1.25rem",
          padding: "2rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#FDFBF7",
          color: "#231C19",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600 }}>Algo salió mal</h1>
        <p style={{ maxWidth: 360, opacity: 0.8 }}>
          HEBRA no pudo cargar. Intenta de nuevo; si sigue pasando, recarga la página.
        </p>
        <button
          onClick={reset}
          style={{
            borderRadius: "999px",
            padding: "0.75rem 1.5rem",
            background: "#A85B45",
            color: "#fff",
            border: "none",
            fontWeight: 600,
          }}
        >
          Reintentar
        </button>
      </body>
    </html>
  );
}
