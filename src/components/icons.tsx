import type { SVGProps } from "react";

/**
 * Iconografía de nicho HEBRA (trazo, hereda currentColor).
 * Ovillo = Insumos · Agujas cruzadas = Configuración · Hebra continua = Procesos/Pedidos
 */
type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 22, children, ...rest }: P) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const IconOvillo = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M6.5 7.5c4 1.2 7.6 5 8.6 11" />
    <path d="M4.6 13c3.2 0 7 2 8.2 6.6" />
    <path d="M9.5 4.4c3 2 5.8 6 6.4 11" />
  </Base>
);

export const IconAgujas = (p: P) => (
  <Base {...p}>
    <path d="M5 19L19 5M5 5l14 14" />
    <circle cx="19.6" cy="4.4" r="1.4" />
    <circle cx="4.4" cy="4.4" r="1.4" />
  </Base>
);

export const IconHebra = (p: P) => (
  <Base {...p}>
    <path d="M2 14c3-6 5 4 8-2s5 4 8-2 3 2 4 1" />
    <circle cx="6" cy="12" r="1.2" />
    <circle cx="18" cy="11" r="1.2" />
  </Base>
);

export const IconInicio = (p: P) => (
  <Base {...p}>
    <path d="M4 11l8-6 8 6v8a1 1 0 0 1-1 1h-4v-5H9v5H5a1 1 0 0 1-1-1z" />
  </Base>
);

export const IconRecetario = (p: P) => (
  <Base {...p}>
    <rect x="5" y="3" width="14" height="18" rx="2" />
    <path d="M9 8h6M9 12h6M9 16h3" />
  </Base>
);

export const IconCaja = (p: P) => (
  <Base {...p}>
    <rect x="3" y="6" width="18" height="13" rx="2" />
    <path d="M3 10h18M15.5 14.5h2.5" />
  </Base>
);

export const IconClientes = (p: P) => (
  <Base {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c.8-3.4 3.2-5 6-5s5.2 1.6 6 5" />
    <path d="M16 5.5a3 3 0 0 1 0 5.6M18 14.5c1.6.6 2.6 2 3 4.5" />
  </Base>
);

export const IconPlus = (p: P) => (
  <Base strokeWidth={2} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Base>
);

export const IconPlay = (p: P) => (
  <Base fill="currentColor" stroke="none" {...p}>
    <path d="M8 5l11 7-11 7z" />
  </Base>
);

export const IconPause = (p: P) => (
  <Base strokeWidth={2.6} {...p}>
    <path d="M8 5v14M16 5v14" />
  </Base>
);

export const IconStop = (p: P) => (
  <Base fill="currentColor" stroke="none" {...p}>
    <rect x="6" y="6" width="12" height="12" rx="2" />
  </Base>
);

export const IconBack = (p: P) => (
  <Base strokeWidth={1.9} {...p}>
    <path d="M15 5l-7 7 7 7" />
  </Base>
);

export const IconTrash = (p: P) => (
  <Base {...p}>
    <path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12M9 7V4h6v3" />
  </Base>
);

export const IconWifiOff = (p: P) => (
  <Base {...p}>
    <path d="M2 8.8a15 15 0 0 1 6-3.4M12 5a15 15 0 0 1 10 3.8M5 12.6a10 10 0 0 1 4-2.3M15.5 10.5a10 10 0 0 1 3.5 2.1M8.5 16.4a5 5 0 0 1 7 0" />
    <path d="M3 3l18 18" />
  </Base>
);

export const IconDoc = (p: P) => (
  <Base {...p}>
    <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
    <path d="M14 3v5h5M9 13h6M9 17h4" />
  </Base>
);

export const IconMoon = (p: P) => (
  <Base {...p}>
    <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z" />
  </Base>
);

export const IconSun = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </Base>
);

export const IconCheck = (p: P) => (
  <Base strokeWidth={2.2} {...p}>
    <path d="M5 12l5 5L20 7" />
  </Base>
);

export const IconArrowRight = (p: P) => (
  <Base strokeWidth={1.9} {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);

export const IconBell = (p: P) => (
  <Base {...p}>
    <path d="M6 10a6 6 0 1 1 12 0c0 4 1.5 5.5 2 6H4c.5-.5 2-2 2-6Z" />
    <path d="M10 19a2 2 0 0 0 4 0" />
  </Base>
);

export const IconClose = (p: P) => (
  <Base strokeWidth={2} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);

export const IconTrendUp = (p: P) => (
  <Base {...p}>
    <path d="M3 16l6-6 4 4 7-8" />
    <path d="M15 6h5v5" />
  </Base>
);

export const IconTrendDown = (p: P) => (
  <Base {...p}>
    <path d="M3 8l6 6 4-4 7 8" />
    <path d="M15 18h5v-5" />
  </Base>
);

export const IconChart = (p: P) => (
  <Base {...p}>
    <path d="M4 20V10M11 20V4M18 20v-7" />
    <path d="M3 20h18" />
  </Base>
);

export const IconWallet = (p: P) => (
  <Base {...p}>
    <path d="M3 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <path d="M3 8l9-4 5 4" />
    <circle cx="16.5" cy="13.2" r="1.1" fill="currentColor" stroke="none" />
  </Base>
);

export const IconChevronDown = (p: P) => (
  <Base strokeWidth={2} {...p}>
    <path d="M6 9l6 6 6-6" />
  </Base>
);

export const IconDots = (p: P) => (
  <Base fill="currentColor" stroke="none" {...p}>
    <circle cx="5" cy="12" r="2" />
    <circle cx="12" cy="12" r="2" />
    <circle cx="19" cy="12" r="2" />
  </Base>
);

export const IconHelp = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M9.3 9.3a2.7 2.7 0 1 1 3.8 2.5c-.8.4-1.1 1-1.1 1.9" />
    <circle cx="12" cy="17.2" r="0.1" fill="currentColor" stroke="currentColor" strokeWidth="1.8" />
  </Base>
);

export const IconUser = (p: P) => (
  <Base {...p}>
    <circle cx="12" cy="8" r="3.6" />
    <path d="M4.5 20c1-4.2 3.9-6.3 7.5-6.3s6.5 2.1 7.5 6.3" />
  </Base>
);

/** Logo HEBRA: la "H" entrelazada con el ovillo, mismo archivo que los íconos PWA. */
export function Logo({ size = 34 }: { size?: number }) {
  return <img src="/icons/icon-512.png" alt="HEBRA" width={size} height={size} className="shrink-0" />;
}

/** Hebra decorativa (separador ondulado) */
export function ThreadLine({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      width="100%"
      height="14"
      viewBox="0 0 340 14"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <path
        d="M0 7c20-10 30 10 50 0s30 10 50 0 30 10 50 0 30 10 50 0 30 10 50 0 30 10 50 0 30 10 40 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

export const IconCamera = (p: P) => (
  <Base {...p}>
    <path d="M4 8h3l1.6-2.4A2 2 0 0 1 10.3 4.6h3.4a2 2 0 0 1 1.7 1l1.6 2.4H20a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" />
    <circle cx="12" cy="13.5" r="3.5" />
  </Base>
);

export const IconEye = (p: P) => (
  <Base {...p}>
    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </Base>
);

export const IconEyeOff = (p: P) => (
  <Base {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c6 0 10 7 10 7a17.5 17.5 0 0 1-3.2 3.9M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.9 9.9 0 0 0 4.2-.9" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Base>
);
