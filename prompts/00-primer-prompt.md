# Primer prompt (pégalo en Claude Code dentro de VS Code)

Úsalo una sola vez, en una sesión nueva, después de copiar este kit dentro del proyecto `hebra`.

---

Hola. Este proyecto es HEBRA, un SaaS multitenant (PWA) para negocios handmade. Ya existe un MVP
funcional y quiero llevarlo a la versión Enterprise que está diseñada en `docs/mockups/`.

Antes de tocar código:

1. Lee `CLAUDE.md`, `docs/DESIGN.md`, `docs/ROADMAP.md` y `docs/mockups/README.md`.
2. Abre los 9 mockups de `docs/mockups/` y recorre el código actual (`src/`, `supabase/migrations/`).
3. Crea `docs/ESTADO.md` con:
   - qué del roadmap ya existe en el MVP y qué falta, fase por fase;
   - riesgos técnicos o decisiones que veas (por ejemplo, cómo ocultar costos a las tejedoras con RLS);
   - preguntas que necesites que yo responda antes de la Fase 0.
4. Crea `docs/CHANGELOG.md` vacío con un encabezado.

No modifiques nada de `src/` ni de `supabase/` en esta sesión. Cuando termines, dime un resumen
corto y espera. Después trabajaremos fase por fase con el comando `/fase 0`, `/fase 1`, etc.
