# Pendientes

## Para poder desplegar a producción
- [x] Completar `.env.local` con las credenciales reales del proyecto Supabase.
- [x] Correr `supabase/migrations/0001_hebra_schema.sql` en Supabase (SQL Editor).
- [x] Configurar *Site URL* y *Redirect URLs* en Supabase (Authentication → URL Configuration).
- [x] Repo en GitHub, build/lint/test en verde, auditoría de producción (ver `bitacora.md`).
- [x] Correr `supabase/migrations/0002_mark_order_paid.sql` en Supabase (SQL Editor).
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

## Recomendaciones no bloqueantes (mejoras futuras, no impiden lanzar)
- [ ] Content-Security-Policy estricta (hoy solo hay headers básicos: nosniff, X-Frame-Options,
      Referrer-Policy, Permissions-Policy). Una CSP completa requiere manejar con cuidado el script
      inline del tema (`themeInitScript` en `layout.tsx`) y los dominios de Google Fonts/Supabase.
- [ ] Monitoreo de errores en producción (ej. Sentry) — hoy los errores solo quedan en los logs del
      servidor/consola del navegador.
- [ ] Páginas con muchos registros (`supplies`, `orders`, `customers`, etc.) se consultan sin límite
      ni paginación. No es problema con pocos cientos de filas, pero conviene paginar antes de que
      un negocio acumule miles de insumos o pedidos.

## Roadmap sugerido (del README original)
- [ ] Invitar colaboradores a un negocio (la tabla `memberships` ya soporta roles, falta la UI y las
      políticas de insert/update/delete sobre esa tabla).
- [ ] Planes y cobro de suscripción del SaaS.
- [ ] Cola offline también para ventas y movimientos de pedidos (hoy solo el cronómetro tiene cola
      offline).
- [x] Reportes/analítica básica (ventas por mes, productos más rentables, gastos por categoría,
      margen real) — página `/analitica`. Pendiente como mejora futura: exportar a PDF/Excel,
      rango de fechas personalizable (hoy es fijo a los últimos 6 meses).
