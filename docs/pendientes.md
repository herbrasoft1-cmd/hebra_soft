# Pendientes

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

## Roadmap sugerido (del README original)
- [x] Invitar colaboradores a un negocio — ver "Versión enterprise" arriba.
- [ ] Cola offline también para ventas y movimientos de pedidos (hoy solo el cronómetro tiene cola
      offline).
- [x] Reportes/analítica básica (ventas por mes, productos más rentables, gastos por categoría,
      margen real) — página `/analitica`. Pendiente como mejora futura: exportar a PDF/Excel,
      rango de fechas personalizable (hoy es fijo a los últimos 6 meses).
