"use client";

import { signOut } from "@/app/(auth)/actions";

/** Cierra sesión y borra las páginas guardadas por el service worker (privacidad en equipos compartidos). */
export function LogoutButton() {
  return (
    <form
      action={signOut}
      onSubmit={() => {
        navigator.serviceWorker?.controller?.postMessage("clear-pages");
        try {
          localStorage.removeItem("hebra.timer");
        } catch {}
      }}
    >
      <button className="btn-ghost w-full">Cerrar sesión</button>
    </form>
  );
}
