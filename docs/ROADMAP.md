# HEBRA — Roadmap MVP → Enterprise

Cada fase se hace en una sesión separada de Claude Code: primero plan, luego código, luego verificación.
No empieces una fase si la anterior no cumple su definición de terminado (ver `CLAUDE.md`).

Estado: marca `[x]` al cerrar cada fase.

---

## [x] Fase 0 — Sistema de diseño y nuevo layout

**Objetivo:** que las pantallas existentes del MVP ya se vean "Enterprise".

- Actualizar tokens en `src/app/globals.css` según `docs/DESIGN.md` (claro, oscuro y menú lateral). Cargar Geist y Geist Mono.
- Crear los componentes base de `src/components/ui/` listados en DESIGN.md §6 (sin lógica de negocio).
- Nuevo `AppSidebar` + `TopBar` + `PageHeader` en `src/app/(app)/layout.tsx`. En móvil se mantiene la barra inferior.
- Paleta de comandos ⌘K (Ctrl+K en Windows): buscar pantallas y acciones rápidas (nuevo pedido, registrar venta, iniciar cronómetro).
- Migrar Inicio, Insumos, Recetario, Pedidos, Clientes, Caja y Configuración al nuevo layout sin cambiar su funcionalidad.

**Mockups:** cualquier pantalla de escritorio (menú lateral, barra superior, encabezado).
**Acepta cuando:** las pantallas del MVP usan el nuevo shell; el menú lateral es idéntico al del mockup; modo oscuro funciona; build pasa.

---

## [x] Fase 1 — Sedes, roles y equipo

**Datos (migración `0002`):**
- `locations` (sedes) por tenant; `location_id` en `supplies`, `orders`, `transactions`, `timer_sessions`.
- Roles en `memberships`: `owner`, `admin`, `ventas`, `tejedora` (+ `location_id` opcional para limitar a una sede).
- `invitations` (correo, rol, sede, token, estado).
- RLS: además de `is_member`, las tablas/columnas de costos y finanzas solo para `owner` y `admin`. Exponer a tejedoras una vista sin costos (`products_public`, etc.).

**Código:**
- `src/lib/permissions.ts`: matriz exacta de la pestaña "Roles y permisos" del mockup, con pruebas.
- Selector de sede global en la barra superior (Todas / cada sede), persistido por usuario.
- Pantalla **Equipo y ajustes** → pestañas *Miembros* y *Roles y permisos*. Invitar persona por correo (Supabase Auth invite).

**Mockups:** `Ent-Equipo.dc.html` (pestañas Miembros y Roles).
**Acepta cuando:** una tejedora no puede ver costos ni finanzas ni por la interfaz ni consultando la API; las invitaciones funcionan; hay pruebas de RLS por rol.

---

## [ ] Fase 2 — Panel ejecutivo

- KPIs: ventas del periodo con variación, margen bruto, pedidos activos por estado y en riesgo, capacidad del taller.
- Gráfico de ingresos y utilidad con periodos 7 días / 12 semanas / 12 meses.
- "Necesitan atención": reglas de riesgo (vence ≤ 1 día con avance < 80 %, insumo agotado en su receta, horas requeridas > horas libres, sin asignar a ≤ 2 días).
- Rentabilidad por producto con alerta de margen objetivo; ventas por canal; inventario crítico.
- Cálculos en funciones SQL (`rpc`) o en `src/lib/analytics.ts` con pruebas.

**Mockup:** `Ent-Dashboard.dc.html`.
**Acepta cuando:** cada número sale de la base de datos y cuadra con las otras pantallas; filtro por sede funciona.

---

## [ ] Fase 3 — Producción y capacidad

- Pedidos con: tejedora asignada, horas estimadas (tiempo promedio del producto × cantidad), avance (horas del cronómetro / estimadas), canal, prioridad por vencimiento.
- Tablero Kanban del mockup (4 columnas, contadores, horas por columna, "Ver N más"), arrastrar y soltar en escritorio; filtros (búsqueda, tejedora, canal, "en riesgo").
- Vista **Capacidad**: disponibilidad por tejedora y día (tabla `availability`), carga asignada, colores de la grilla, total semanal y sugerencia de reasignación (heurística simple y explicable).

**Mockup:** `Ent-Produccion.dc.html`.
**Acepta cuando:** asignar o mover un pedido actualiza capacidad y panel; la sugerencia se puede aplicar con un clic.

---

## [ ] Fase 4 — Recetario, costeo y simulador

- Versiones de receta (`product_versions`): cada publicación de precio crea versión y queda en auditoría.
- Lista de materiales por lote; tiempo real por tejedora (de `timer_sessions`) y su impacto en el costo.
- Canales de venta configurables (`sales_channels`: % comisión + valor fijo).
- Simulador: tiempo, valor hora, canal, margen objetivo **sobre precio de venta**, IVA 19 %; precio = (costo + fijo) / (1 − margen − %comisión), redondeado a la centena; utilidad por pieza; punto de equilibrio contra gastos fijos de la sede.
- Botón "Publicar precio".

**Mockup:** `Ent-Costeo.dc.html`.
**Acepta cuando:** el simulador da exactamente $85.400 con los datos de ejemplo (8.750 materiales, 200 min, $12.000/h, 5 % desgaste, directo, 40 %), cubierto por pruebas.

---

## [ ] Fase 5 — Inventario multisede

- Lotes (`supply_lots`) por sede con costo; costo promedio ponderado; punto de reorden por insumo y sede; proveedores.
- Órdenes de compra: borrador → por aprobar → en tránsito → recibida (al recibir suma stock). Borradores automáticos al bajar del reorden.
- Transferencias entre sedes y sugerencia de transferencia cuando una sede tiene excedente y otra un pedido bloqueado.

**Mockup:** `Ent-Inventario.dc.html`.
**Acepta cuando:** recibir una OC, transferir y consumir por pedido enviado actualizan stock y valor correctamente (pruebas).

---

## [ ] Fase 6 — Finanzas y facturación

- Pagos parciales y anticipos (`payments`) con método; cartera por antigüedad (0–15, 16–30, 31–60, +60).
- Estado de resultados: ingresos − materiales − mano de obra − comisiones − gastos fijos = utilidad neta (cascada).
- Documentos de venta: remisiones (ya existen) + facturas electrónicas mediante `src/lib/invoicing.ts` con un proveedor (Alegra o Siigo) detrás de la interfaz; estados *Enviando / Aceptada DIAN / Rechazada* y reintento.
- Recordatorios de cobro por WhatsApp (enlace `wa.me` con mensaje).
- Exportar a contabilidad (CSV).

**Mockup:** `Ent-Finanzas.dc.html`.
**Acepta cuando:** la cascada y la cartera cuadran con los pagos registrados; una factura rechazada se puede corregir y reenviar. Las credenciales del proveedor van en variables de entorno, nunca en el código.

---

## [ ] Fase 7 — Integraciones, seguridad y plan

- Tabla `integrations` con estado por tenant y pantalla de tarjetas (Conectado / Disponible). Implementar primero: enlaces de pago (Wompi) y webhooks propios; el resto queda como "Disponible".
- API keys por sede y webhooks de eventos (pedido creado/movido, pago recibido, stock bajo).
- `audit_log` con triggers en precios, pedidos, facturas, permisos y exportaciones; pantalla con exportar CSV.
- Seguridad: SSO con Google (Supabase OAuth), 2FA obligatoria (Supabase MFA) por rol, aprobación de exportaciones.
- Plan y uso (sedes, usuarios, facturas del mes) con límites.

**Mockup:** `Ent-Equipo.dc.html` (pestañas Integraciones y Plan y seguridad).

---

## [ ] Fase 8 — Móvil por rol y portal del cliente

- Inicio de tejedora "Mi turno": pedido actual, cronómetro contra la meta, pasos del patrón (`product_steps`) marcables, siguiente tarea. Subir foto del avance (Storage).
- Detalle de pedido móvil: línea de tiempo en hebra, riesgo, cliente, saldo y "enviar link de pago".
- Portal público `/seguimiento/[token]`: sin login, token aleatorio por pedido, datos mínimos expuestos mediante una función `security definer`; marca del negocio; pagar saldo; "con tecnología de hebra".

**Mockups:** `Ent-Movil-Turno.dc.html`, `Ent-Movil-Pedido.dc.html`, `Ent-Portal.dc.html`.
**Acepta cuando:** el portal no expone nada más que lo que muestra el mockup (probarlo); funciona como PWA en el celular.

---

## [ ] Fase 9 — Listo para producción

- Seed de desarrollo "Ovillo Studio" con los datos de los mockups (`supabase/seed.sql`).
- Pruebas end-to-end (Playwright) de los flujos críticos: registro, pedido → producción → remisión/factura → pago.
- Accesibilidad (axe), rendimiento (Lighthouse PWA ≥ 90), monitoreo de errores, CI en GitHub Actions (lint, test, build).
- Revisión de seguridad de RLS con un usuario de cada rol y de otro tenant.
