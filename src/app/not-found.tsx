import Link from "next/link";
import { Logo } from "@/components/icons";

export const metadata = { title: "Página no encontrada" };

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-5 p-8 text-center">
      <Logo size={64} />
      <h1 className="font-display text-3xl">No encontramos esta página</h1>
      <p className="max-w-sm text-ink-2">
        El enlace puede estar roto o la página ya no existe. Vuelve al inicio para seguir trabajando.
      </p>
      <Link href="/" className="btn-primary">
        Ir al inicio
      </Link>
    </main>
  );
}
