# Pendientes

> Desde que llegó el kit "HEBRA Enterprise", el roadmap grande vive en `docs/ROADMAP.md` (fase por
> fase) y el estado detallado en `docs/ESTADO.md`. Este archivo sigue para lo operativo del día a
> día (migraciones por correr, cuentas externas pendientes) — no se descontinúa, se complementan.

## Desplegado en producción (2026-10-13/14) — ver `docs/DEPLOY.md`

HEBRA ya está en producción real en **Cloudflare Workers**, dominio propio **`hebrasoft.com`**
(no Vercel — las menciones a Vercel más abajo en este archivo son de una decisión anterior que se
cambió; quedan tal cual para no reescribir historia, pero ya no aplican). Detalle completo de cómo
se desplegó, por qué Next.js quedó fijado en `16.3.8`, y las dos advertencias reales encontradas
(proxy en runtime Node "experimental" en Cloudflare, build en Windows no 100% confiable) en
`docs/DEPLOY.md`.

- [x] Migración `supabase/migrations/0020_correo_cliente.sql` corrida en Supabase (columna
      `customers.email`) — confirmado por el usuario.
- [x] `RESEND_API_KEY` cargada correctamente en Cloudflare — **tuvo un bug real de verdad**: quedó
      primero en la sección de "Build variables" (para `NEXT_PUBLIC_*`, solo build time) en vez de
      "Runtime variables and secrets" (pestaña Production), así que el Worker desplegado nunca la
      veía. Verificado de punta a punta con logs en vivo (Observability), el dashboard de Resend, y
      el correo llegando al Gmail real del usuario. Ver `docs/DEPLOY.md` para no repetir la
      confusión — las dos secciones se llaman parecido en el dashboard.
- [x] SMTP de Resend configurado en Supabase (Authentication → SMTP Settings) para que los
      correos de registro/invitación salgan con la marca de HEBRA — confirmado por el usuario.
- [x] Dominio `hebrasoft.com` verificado en Cloudflare DNS para Google Search Console; sitemap
      cargado (tuvo un error transitorio de la propia consola de Google, no del sitio — se resolvió
      reintentando). Indexación solicitada por el usuario.
- [x] `favicon.ico` real agregado en la raíz (faltaba, Google mostraba un ícono genérico en
      resultados de búsqueda) — puede tardar unos días en reflejarse en Google.

## Para poder desplegar a producción
- [x] Completar `.env.local` con las credenciales reales del proyecto Supabase.
- [x] Correr `supabase/migrations/0001_hebra_schema.sql` en Supabase (SQL Editor).
- [x] Configurar *Site URL* y *Redirect URLs* en Supabase (Authentication → URL Configuration).
- [x] Repo en GitHub, build/lint/test en verde, auditoría de producción (ver `bitacora.md`).
- [x] Correr `supabase/migrations/0002_mark_order_paid.sql` en Supabase (SQL Editor).
- [ ] **Correr `supabase/migrations/0003_team_roles.sql` en Supabase** — sin esto, invitar
      miembros, cambiar roles, y hasta marcar un pedido como pagado / generar remisiones va a
      fallar (esas dos últimas se tocaron en esta migración).
- [ ] **Correr `supabase/migrations/0004_audit_log.sql` en Supabase** (después de la 0003) — sin
      esto, la tarjeta "Actividad" en Configuración no va a funcionar.
- [ ] Al desplegar en Vercel: agregar `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_ANON_KEY`
      como variables de entorno, y actualizar *Site URL* / *Redirect URLs* en Supabase con el
      dominio real.

## Después del rediseño visual + analítica
- [x] Verificado con tráfico real en `npm run dev` que `/inicio`, `/analitica` y `/configuracion`
      cargan sin errores (no solo build estático).
- [x] Auditoría visual real con Playwright: capturas de pantalla de las 8 pantallas principales,
      vacías y con datos reales, claro/oscuro, escritorio/móvil. Dos bugs reales encontrados y
      corregidos (tarjeta anidada en "Revisa tu correo", truncado de etiquetas en tarjetas de
      estadística en móvil). Detalle en `bitacora.md`.
- [ ] **Reactivar "Confirm email" en Supabase** (Authentication → Providers → Email) — se
      desactivó temporalmente para poder crear una cuenta de prueba durante la auditoría visual.
      Dejarlo desactivado en producción permite registrarse sin correo real.
- [ ] Borrar la cuenta de prueba `qa.visual.*@gmail.com` desde Supabase → Authentication → Users
      (y su negocio "Taller QA" asociado) si no se quiere dejar datos de prueba.
- [ ] Revisar especialmente: modal de "Instala HEBRA" (solo visible en `npm run build && npm
      start`, no en dev), los gráficos de `/analitica` con datos reales variados (muchos meses,
      muchos productos, varias categorías de gasto).

## "Versión enterprise" — después de correr 0003 y 0004
- [ ] Probar de punta a punta con el servidor de desarrollo real (como en las auditorías
      anteriores): invitar una cuenta de prueba como "staff", aceptar la invitación, confirmar que
      no ve Caja/Analítica/Configuración ni por UI ni por URL directa, probar cambiar de rol y
      quitar miembros, y confirmar que el trigger de "último dueño" bloquea quitar al único dueño.
- [ ] Revisar la tarjeta "Actividad" en Configuración con varios tipos de evento reales.

## Pendiente de decisión del usuario (necesita algo externo, no se puede construir solo)
- [ ] **Planes de pago y suscripciones**: necesita que el usuario cree/conecte una cuenta de
      Stripe (u otro proveedor) y decida qué incluye cada plan.
- [ ] **SSO/SAML**: necesita un plan pago de Supabase y que el usuario elija/configure un
      proveedor de identidad (Google Workspace, Azure AD, Okta...).
- [ ] Conectar un monitor de errores real (ej. Sentry) — el código ya está preparado para esto en
      `src/lib/report-error.ts`, solo falta una cuenta/DSN del usuario.

## Recomendaciones no bloqueantes (mejoras futuras, no impiden lanzar)
- [ ] Content-Security-Policy estricta (hoy solo hay headers básicos: nosniff, X-Frame-Options,
      Referrer-Policy, Permissions-Policy). Una CSP completa requiere manejar con cuidado el script
      inline del tema (`themeInitScript` en `layout.tsx`) y los dominios de Google Fonts/Supabase.
- [ ] Selector de negocio para usuarios que pertenecen a más de uno (hoy se usa automáticamente el
      más reciente al que se unieron, sin forma de cambiar).
- [ ] Búsqueda de clientes/insumos ahora solo filtra dentro de la página actual (50 resultados) —
      antes de paginar buscaba en todo el listado. Si hace falta buscar en todo el histórico, se
      necesitaría mover la búsqueda al servidor.

## Roadmap Enterprise (kit nuevo, ver `docs/ROADMAP.md`/`docs/ESTADO.md`)
- [x] Fase 0 — Sistema de diseño y nuevo layout. Verificado con Playwright, `lint`/`test`/`build`
      en verde.
- [x] Fase 1 — Sedes, roles y equipo. Migraciones `0006`-`0008` corridas; matriz de permisos real
      (`src/lib/permissions.ts`) verificada con cuentas tejedora/ventas de verdad (invitación →
      registro → aceptación), no solo con el dueño. Ver entrada en `docs/CHANGELOG.md` y
      `docs/bitacora.md` para el detalle y los bugs reales que se encontraron y corrigieron.
- [x] Fase 2 — Panel ejecutivo. Migración `0009` corrida (`orders.channel`); KPIs/gráfico/alertas
      reales en `/inicio` para Propietaria y Administración, con `src/lib/analytics.ts` probado.
      Ver entrada en `docs/CHANGELOG.md` y `docs/bitacora.md`.
- [x] Fase 3 — Producción y capacidad. Migración `0010` corrida (`assigned_to`, `timer_sessions.
      order_id`, `availability`); tablero con filtros, avance real y vista Capacidad, probados de
      punta a punta (incluida la sugerencia de reparto reasignando de verdad). Resuelve dos
      simplificaciones de fases anteriores (tejedora solo ve sus pedidos propios; 4 reglas completas
      de "Necesitan atención"). Ver `docs/CHANGELOG.md` y `docs/bitacora.md`.
- [x] Fase 4 — Recetario, costeo y simulador. Migración `0011` corrida (`sales_channels`,
      `product_versions`, y corrige que los negocios nuevos no recibían sede "Principal"). Simulador
      con margen sobre precio de venta, probado contra el criterio de aceptación exacto ($85.400) y
      con el servidor real. Un bug real encontrado y corregido (botón anidado en el switch de IVA).
      Ver `docs/CHANGELOG.md` y `docs/bitacora.md`.
- [ ] Reactivar "Confirm email" en Supabase (se desactivó para probar flujos con cuentas reales en
      las Fases 1-3).
- [ ] Borrar si se quiere: cuentas de prueba `qa.tejedora.*@gmail.com`/`qa.ventas.*@gmail.com`, la
      sede "Bogotá" y varios pedidos de prueba ("Gorro canal-test", dos "Amigurumi Osito" con precio
      $0), creados durante la verificación de las Fases 1-3.
- [x] Fase 5 — Inventario multisede. Migración `0012` corrida (`suppliers`, `supply_lots`,
      `purchase_orders`/`purchase_order_lines`, `stock_transfers`, RPCs `advance_purchase_order`/
      `complete_transfer`, trigger de reorden automático). Verificado con el servidor real: ciclo
      completo de una OC con costo promedio ponderado exacto, reorden automático al cruzar el umbral,
      transferencia real entre sedes. Dos problemas reales encontrados y corregidos (botón de avanzar
      OC sin `useTransition`; falta de UI para crear proveedores). Ver `docs/CHANGELOG.md` y
      `docs/bitacora.md`.
- [ ] Borrar si se quiere (datos de prueba de la Fase 5): proveedor "Lanas del Valle", la OC
      `#C25BA8` (borrador, creada por reorden automático) y los 30g de "Lana café" transferidos a la
      sede "Bogotá".
- [x] Fase 6 — Finanzas y facturación. Excluida el 2026-10-11, reinstalada por el usuario el
      2026-10-12 con una condición: construir todo en código, sin adaptador real de facturación
      (eligió "ninguno todavía" cuando se le preguntó Alegra/Siigo/ninguno). Migración `0014` corrida
      (`customers.document_number`, `tenants.invoice_seq`, tabla `invoices`, RPC
      `reserve_invoice_number`). Sin tabla `payments` nueva (reutiliza `transactions.order_id` de la
      Fase 8); "Gastos fijos" reutiliza `transactions` con esa categoría (se agregó al desplegable de
      Caja, que antes no la tenía). Verificado con el servidor real: factura emitida desde el Kanban
      queda `rechazada` con el mensaje real (no inventado); "Reintentar" funciona; cascada y cartera
      correctas con datos reales; CSV exportado correcto; `ventas` ve "Factura" en el Kanban pero no
      entra a `/finanzas`. Ver `docs/CHANGELOG.md` y `docs/bitacora.md`.
- [ ] **Para que la facturación electrónica funcione de verdad**: crear una cuenta en un proveedor
      (Alegra recomendado — API simple, plan económico para negocios pequeños, muy usado en
      Colombia), y pasarle las credenciales a Claude. El trabajo que falta está documentado como
      comentario en `src/lib/invoicing.ts`: crear `src/lib/invoicing/alegra.ts` implementando
      `InvoicingProvider`, leer `ALEGRA_EMAIL`/`ALEGRA_TOKEN` (env vars server-only, sin prefijo
      `NEXT_PUBLIC_`) en `.env.local` y en Vercel, y devolver ese proveedor desde
      `getInvoicingProvider()` cuando esas env vars existan. El resto del app ya está listo.
- [ ] Borrar si se quiere (datos de prueba de la Fase 6): el NIT de prueba `900123456-7` en el
      cliente "Marcela Ríos", la factura `FE-0001` rechazada, y el gasto "Arriendo taller" ($50.000,
      categoría "Gastos fijos") registrado en Caja.
- [ ] **Fase 7 — Integraciones, seguridad y plan: excluida por ahora** (pedido explícito del usuario,
      2026-10-11). No empezar sin que lo pida de nuevo.
- [x] Fase 8 — Móvil por rol y portal del cliente. Migración `0013` corrida (`product_steps`,
      `order_step_progress`, `orders.tracking_token`/`progress_photo_url`, RPCs `get_order_tracking`/
      `get_order_balance`/`register_order_payment`/`toggle_order_step`, bucket `avance`). "Saldo real
      sin pasarela" (decisión confirmada con el usuario): usa `transactions.order_id` existente, sin
      Wompi/PSE/Nequi real. Verificado con el servidor real: "Mi turno" con cronómetro+pasos+foto;
      saldo correcto tras dos abonos reales; portal público abierto sin sesión (`storageState` vacío)
      mostrando solo los campos del mockup; token inválido → 404. Un bug real encontrado y corregido
      (`revalidatePath("/pedidos")` no revalidaba `/pedidos/[id]`). Ver `docs/CHANGELOG.md` y
      `docs/bitacora.md`.
- [ ] Borrar si se quiere (datos de prueba de la Fase 8): los 3 pasos agregados a "Amigurumi Osito"
      en Recetario, la foto de avance subida al pedido `#B5F445`, y los dos abonos ($20.000 +
      $10.000) registrados en el pedido `#A5A159` de Marcela Ríos.
- [ ] Fase 9 — Listo para producción.

## Roadmap sugerido (del README original)
- [x] Invitar colaboradores a un negocio — ver "Versión enterprise" arriba.
- [ ] Cola offline también para ventas y movimientos de pedidos (hoy solo el cronómetro tiene cola
      offline).
- [x] Reportes/analítica básica (ventas por mes, productos más rentables, gastos por categoría,
      margen real) — página `/analitica`. Pendiente como mejora futura: exportar a PDF/Excel,
      rango de fechas personalizable (hoy es fijo a los últimos 6 meses).
