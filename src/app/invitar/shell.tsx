import { Logo } from "@/components/icons";

/** Cascarón centrado compartido por /invitar (código) y /invitar/[token] (link). */
export function Shell({ title, text, action }: { title: string; text: string; action?: React.ReactNode }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-surface-muted px-5 py-10">
      <div className="flex w-full max-w-sm flex-col gap-7">
        <div className="flex flex-col items-center gap-3 text-center">
          <Logo size={48} />
          <div className="flex flex-col gap-1">
            <h1 className="font-display text-3xl">{title}</h1>
            <p className="text-ink-2">{text}</p>
          </div>
        </div>
        {action && <div className="card p-7">{action}</div>}
      </div>
    </main>
  );
}
