# Changelog — HEBRA Enterprise

Registro corto por fase, agregado al cerrar cada una (ver "Cómo cerrar una fase" en `CLAUDE.md`).

## Fase 0 — Sistema de diseño y nuevo layout (2026-10-10)

Las 7 pantallas del MVP (Inicio, Insumos, Recetario, Pedidos, Clientes, Caja, Configuración) ya
usan el sistema de diseño Enterprise: tokens exactos de `docs/DESIGN.md` en `globals.css` (sin
sombras fuertes, radios 16/10/8px, Geist + Geist Mono + Fraunces), menú lateral oscuro `AppSidebar`
con grupos OPERACIÓN/NEGOCIO y badge de pedidos activos, `TopBar` con migas de pan, paleta de
comandos ⌘K funcional, y 16 componentes base nuevos en `src/components/ui/` (algunos ya conectados
— `StatusChip`-equivalente, `ProgressBar`, `Avatar` — y otros listos para las fases 1-4). Ninguna
pantalla cambió de funcionalidad, solo de apariencia. Verificado con capturas de pantalla reales
(Playwright) en claro/oscuro y escritorio/móvil, además de `npm run lint/test/build`.

Reemplaza por completo el rediseño visual anterior (terracota/salvia con sombras, DM Sans) que no
seguía `DESIGN.md` — ver `docs/bitacora.md` para el detalle de esa decisión.
