import Link from "next/link";
import { IconBack, Logo, ThreadLine } from "@/components/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-safe relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg px-5 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute top-[-15%] left-[-15%] size-[380px] rounded-full bg-primary-soft opacity-70 blur-3xl" />
        <div className="absolute right-[-15%] bottom-[-10%] size-[360px] rounded-full bg-success-soft opacity-60 blur-3xl" />
      </div>

      <Link
        href="/"
        className="absolute top-5 left-5 inline-flex min-h-11 items-center gap-1.5 px-2 text-sm text-ink-2 hover:text-ink md:top-8 md:left-8"
      >
        <IconBack size={18} /> Inicio
      </Link>

      <div className="flex w-full max-w-md flex-col gap-6">
        <Link href="/" className="flex flex-col items-center gap-2.5 text-center">
          <Logo size={48} />
          <span className="font-display text-3xl font-semibold">hebra</span>
          <ThreadLine className="mt-0.5 w-36 text-accent" />
        </Link>
        <div className="card p-7">{children}</div>
      </div>
    </main>
  );
}
