"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";

export const THEME_KEY = "hebra.theme";

/**
 * Script en línea que aplica el tema antes de pintar (evita parpadeo).
 * Por defecto sigue el modo del sistema.
 */
export const themeInitScript = `(function(){try{var t=localStorage.getItem('${THEME_KEY}');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;if(d)document.documentElement.classList.add('dark');}catch(e){}})();`;

export function ThemeToggle() {
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.classList.contains("dark")), []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try {
      localStorage.setItem(THEME_KEY, next ? "dark" : "light");
    } catch {}
  };

  return (
    <button onClick={toggle} className="btn-ghost justify-start" aria-pressed={dark}>
      {dark ? <IconSun size={20} /> : <IconMoon size={20} />}
      {dark ? "Usar modo claro" : "Usar modo nocturno cálido"}
    </button>
  );
}
