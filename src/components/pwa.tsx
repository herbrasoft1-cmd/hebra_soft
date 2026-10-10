"use client";

import { useEffect, useState } from "react";
import { IconCheck, IconWifiOff } from "./icons";
import { useTimer } from "./timer";

/** Registra el service worker (solo en producción para no interferir con el hot reload). */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || process.env.NODE_ENV !== "production") return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
  }, []);
  return null;
}

function useOnline() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", off);
    };
  }, []);
  return online;
}

/** Aviso de modo sin conexión con el número de cambios pendientes de sincronizar. */
export function OfflineBanner() {
  const online = useOnline();
  const { pending } = useTimer();
  if (online && pending === 0) return null;
  return (
    <div role="status" className="flex items-center gap-3 border-b border-line-strong bg-surface-2 px-5 py-3">
      <IconWifiOff size={20} className="shrink-0 text-ink-2" />
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{online ? "Sincronizando…" : "Estás sin internet"}</span>
        <span className="text-xs text-ink-2">
          {online
            ? `${pending} sesión(es) del cronómetro por subir.`
            : "Sigue tejiendo: el cronómetro se guarda en tu celular" +
              (pending > 0 ? ` (${pending} por sincronizar).` : ".")}
        </span>
      </div>
    </div>
  );
}

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

const DISMISS_KEY = "hebra.install-dismissed-at";
const DISMISS_DAYS = 7;

/** Invitación a instalar HEBRA (Android/escritorio con prompt nativo; iPhone con instrucciones). */
export function InstallPrompt() {
  const [event, setEvent] = useState<BeforeInstallPromptEvent | null>(null);
  const [isIos, setIsIos] = useState(false);
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);

  useEffect(() => {
    // Solo en producción: en dev, el layout se remonta en cada navegación y el aviso reaparecería siempre.
    if (process.env.NODE_ENV !== "production") return;

    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as Navigator & { standalone?: boolean }).standalone === true;
    if (standalone) return;

    let dismissedAt = 0;
    try {
      dismissedAt = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    } catch {}
    if (Date.now() - dismissedAt < DISMISS_DAYS * 86400000) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    if (ios) {
      setIsIos(true);
      const t = setTimeout(() => setOpen(true), 4000);
      return () => clearTimeout(t);
    }
    const handler = (e: Event) => {
      e.preventDefault();
      setEvent(e as BeforeInstallPromptEvent);
      setOpen(true);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {}
    setOpen(false);
    setDone("Te lo recordaremos en unos días");
    setTimeout(() => setDone(null), 3000);
  };

  const install = async () => {
    if (!event) return;
    await event.prompt();
    const choice = await event.userChoice;
    setOpen(false);
    setEvent(null);
    if (choice.outcome === "accepted") {
      setDone("HEBRA ya está en tu pantalla de inicio");
      setTimeout(() => setDone(null), 3000);
    }
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-night/45 md:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="install-title"
            className="pb-safe flex w-full max-w-md flex-col gap-4 rounded-t-[28px] bg-bg px-6 pt-4 md:rounded-[28px] md:pb-6"
          >
            <div className="h-1.5 w-10 self-center rounded-full bg-line-strong md:hidden" />
            <div className="flex items-center gap-3.5">
              <img src="/icons/icon-192.png" alt="" width={64} height={64} className="rounded-2xl" />
              <div>
                <h2 id="install-title" className="font-display text-[22px] font-semibold">
                  Instala HEBRA
                </h2>
                <p className="text-sm text-ink-2">Tenla a un toque, junto a tus otras apps.</p>
              </div>
            </div>
            <ul className="flex flex-col gap-2.5 text-sm">
              <li>· Abre al instante, sin buscar el link</li>
              <li>· El cronómetro sigue aunque se caiga el internet</li>
              <li>· Se ve a pantalla completa, como una app</li>
            </ul>
            {isIos ? (
              <p className="rounded-xl bg-surface-2 p-3 text-sm text-ink-2">
                En iPhone: toca el botón <strong>Compartir</strong> de Safari y luego{" "}
                <strong>“Agregar a pantalla de inicio”</strong>.
              </p>
            ) : (
              <button onClick={install} className="btn-primary">
                Instalar app
              </button>
            )}
            <button onClick={dismiss} className="btn text-ink-2">
              Ahora no
            </button>
          </div>
        </div>
      )}
      {done && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-50 flex items-center gap-3 rounded-2xl bg-night px-4 py-3.5 text-sm text-on-night md:left-auto md:right-6 md:w-96"
        >
          <IconCheck size={20} className="text-accent" />
          {done}
        </div>
      )}
    </>
  );
}
