import { Logo, ThreadLine } from "@/components/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="pt-safe flex min-h-dvh items-center justify-center bg-surface-muted px-5 py-10">
      <div className="flex w-full max-w-sm flex-col gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={56} />
          <span className="font-display text-4xl font-semibold">hebra</span>
          <p className="text-[15px] text-ink-2">Costea, organiza y cobra lo que tejes.</p>
          <ThreadLine className="mt-1 w-40 text-accent" />
        </div>
        <div className="card p-7">{children}</div>
      </div>
    </main>
  );
}
