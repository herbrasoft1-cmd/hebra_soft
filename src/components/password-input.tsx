"use client";

import { useState } from "react";
import { IconEye, IconEyeOff } from "@/components/icons";

/** Input de contraseña con botón de mostrar/ocultar. Funciona controlado (pasa `value`/`onChange`,
 * necesario cuando algo más en la pantalla —como el checklist de requisitos— necesita leer el
 * valor en vivo) o sin controlar (solo `name`, como en login). */
export function PasswordInput({
  name,
  autoComplete,
  required = true,
  minLength,
  value,
  onChange,
  inputId,
}: {
  name: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  value?: string;
  onChange?: (value: string) => void;
  inputId?: string;
}) {
  const [show, setShow] = useState(false);
  const controlledProps = value !== undefined ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value) } : {};

  return (
    <div className="relative">
      <input
        id={inputId}
        className="input pr-11"
        name={name}
        type={show ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        {...controlledProps}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar contraseña" : "Mostrar contraseña"}
        className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-muted hover:text-ink-2"
      >
        {show ? <IconEyeOff size={18} /> : <IconEye size={18} />}
      </button>
    </div>
  );
}
