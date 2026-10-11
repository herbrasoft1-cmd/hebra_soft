---
name: fase
description: Ejecuta una fase del roadmap de HEBRA Enterprise (plan, implementación y verificación). Uso /fase <número>.
argument-hint: <número de fase, ej. 0>
disable-model-invocation: true
---

Vamos a trabajar la **Fase $ARGUMENTS** de `docs/ROADMAP.md`.

1. Lee `CLAUDE.md`, `docs/DESIGN.md`, la sección de la Fase $ARGUMENTS en `docs/ROADMAP.md`,
   `docs/mockups/README.md` y los mockups que esa fase menciona. Revisa el código actual relacionado.
2. **Antes de escribir código**, preséntame un plan con:
   - archivos a crear/modificar y migraciones SQL nuevas (con sus políticas RLS),
   - componentes de `src/components/ui/` que se reutilizan o se crean,
   - funciones puras y sus pruebas,
   - dudas o decisiones que necesitas que yo tome.
   Espera mi aprobación.
3. Con el plan aprobado, implementa en pasos pequeños. Copia del mockup los colores, tamaños,
   espaciados y textos exactos; no inventes estilos ni copy.
4. Verifica: `npm run lint`, `npm test`, `npm run build`. Corrige hasta que pasen.
5. Compara cada pantalla de la fase con su mockup y lista cualquier diferencia que quede.
6. Cierra: marca la fase en `docs/ROADMAP.md`, agrega una entrada en `docs/CHANGELOG.md` y
   propón el mensaje de commit. No hagas commit sin que te lo pida.
