# Estado: MVP actual vs. Roadmap Enterprise

Generado leyendo `CLAUDE.md`, `docs/DESIGN.md`, `docs/ROADMAP.md`, `docs/mockups/README.md`, los 9
mockups (abiertos y capturados con Playwright para verlos renderizados), y recorriendo `src/` y
`supabase/migrations/` tal como están hoy. No se modificó nada de `src/` ni `supabase/` en esta
sesión, como pide el primer prompt.

## ⚠️ Lo primero que hay que saber: ya hay trabajo "Enterprise" a medias, hecho ANTES de este kit

En la sesión de Claude Code inmediatamente anterior a crear este kit (mismo día), ya se construyó —
sin conocer todavía `CLAUDE.md`/`ROADMAP.md`/`DESIGN.md`/los mockups— una primera versión de
"equipo y roles" y algunas mejoras de rendimiento/auditoría, a partir de que pediste "sacar una
versión enterprise" y elegiste las 4 opciones del menú. Ese trabajo:

- **Ya está commiteado** (commit `c3b8a12 "MVP funcionando"`, sin pushear a GitHub todavía) — 40
  archivos, incluye 3 migraciones ya **aplicadas en tu Supabase** (`0003_team_roles.sql`,
  `0004_audit_log.sql`, `0005_fix_email_type.sql`).
- Implementa: 3 roles (`owner`/`admin`/`staff`, **no 4** — no existe `ventas` ni `tejedora`), sin
  sedes/`locations`, invitación por enlace compartible (no por el flujo de Supabase Auth invite que
  pide el roadmap), un helper de auditoría simple, paginación en Clientes/Insumos, y **"staff" sí
  puede leer `hourly_rate` del negocio** (se dejó así a propósito en su momento para que Recetario
  siguiera funcionando para el personal) — esto **contradice directamente** la regla de
  `CLAUDE.md`: *"Las tejedoras nunca reciben costos, márgenes ni datos financieros, ni siquiera en
  el JSON enviado al navegador."*
- No usa `src/lib/permissions.ts` como matriz central (no existe ese archivo); los permisos están
  repartidos como chequeos sueltos en cada página y en políticas RLS puntuales.
- Antes de este kit también hubo un rediseño visual completo del MVP (sombras, profundidad,
  `rounded-2xl`, tipografía Fraunces + **DM Sans**) — que **no coincide** con `DESIGN.md`: el
  sistema de diseño Enterprise pide **Geist/Geist Mono** (no DM Sans), paneles **sin sombra** (salvo
  la pestaña activa de un control segmentado), menú lateral oscuro tipo espresso con buscador ⌘K,
  grupos OPERACIÓN/NEGOCIO, etc. — nada de eso existe en el layout actual.

Esto no es necesariamente un problema — parte de ese trabajo (paginación, auditoría, la caja de
costeo que ya calcula bien) es una base real aprovechable — pero **sí es una decisión que te
corresponde a ti**, no algo que yo deba resolver solo. Ver "Preguntas" al final.

---

## Qué ya existe en el MVP (antes y después de esa sesión), fase por fase del roadmap

### Fase 0 — Sistema de diseño y nuevo layout
**Existe:** un layout funcional con menú lateral + barra inferior en móvil, modo oscuro, componentes
reutilizables (`card`, `btn-*`, `input`, `Sheet`, `PageHeader`, `EmptyState`) — pero con **otra
dirección visual** (paleta terracota/salvia cálida, sombras, Fraunces+DM Sans) que no sigue
`DESIGN.md`. No hay `src/components/ui/`, no hay `AppSidebar`/`TopBar` como los describe DESIGN.md
§6, no hay paleta de comandos ⌘K, no hay selector de sede (no hay sedes).
**Falta:** prácticamente todo lo que pide la Fase 0 tal cual está escrita — requiere rehacer tokens
y el shell del layout según `DESIGN.md`.

### Fase 1 — Sedes, roles y equipo
**Existe (versión simplificada, ver advertencia arriba):** tabla `invitations`, 3 roles (no 4), RPCs
de invitar/aceptar/cambiar rol/quitar miembro, trigger que protege que no quede un negocio sin
dueño, pantalla "Equipo" dentro de Configuración (no una pantalla "Equipo y ajustes" con pestañas
Miembros/Roles y permisos/Integraciones/Plan y seguridad como en `Ent-Equipo.dc.html`).
**Falta:** tabla `locations` (sedes), `location_id` en memberships/supplies/orders/transactions/
timer_sessions, roles `ventas`/`tejedora` en vez de `staff`, vista `products_public` sin costos,
`src/lib/permissions.ts` central con pruebas, selector de sede global, invitación por Supabase Auth
invite, pestaña "Roles y permisos" con la matriz exacta del mockup.

### Fase 2 — Panel ejecutivo
**Existe:** página `/analitica` (ventas por mes, productos más vendidos, gastos por categoría,
insights en texto) — útil pero con otro diseño visual y sin casi nada de lo que pide esta fase.
**Falta:** todo lo específico — KPIs con variación/sparkline en el header, "Necesitan atención" con
las 4 reglas de riesgo exactas, capacidad del taller, ventas por canal, filtro por sede, gráfico de
barras apiladas ingresos/utilidad con periodos. Página `/inicio` (el MVP) seguiría existiendo para
roles sin acceso al panel ejecutivo completo.

### Fase 3 — Producción y capacidad
**Existe:** tablero Kanban en `/pedidos` (4 columnas, arrastrar y soltar en escritorio, tarjetas con
cliente/precio/fecha) — es la base más reaprovechable de todas las fases pendientes.
**Falta:** asignación a tejedora, horas estimadas vs. avance real, canal, prioridad por riesgo,
filtros (tejedora/canal/en riesgo), vista "Capacidad" con grilla por tejedora/día y sugerencia de
reasignación.

### Fase 4 — Recetario, costeo y simulador
**Existe:** el motor de costeo real en `src/lib/costing.ts` (con pruebas Vitest) — materiales + mano
de obra + % desgaste → 3 precios sugeridos — y el cronómetro de talento funcionando. Es la pieza más
madura y mejor probada de todo el MVP.
**Falta:** versiones de receta con auditoría (`product_versions`), lista de materiales por lote,
desglose de tiempo real por tejedora en la UI, canales de venta con comisión, fórmula de margen
**sobre precio de venta** (la actual es sobre costo — fórmulas distintas, hay que decidir cuál manda
para los productos ya creados), IVA 19 %, punto de equilibrio, botón "Publicar precio".

### Fase 5 — Inventario multisede
**Existe:** `/insumos` con compra, costo por unidad, stock restante, umbral de bajo stock — todo
para una sola "sede" implícita (el negocio completo).
**Falta:** todo lo multisede — lotes, costo promedio ponderado, punto de reorden por sede, órdenes
de compra con flujo de aprobación, transferencias entre sedes.

### Fase 6 — Finanzas y facturación
**Existe:** Caja (ingresos/gastos, balance del mes) y remisiones en PDF compartibles por WhatsApp
(`src/lib/remission-pdf.ts`), más el punto de extensión `src/lib/invoicing.ts` que **ya está
pensado para esto** (coincide con lo que pide el roadmap: implementar un proveedor detrás de esa
interfaz).
**Falta:** pagos parciales/anticipos, cartera por antigüedad, facturación electrónica real
(Alegra/Siigo), cascada de estado de resultados, recordatorios de cobro por WhatsApp, exportar a
contabilidad.

### Fase 7 — Integraciones, seguridad y plan
**Existe (versión simplificada):** `audit_log` con RPCs `log_audit`/`list_audit_log`, tarjeta
"Actividad" en Configuración con las últimas 50 entradas — conceptualmente similar al "Registro de
auditoría" del mockup, pero sin exportar CSV ni triggers automáticos en todas las tablas sensibles.
**Falta:** tabla `integrations`, API keys por sede, webhooks, SSO con Google, 2FA obligatoria, plan
y uso con límites (sedes/usuarios/facturas del mes).

### Fase 8 — Móvil por rol y portal del cliente
**Existe:** la app ya es responsive con barra inferior en móvil (patrón que la Fase 0 dice que se
mantiene), cronómetro offline funcionando.
**Falta:** todo lo específico de esta fase — "Mi turno" para tejedora, pasos de patrón marcables,
subir foto de avance, detalle de pedido móvil con línea de tiempo en hebra, portal público
`/seguimiento/[token]`.

### Fase 9 — Listo para producción
**Existe:** una auditoría de producción ya hecha en una sesión anterior (manejo de errores, error
boundaries, RLS revisada, headers de seguridad), y una auditoría visual real con Playwright
(capturas de pantalla de la app corriendo, no solo que compile) — ambas documentadas en
`docs/bitacora.md`. Es trabajo real de la fase 9 ya adelantado, aunque no en el formato que pide
el roadmap (seed `Ovillo Studio`, pruebas Playwright *automatizadas*, axe, Lighthouse, CI).
**Falta:** el seed de desarrollo, la suite de pruebas end-to-end formal, CI en GitHub Actions.

---

## Riesgos técnicos y decisiones a tomar

1. **Qué hacer con el trabajo ya commiteado (`c3b8a12`).** Tres caminos razonables: (a) dejarlo como
   está y construir la Fase 1 real *encima*, migrando luego los 3 roles a los 4 del roadmap; (b)
   quitar específicamente la parte de equipo/roles (conflictúa con la regla de nunca exponer costos
   a tejedoras) pero conservar paginación/auditoría, que no conflictúan con nada; (c) descartar todo
   y empezar la Fase 1 desde cero según el mockup. Las migraciones 0003-0005 ya están aplicadas en
   tu Supabase real — "descartar" implicaría migraciones nuevas que deshagan lo anterior (aditivo,
   nunca `DROP`), no basta con borrar los archivos.
2. **Numeración de migraciones.** El roadmap asume que la migración de la Fase 1 seria `0002`, pero
   ese número ya se usó (y `0003`-`0005` también, por el trabajo ya hecho). La siguiente migración
   real disponible es `0006`.
3. **Conflicto de sistema de diseño.** El rediseño visual anterior (sombras, radios grandes, DM
   Sans) no sigue `DESIGN.md`. Si el mockup manda (como dice `CLAUDE.md`), la Fase 0 va a reemplazar
   visualmente ese trabajo casi por completo, no construir sobre él.
4. **Fórmula de margen distinta.** El motor de costeo actual (`src/lib/costing.ts`, con pruebas)
   calcula el margen **sobre el costo**; el simulador del mockup lo calcula **sobre el precio de
   venta**, con comisión de canal e IVA incluidos en la fórmula. Son matemáticamente diferentes — al
   migrar, los precios ya guardados van a cambiar si se recalculan con la fórmula nueva. Hay que
   decidir si se recalculan o se dejan congelados como "versión anterior".
5. **`src/proxy.ts` y `getSession()` no tienen hoy el concepto de sede.** Cualquier fase que dependa
   de "sede actual" (2, 3, 5) necesita antes el selector de sede de la Fase 1.
6. **Las migraciones 0003-0005 ya ejecutadas no se pueden "deshacer" editándolas** (`CLAUDE.md` lo
   prohíbe explícitamente: nunca editar una migración ya aplicada). Cualquier cambio a lo que ya
   existe — por ejemplo, pasar de 3 a 4 roles — necesita una migración nueva que lo transforme
   (`ALTER TYPE member_role ADD VALUE`, etc.), con backfill de los roles ya asignados.

## Preguntas antes de la Fase 0

1. ¿Qué hacemos con el commit `c3b8a12` (equipo/roles/paginación/auditoría ya hecho)? ¿Lo
   conservamos como base y lo evolucionamos hacia el modelo de 4 roles + sedes, lo recortamos
   (solo paginación/auditoría), o empezamos la Fase 1 de cero según el mockup?
2. El rediseño visual anterior tampoco sigue `DESIGN.md`. ¿Empezamos la Fase 0 reemplazándolo por
   completo (tokens, tipografía Geist, menú lateral oscuro), o hay algo de ese trabajo que quieras
   conservar aunque no coincida exactamente con el mockup?
3. ¿Ya tienes (o planeas crear) las 3 sedes reales de un negocio, o seguimos usando datos de
   ejemplo tipo "Ovillo Studio" hasta que haya un negocio real con más de una sede?
4. Para Finanzas (Fase 6): ¿ya tienes cuenta con Alegra o Siigo, o decidimos el proveedor cuando
   lleguemos a esa fase?
5. Para Integraciones/Seguridad (Fase 7): SSO con Google y pasarela de pagos Wompi — ¿ya tienes esas
   cuentas, o se resuelven más adelante?

No se tocó nada de `src/` ni `supabase/` en esta sesión.
