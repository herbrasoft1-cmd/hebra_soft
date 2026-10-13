"use client";

import { IconCheck } from "@/components/icons";
import { PASSWORD_RULES, passwordMeetsAllRules } from "@/lib/password";

export function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  if (passwordMeetsAllRules(password)) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-success-ink">
        <span className="flex size-4 items-center justify-center rounded-full bg-success-soft">
          <IconCheck size={9} />
        </span>
        Contraseña segura
      </p>
    );
  }
  return (
    <ul className="flex flex-col gap-1">
      {PASSWORD_RULES.map((r) => {
        const met = r.test(password);
        return (
          <li key={r.id} className={`flex items-center gap-1.5 text-xs ${met ? "text-success-ink" : "text-muted"}`}>
            <span className={`flex size-4 shrink-0 items-center justify-center rounded-full ${met ? "bg-success-soft" : "bg-surface-muted"}`}>
              {met ? <IconCheck size={9} /> : <span className="size-1 rounded-full bg-border-strong" />}
            </span>
            {r.label}
          </li>
        );
      })}
    </ul>
  );
}
