import { Logo } from "@/components/icons";

export const metadata = { title: "Sin conexión" };

/** Página que muestra el service worker cuando no hay internet y la ruta no está en caché. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 p-8 text-center">
      <Logo size={64} />
      <h1 className="font-display text-3xl">Estás sin internet</h1>
      <p className="max-w-sm text-ink-2">
        Esta pantalla necesita conexión. Si tenías el cronómetro corriendo, sigue contando: tus
        tiempos se guardan en el celular y se sincronizan al volver.
      </p>
      <a href="/inicio" className="btn-primary">
        Reintentar
      </a>
    </main>
  );
}
