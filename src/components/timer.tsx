"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { logTimerSession } from "@/app/(app)/recetario/actions";
import { clock } from "@/lib/format";
import { IconPause, IconPlay, IconStop } from "./icons";

/**
 * Cronómetro de talento.
 * - Vive en localStorage: sigue corriendo aunque cierres la app o se caiga el internet.
 * - Al detenerlo, la sesión entra a una cola local y se sincroniza con Supabase
 *   en cuanto hay conexión (cada sesión lleva un client_id para no duplicarse).
 */

type TimerState = {
  productId: string;
  productName: string;
  sessionStartedAt: string; // ISO, inicio de la sesión
  runningSince: number | null; // ms; null = en pausa
  accumulated: number; // segundos acumulados antes del último play
};

type PendingSession = {
  clientId: string;
  productId: string;
  seconds: number;
  startedAt: string;
  endedAt: string;
};

const TIMER_KEY = "hebra.timer";
const QUEUE_KEY = "hebra.pending-sessions";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function write(key: string, value: unknown) {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* almacenamiento no disponible */
  }
}

function elapsedOf(t: TimerState | null): number {
  if (!t) return 0;
  return t.accumulated + (t.runningSince ? Math.floor((Date.now() - t.runningSince) / 1000) : 0);
}

type Ctx = {
  timer: TimerState | null;
  elapsed: number;
  running: boolean;
  pending: number;
  start: (productId: string, productName: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => Promise<void>;
};

const TimerContext = createContext<Ctx | null>(null);

export function TimerProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [timer, setTimer] = useState<TimerState | null>(null);
  const [pending, setPending] = useState(0);
  const [, setTick] = useState(0);

  const persist = useCallback((t: TimerState | null) => {
    setTimer(t);
    write(TIMER_KEY, t);
  }, []);

  const flush = useCallback(async () => {
    const queue = read<PendingSession[]>(QUEUE_KEY, []);
    if (queue.length === 0 || !navigator.onLine) {
      setPending(queue.length);
      return;
    }
    const left: PendingSession[] = [];
    for (const s of queue) {
      try {
        await logTimerSession(s);
      } catch {
        left.push(s);
      }
    }
    write(QUEUE_KEY, left);
    setPending(left.length);
    if (left.length < queue.length) router.refresh();
  }, [router]);

  // Restaurar estado al abrir la app y sincronizar pendientes
  useEffect(() => {
    setTimer(read<TimerState | null>(TIMER_KEY, null));
    setPending(read<PendingSession[]>(QUEUE_KEY, []).length);
    flush();
    const onOnline = () => flush();
    window.addEventListener("online", onOnline);
    return () => window.removeEventListener("online", onOnline);
  }, [flush]);

  // Refrescar el reloj cada segundo mientras corre
  useEffect(() => {
    if (!timer?.runningSince) return;
    const id = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [timer?.runningSince]);

  const stop = useCallback(async () => {
    const current = read<TimerState | null>(TIMER_KEY, null);
    if (!current) return;
    const seconds = elapsedOf(current);
    persist(null);
    if (seconds > 0) {
      const queue = read<PendingSession[]>(QUEUE_KEY, []);
      queue.push({
        clientId: crypto.randomUUID(),
        productId: current.productId,
        seconds,
        startedAt: current.sessionStartedAt,
        endedAt: new Date().toISOString(),
      });
      write(QUEUE_KEY, queue);
      setPending(queue.length);
      await flush();
    }
  }, [flush, persist]);

  const start = useCallback(
    (productId: string, productName: string) => {
      const current = read<TimerState | null>(TIMER_KEY, null);
      if (current && current.productId === productId) {
        if (!current.runningSince) persist({ ...current, runningSince: Date.now() });
        return;
      }
      const begin = () =>
        persist({
          productId,
          productName,
          sessionStartedAt: new Date().toISOString(),
          runningSince: Date.now(),
          accumulated: 0,
        });
      if (current) stop().then(begin);
      else begin();
    },
    [persist, stop],
  );

  const pause = useCallback(() => {
    const t = read<TimerState | null>(TIMER_KEY, null);
    if (t?.runningSince) persist({ ...t, accumulated: elapsedOf(t), runningSince: null });
  }, [persist]);

  const resume = useCallback(() => {
    const t = read<TimerState | null>(TIMER_KEY, null);
    if (t && !t.runningSince) persist({ ...t, runningSince: Date.now() });
  }, [persist]);

  // Se recalcula en cada render (el intervalo de arriba fuerza uno por segundo).
  const value: Ctx = {
    timer,
    elapsed: elapsedOf(timer),
    running: !!timer?.runningSince,
    pending,
    start,
    pause,
    resume,
    stop,
  };

  return <TimerContext.Provider value={value}>{children}</TimerContext.Provider>;
}

export function useTimer(): Ctx {
  const ctx = useContext(TimerContext);
  if (!ctx) throw new Error("useTimer debe usarse dentro de <TimerProvider>");
  return ctx;
}

/** Tarjeta compacta del cronómetro (menú lateral en escritorio). */
export function MiniTimer() {
  const { timer, elapsed, running, pause, resume, stop } = useTimer();
  if (!timer) return null;
  return (
    <div className="flex flex-col gap-3 rounded-2xl bg-night p-4 text-on-night shadow-md">
      <Link
        href={`/recetario/${timer.productId}`}
        className="truncate text-xs font-medium text-on-night-muted transition-colors hover:text-on-night"
      >
        <span className={`mr-1.5 inline-block size-1.5 rounded-full ${running ? "bg-accent" : "bg-on-night-muted"}`} />
        {running ? "Tejiendo ahora" : "En pausa"} · {timer.productName}
      </Link>
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-2xl tabular-nums">{clock(elapsed)}</span>
        <div className="flex gap-1.5">
          <button
            onClick={running ? pause : resume}
            aria-label={running ? "Pausar cronómetro" : "Continuar cronómetro"}
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-accent text-night shadow-sm transition-all duration-150 hover:brightness-95 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
          >
            {running ? <IconPause size={18} /> : <IconPlay size={18} />}
          </button>
          <button
            onClick={() => stop()}
            aria-label="Detener y guardar tiempo"
            className="flex size-11 cursor-pointer items-center justify-center rounded-full bg-white/10 text-on-night transition-all duration-150 hover:bg-white/15 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          >
            <IconStop size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Píldora flotante (celular) visible en todas las pantallas mientras hay cronómetro. */
export function FloatingTimer() {
  const { timer, elapsed, running, pause, resume } = useTimer();
  if (!timer) return null;
  return (
    <div className="fixed inset-x-3 bottom-[calc(76px+env(safe-area-inset-bottom))] z-30 flex items-center gap-3 rounded-2xl bg-night px-4 py-2.5 text-on-night shadow-lg md:hidden">
      <Link href={`/recetario/${timer.productId}`} className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-xs font-medium text-on-night-muted">{timer.productName}</span>
        <span className="font-display text-lg tabular-nums">{clock(elapsed)}</span>
      </Link>
      <button
        onClick={running ? pause : resume}
        aria-label={running ? "Pausar cronómetro" : "Continuar cronómetro"}
        className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full bg-accent text-night shadow-sm transition-all duration-150 hover:brightness-95 active:scale-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50"
      >
        {running ? <IconPause size={18} /> : <IconPlay size={18} />}
      </button>
    </div>
  );
}
