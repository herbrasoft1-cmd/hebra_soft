# Changelog — HEBRA Enterprise

Registro corto por fase, agregado al cerrar cada una (ver "Cómo cerrar una fase" en `CLAUDE.md`).

## Fase 2 — Panel ejecutivo (2026-10-10)

`/inicio` se bifurca por permiso (`view_finance`): Propietaria y Administración ven el panel
ejecutivo nuevo; Ventas y Tejedora siguen viendo exactamente el inicio simple del MVP, sin ningún
dato financiero nuevo. El mockup `Ent-Dashboard.dc.html` pide varias cosas
que dependen de datos de la Fase 3 (capacidad del taller con disponibilidad real, tejedora asignada,
"reasignar automáticamente") — se documentaron como fuera de alcance en vez de simularlas; la tarjeta
"Capacidad del taller" se reemplazó por "Cartera pendiente" (dato real que ya existía).

- Migración `0009`: `orders.channel` (texto, nullable) para "Ventas por canal" — selector nuevo en el
  formulario de pedido (Instagram/WhatsApp/Tienda y ferias/Tienda online/Otro).
- `src/lib/analytics.ts` nuevo: variación %, reglas de "Necesitan atención" (vence pronto, insumo
  agotado — las otras dos reglas del mockup necesitan la Fase 3), rentabilidad por producto con
  alerta de margen objetivo, ventas por canal, reagrupado de la serie diaria por período (7d/12s/12m).
  Con pruebas.
- `RevenueProfitChart` nuevo en `src/components/charts.tsx`: ingresos y utilidad con pestañas de
  período (usa el `SegmentedControl` de la Fase 0, que seguía sin conectar a nada).
- 4 KPIs con variación real, "Necesitan atención", "Rentabilidad por producto" (tabla con
  `DataTable`, también sin usar desde la Fase 0), "Ventas por canal" e "Inventario crítico" —
  reutilizan `KpiCard`, `Panel`, `AlertRow`, `ProgressBar` de la Fase 0.
- Todo respeta el selector de sede global de la Fase 1 (cookie `hebra_location`), sin un selector
  nuevo en esta pantalla.
- Verificado con el servidor real: el panel carga sin errores con datos escasos (estados vacíos
  correctos en cada sección), un pedido nuevo con canal aparece en "Ventas por canal" al marcarlo
  pagado, y la cuenta tejedora de prueba de la Fase 1 sigue viendo el inicio simple sin fuga de datos
  financieros.

## Fase 1 — Sedes, roles y equipo (2026-10-10)

Evolucionó el equipo/roles del MVP (owner/admin/staff) hacia el modelo de 4 roles del roadmap
(Propietaria/Administración/Ventas/Tejedora) con la matriz exacta de `Ent-Equipo.dc.html`, en vez de
reescribirlo — ver `docs/ESTADO.md`. Migraciones `0006`–`0008`: tabla `locations` (sede "Principal"
por tenant, backfill), `location_id` en supplies/orders/transactions/timer_sessions/memberships/
invitations, roles `ventas`/`tejedora` nuevos, gestión de equipo apretada a solo Propietaria (antes
también Administración podía — corregido contra la matriz real del mockup), remisiones restringidas
a owner/admin/ventas a nivel de base, y un fix al token de invitación que usaba una función de
`pgcrypto` no disponible en el `search_path` de la función.

`src/lib/permissions.ts` nuevo: la matriz de 8 permisos × 4 roles como código, con pruebas (las 32
celdas). Recetario deja de mandar costo/margen/valor-hora a quien no tiene `view_costs`/
`edit_recipes` — ni en la UI ni en la consulta a la base, con una vista de solo lectura
(`RecipeViewer`) para ventas/tejedora que conserva el cronómetro de talento. El botón de Remisión en
Pedidos y el acceso a Caja/Analítica/Configuración ahora se gatean con la misma matriz. Selector de
sede global en la barra superior (persistido en cookie) que filtra Insumos/Pedidos/Caja de verdad,
con una pantalla "Sedes" para crear sedes nuevas y una pestaña "Roles y permisos" en Equipo que
muestra la misma matriz.

Verificado de punta a punta con Playwright: invitación → registro → aceptación real para una cuenta
tejedora y una ventas, confirmando que ninguna ve costos/finanzas por UI ni en las respuestas de red,
que ventas sí puede emitir remisión y tejedora no, y que el filtro de sede funciona con una segunda
sede real. En el camino se corrigieron dos bugs reales encontrados por esa verificación (no solo por
lectura de código): el enlace "Crea tu cuenta" en `/login` perdía el token de invitación al pasar por
ahí sin sesión, y el selector de sede no se resincronizaba visualmente tras elegir una sede.

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
