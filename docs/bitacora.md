# Bitácora

Registro cronológico de trabajo sobre HEBRA. Cada entrada: fecha, qué se hizo, cómo, por qué.

## 2026-10-10

- **Qué:** Primera sesión de trabajo con Claude Code sobre el proyecto ya existente (Next.js 16 +
  Supabase, estructura completa de `src/` ya creada previamente).
- **Cómo:**
  - Se creó `.env.local` a partir de `.env.example` (faltan completar `NEXT_PUBLIC_SUPABASE_URL` y
    `NEXT_PUBLIC_SUPABASE_ANON_KEY` con los datos reales del proyecto Supabase).
  - Se creó esta carpeta `docs/` para llevar registro continuo del avance.
- **Por qué:** El proyecto no es un repo git todavía y no tenía `.env.local` ni documentación de
  evolución (solo el README de instalación). Se necesita poder retomar el trabajo entre sesiones
  sin perder contexto.
- **Pendiente para la próxima sesión (al momento):**
  - Completar `.env.local` con las credenciales reales de Supabase.
  - Correr la migración `supabase/migrations/0001_hebra_schema.sql` en el proyecto de Supabase.
  - Decidir si se inicializa git (`git init`) para empezar a versionar.

- **Actualización (mismo día):** el usuario completó `.env.local` con credenciales reales.
  **Qué:** se inicializó git localmente y se hizo el primer commit; se conectó el remoto al repo
  `https://github.com/herbrasoft1-cmd/hebra_soft.git` (rama `main`), pero **aún no se hizo push**.
  **Por qué:** el repo pertenece a la cuenta de GitHub `herbrasoft1-cmd`, pero la cuenta que está
  autenticada en esta máquina (guardada en Windows Credential Manager para `git:https://github.com`)
  es `gestionsigasoftware-netizen`, una cuenta distinta. Se decidió que `gestionsigasoftware-netizen`
  sea la que haga push, así que `herbrasoft1-cmd` debe invitarla como colaboradora (rol Write) en
  `https://github.com/herbrasoft1-cmd/hebra_soft/settings/access` antes de poder subir el código.
  **Pendiente:** enviar y aceptar esa invitación, luego ejecutar `git push -u origin main`.

- **Actualización (mismo día):** invitación enviada y aceptada. Se ejecutó `git push -u origin main`
  sin pedir credenciales (confirma que `gestionsigasoftware-netizen` ya tenía acceso de escritura).
  El proyecto ya está publicado en https://github.com/herbrasoft1-cmd/hebra_soft, rama `main`.

- **Actualización (mismo día):** se instalaron dependencias (`npm install`) y se corrió la migración
  SQL en Supabase. Se levantó `npm run dev` en `http://localhost:3000` para probar el flujo del MVP.
  **Bug encontrado y corregido:** el aviso "Instala HEBRA" (`src/components/pwa.tsx`,
  `InstallPrompt`) aparecía en cada cambio de pantalla durante `npm run dev`. Causa: en modo dev con
  Turbopack, el layout `(app)/layout.tsx` (Server Component dinámico por usar cookies de sesión) se
  remonta en cada navegación, re-disparando el `useEffect` del aviso. Fix: se agregó el mismo guard
  que ya tenía `ServiceWorkerRegister` (`if (process.env.NODE_ENV !== "production") return;`), así
  el aviso solo corre en producción. Para probar el comportamiento real del aviso, usar
  `npm run build && npm start`, no `npm run dev`.

- **Auditoría de producción (mismo día).** El usuario pidió verificar si la app está lista para
  producción y corregir lo que faltara. Build, lint y tests ya pasaban limpio antes de empezar.
  Hallazgos y fixes:
  - **Dependencias:** 4 vulnerabilidades en devDependencies (vitest/mocker, tinypool, sharp) — no
    afectan el runtime de producción, pero se actualizaron (`npm audit fix --force`) a vitest 5 y
    sharp 0.35.5. 0 vulnerabilidades ahora.
  - **Bug real (Windows):** `scripts/generate-icons.mjs` construía rutas con `new URL(...).pathname`,
    que en Windows da rutas mal formadas (`/C:/...`). Con sharp 0.35 esto rompía `npm run icons`.
    Fix: usar `fileURLToPath`.
  - **Manejo de errores silencioso (el hallazgo más importante):** casi todas las server actions
    (`insumos`, `pedidos`, `recetario`, `caja`, `clientes`, `configuracion`) hacían `insert`/`update`/
    `delete` sin revisar el `error` que devuelve Supabase. Si fallaba (RLS, constraint, red), el
    usuario creía que había guardado y no pasaba nada. Fix: cada escritura ahora revisa el error y
    lanza una excepción con mensaje claro.
  - **Error boundaries faltantes:** no había `error.tsx`, `global-error.tsx` ni `not-found.tsx` en
    todo el proyecto — un error sin capturar mostraba la pantalla genérica fea de Next.js. Se
    agregaron los tres, con el mismo estilo visual de `offline/page.tsx`. También se agregó
    `(app)/loading.tsx` para que las rutas dinámicas (todas las de `(app)`) muestren un spinner en
    vez de pantalla en blanco mientras cargan.
  - **Atomicidad:** `markPaid` (marcar pedido como pagado) hacía dos escrituras separadas desde el
    cliente (actualizar pedido + insertar transacción); si la segunda fallaba, quedaba a medias.
    Se movió la lógica a una función SQL `mark_order_paid` (una sola transacción en la base) —
    **nueva migración `supabase/migrations/0002_mark_order_paid.sql`, pendiente de correr en
    Supabase**, igual que se corrió la 0001.
  - **UX de error faltante:** `QuickTransactionSheet` (venta/gasto rápido) no mostraba nada si
    fallaba el guardado. Ahora muestra el mensaje de error igual que el resto de formularios.
  - **Integridad de datos:** el nombre del patrón en `/recetario/[id]` se autoguarda al perder foco;
    si quedaba vacío se intentaba guardar `null` contra una columna `not null`. Se agregó
    validación en el cliente (`required` + revertir si queda vacío) para que nunca llegue a la base.
  - **Seguridad:** se revisó el esquema SQL completo (RLS, funciones `security definer`/`invoker`,
    políticas de Storage) — está bien diseñado, aislamiento multitenant correcto, sin hallazgos. Se
    agregaron headers HTTP de seguridad (`X-Content-Type-Options`, `X-Frame-Options`,
    `Referrer-Policy`, `Permissions-Policy`) en `next.config.ts`, que no existían.
  - **Limpieza:** se eliminó un warning de Vitest (config ESM cargado como CommonJS) renombrando
    `vitest.config.ts` → `vitest.config.mts`. Se agregó `"engines": {"node": ">=20"}` a
    `package.json` para que Vercel use la versión correcta de Node.
  - Verificado: `npm run lint`, `npm test` y `npm run build` pasan limpio después de todos los cambios.
  - Commit `64c169e` pusheado a `main` en https://github.com/herbrasoft1-cmd/hebra_soft.
  - **Actualización:** el usuario corrió `supabase/migrations/0002_mark_order_paid.sql` en Supabase.
    Con esto, todas las migraciones están aplicadas y no quedan bloqueantes para producción — solo
    quedan las recomendaciones no bloqueantes y el roadmap sugerido en `pendientes.md`, y configurar
    las variables de entorno + Site URL/Redirect URLs al desplegar en Vercel con el dominio real.

- **Rediseño visual (mismo día).** El usuario sintió que la app se veía "de juguete" y pidió
  aplicar buenas prácticas de UI/UX (profundidad, tipografía, espacio, sombras, copy, íconos en vez
  de emojis) para que se viera como un software profesional. Cambios, de mayor a menor alcance:
  - **Sistema de elevación nuevo en `globals.css`:** tokens `--c-shadow-xs/sm/md/lg/up` (distintos
    en modo claro y oscuro — en oscuro las sombras casi no se ven, así que usan negro puro con más
    opacidad), registrados como utilidades `shadow-*` de Tailwind. Antes no había ninguna sombra en
    toda la app; `card`, `btn-primary`, `btn-sage`, `btn-ghost` e `input` ahora las usan.
  - **Radios de borde estandarizados:** botones de `rounded-2xl` (16px, "burbuja") a `rounded-xl`
    (12px); cards de un arbitrario `rounded-[18px]` al `rounded-2xl` estándar de Tailwind. El modal
    centrado de escritorio bajó de `rounded-[28px]` a `rounded-2xl` (el bottom-sheet móvil conserva
    el radio grande, es un patrón reconocido de iOS/Android).
  - **Estados de foco e interacción:** se agregó `focus-visible:ring` consistente a botones, enlaces
    del menú y a los botones circulares del cronómetro (play/pausa/stop), que antes no tenían ningún
    feedback de hover/focus/press — se sentían "muertos" al interactuar.
  - **Nueva utilidad `icon-btn`** para botones circulares de solo ícono (cerrar, quitar insumo),
    reemplaza estilos repetidos sin estados.
  - **Tipografía:** `letter-spacing: -0.015em` global en `font-display` (Fraunces) para un trazo más
    fino en títulos grandes.
  - **Componentes rediseñados:** `Sheet` (modal/hoja: sombra real, botón de cerrar con ícono ✕ en
    vez de texto "Cerrar"), `Sidebar`/`BottomNav` (indicador activo con cápsula, barra inferior con
    `backdrop-blur` tipo iOS y sombra hacia arriba en vez de solo un borde), `EmptyState` (ahora
    acepta un ícono circular, antes era solo texto centrado), `InstallPrompt` (mismo tratamiento de
    sombra/radio que `Sheet`, lista de beneficios con íconos de check en vez de viñetas de texto).
  - **Nuevos íconos** (mismo trazo que el set existente): `IconClose`, `IconTrendUp`,
    `IconTrendDown`, `IconWallet` — para el botón de cerrar y para darle ícono a cada tarjeta de
    estadística (antes eran solo número + texto, sin ícono).
  - **Pantallas con pasada dedicada:** Inicio (tarjetas de estadísticas con ícono y tono de color,
    tarjetas de "Por agotarse" con hover), Pedidos (columnas del Kanban con mejor jerarquía,
    indicador de columna vacía, tarjetas con hover), Insumos (tarjeta de insumo con elevación al
    pasar el mouse), login/registro/bienvenida (el formulario ahora vive en una tarjeta elevada
    sobre fondo `surface-2`, antes flotaba directo sobre el fondo).
  - El resto de pantallas (Caja, Clientes, Configuración, editor del recetario) heredan las mejoras
    automáticamente porque reusan las utilidades `card`/`btn-*`/`input` de `globals.css`.
  - Verificado: `npm run lint`, `npm test` y `npm run build` pasan limpio. No se verificó visualmente
    en navegador (sin herramienta de captura de pantalla en esta sesión) — recomendado abrir
    `localhost:3000` y recorrer las pantallas antes de dar por cerrado el rediseño.

- **Analítica, gráficos e insights + skeletons (mismo día).** El usuario sintió que el software
  seguía "muy básico": faltaba analítica del negocio, insights, gráficos, estados vacíos y
  skeletons. Se cargó la skill `dataviz` antes de escribir cualquier gráfico (siguiendo su
  instrucción explícita) y se aplicó su metodología: color secuencial de un solo tono por gráfico
  (nunca categórico, porque el trabajo de los datos es magnitud/ranking, no identidad), barras
  delgadas ancladas a la línea base, tooltip accesible en hover/foco, y una vista de tabla como
  equivalente accesible de cada gráfico.
  - **Nueva página `/analitica`** (ítem de menú solo en escritorio, como Clientes/Configuración):
    tendencia de ventas de los últimos 6 meses (barras), productos más vendidos y gastos por
    categoría (rankings), y 3-4 insights calculados en texto (variación de ventas mes vs mes
    anterior, producto más vendido, mayor categoría de gasto, margen real promedio del recetario
    comparado con el costeo). Estado vacío propio si el negocio no tiene datos aún.
  - **`src/components/charts.tsx`** (nuevo): `TrendBars` (columnas), `RankingBars` (barras
    horizontales), `Sparkline` (mini tendencia para tarjetas de estadística). Sin librería externa
    de gráficos — SVG/HTML a mano, consistente con los íconos ya hechos a mano del proyecto.
  - **Bug real encontrado en vivo (no lo detecta TypeScript):** se pasó `formatValue={money}` como
    prop desde un Server Component (`analitica/page.tsx`) a un Client Component (`TrendBars`) — Next
    no permite pasar funciones a través de ese límite, solo valores serializables. Se vio en los
    logs del `npm run dev` que seguía corriendo (confirmado con tráfico real de un usuario
    navegando `/analitica` e `/inicio` en vivo). Fix: los componentes de gráficos reciben un string
    `format: "money" | "compact"` y resuelven la función internamente, nunca una función como prop.
  - Se conectó `Sparkline` a la tarjeta "Ventas del mes" de Inicio (tendencia de los últimos 14
    días) para no dejarlo como código sin usar.
  - **Skeletons:** `src/components/skeleton.tsx` (primitivo `Skeleton` + `SkeletonHeader/Stat/Row/
    Card`) y un `loading.tsx` específico por ruta (inicio, insumos, recetario, recetario/[id],
    pedidos, caja, clientes, configuración, analítica) que imita la forma real de cada pantalla,
    en vez del spinner genérico que había antes en `(app)/loading.tsx` (ese spinner genérico se
    deja como resguardo para rutas futuras sin su propio `loading.tsx`).
  - **Estados vacíos:** el de Caja (antes texto plano) ahora usa `EmptyState` con ícono, igual que
    Insumos/Clientes/Recetario.
  - Verificado con el servidor de desarrollo corriendo (no solo build estático): se confirmó en los
    logs que `/inicio`, `/analitica` y `/configuracion` cargan sin errores con una sesión real.
    `npm run lint`, `npm test` y `npm run build` también pasan limpio.

- **Auditoría visual real con Playwright (mismo día).** El usuario pidió ver visualmente cómo
  quedó la app. Se instaló Playwright en la carpeta de scratchpad (no se agregó al proyecto) y se
  usó para navegar la app real en `localhost:3000`, crear una cuenta de prueba desechable, y
  recorrer con capturas de pantalla reales: login, registro (claro y oscuro), las 8 pantallas
  principales vacías, el flujo completo con datos reales (insumo → patrón con receta y cronómetro
  → pedido → venta en caja → analítica con gráfico e insight), modo oscuro autenticado, vista móvil
  (390px) y el modal de edición de pedido.
  - **Bloqueo encontrado:** Supabase tenía "Confirm email" activado, así que no se podía crear una
    cuenta de prueba sin acceso a un correo real. El usuario lo desactivó temporalmente en
    Supabase → Authentication → Providers → Email para esta sesión de pruebas.
    **Pendiente: volver a activar "Confirm email" antes de un lanzamiento real** (quedó
    desactivado), y borrar la cuenta de prueba `qa.visual.*@gmail.com` desde Supabase →
    Authentication → Users si no se quiere dejar basura de pruebas.
  - **Bug real encontrado y corregido:** la pantalla "Revisa tu correo" (tras registrarse) tenía
    una tarjeta (`card`) anidada dentro de la tarjeta que ya pone `(auth)/layout.tsx` desde el
    rediseño — se veía con doble borde y doble sombra. Se quitó el `card` redundante en
    `src/app/(auth)/registro/page.tsx`.
  - **Bug real encontrado y corregido:** en móvil (390px), las etiquetas de las tarjetas de
    estadística ("Ventas del mes", "Pedidos activos") se truncaban con "…" por falta de espacio
    en 3 columnas angostas. Se redujo el tamaño de fuente/padding de esas tarjetas en mobile
    (`inicio/page.tsx` y `caja/page.tsx`) — ahora caben completas.
  - **Verificado sin hallazgos (confirmado visualmente, no solo por código):** el motor de costeo
    calcula correctamente en pantalla (materiales, mano de obra, desgaste, los 3 precios sugeridos
    — se comprobó la aritmética a mano contra la captura); el tablero Kanban de pedidos; la
    analítica con datos reales (gráfico de barras, ranking, insight calculado); el modal de edición
    con el nuevo botón de cerrar; modo oscuro en pantallas autenticadas; la barra inferior móvil
    con el estado activo resaltado.
  - **Observaciones menores, no corregidas (a criterio del usuario):** el ícono de "Configuración"
    (agujas cruzadas, ya existía antes del rediseño) en el header móvil puede confundirse con un
    botón de cerrar por su forma de X dentro de un círculo — es un ícono de marca preexistente, no
    se tocó sin pedirlo. El indicador de Next.js en modo desarrollo (burbuja "N" abajo a la
    izquierda) se monta encima del botón "Inicio" de la barra inferior en vista móvil — es
    herramienta de desarrollo, no existe en producción.

- **"Versión enterprise" — Fase 1 (equipo y roles) + Fase 2 (rendimiento y auditoría) (mismo día).**
  El usuario pidió una "versión enterprise". Al preguntarle qué significa eso en concreto, eligió
  las 4 opciones (equipo/roles, planes de pago, seguridad/cumplimiento, rendimiento) — demasiado
  para una sola pasada. Se entró a modo plan: se exploró el código existente con un agente, se
  diseñó y criticó la Fase 1 con un segundo agente antes de escribir una sola línea, y se escribió
  un plan completo (`C:\Users\T460s\.claude\plans\smooth-riding-phoenix.md`) que el usuario aprobó.
  Planes de pago (necesita cuenta de Stripe) y SSO/cumplimiento avanzado (necesita plan pago de
  Supabase + proveedor de identidad) quedaron explícitamente fuera — requieren algo externo del
  usuario que no se puede improvisar.
  - **Fase 1 — Colaboración en equipo y roles:**
    - Migración `supabase/migrations/0003_team_roles.sql` (nueva, **pendiente de correr en
      Supabase**): tabla `invitations`, función `has_role`, trigger `protect_last_owner` (nunca
      dejar un negocio sin dueño), RPCs `create_invitation`/`accept_invitation`/`list_members`/
      `update_member_role`/`remove_member`. Se convirtieron `create_remission` y `mark_order_paid`
      a `security definer` (si no, se habrían roto para "staff" al restringir `transactions`).
      `transactions` queda restringida a admin+ (select/insert/update/delete); `tenants_update`
      también a admin+. `tenants_select` se deja igual a propósito: Recetario necesita leer
      `hourly_rate` y eso lo usa también el personal.
    - Invitación sin servicio de correo ni `service_role` key (no está configurada): se genera un
      enlace `/invitar/[token]` que el dueño comparte manualmente (mismo patrón que compartir
      remisiones por WhatsApp). Flujo completo en `src/app/(auth)/actions.ts` (campos `next`/
      `invite`), `src/app/auth/callback/route.ts`, `/login` y `/registro` (ahora envueltos en
      `<Suspense>` por `useSearchParams()`), y la nueva ruta `src/app/invitar/[token]/`.
    - `src/lib/tenant.ts`: `getSession()` ahora también devuelve `role`, y usa la membresía más
      reciente (antes la primera) para que aceptar una invitación active ese negocio de inmediato.
    - Nueva sección "Equipo" dentro de `/configuracion` (`team-section.tsx`, `team-actions.ts`,
      `invite-sheet.tsx`, `member-row.tsx`): invitar, cambiar rol, quitar miembros/salir.
    - `nav.tsx`: Caja/Analítica/Configuración se ocultan para "staff" (`adminOnly`); esas 3 páginas
      además redirigen a `/inicio` si un staff intenta entrar directo por URL — la protección real
      es la RLS de la base, esto es solo UX.
  - **Fase 2 — Rendimiento y auditoría:**
    - Paginación real (`.range()`, 50 por página, `?page=` en la URL) en `clientes/page.tsx` e
      `insumos/page.tsx`, que antes traían la tabla completa sin límite. Nuevo componente
      reutilizable `src/components/pager.tsx`.
    - `pedidos/page.tsx` traía *todos* los pedidos de la historia del negocio sin filtro; ahora se
      acota a activos + enviados en los últimos 90 días, con un límite de seguridad adicional (el
      tablero Kanban es para trabajo activo, no historial completo).
    - Migración `supabase/migrations/0004_audit_log.sql` (nueva, **pendiente de correr**): tabla
      `audit_log`, RPC `log_audit` (inserta) y `list_audit_log` (lee con el correo de quién hizo
      el cambio). Helper `src/lib/audit.ts` — nunca lanza si falla, para no tumbar la acción
      principal por un problema de auditoría. Conectado en: invitar/cambiar rol/quitar miembros,
      guardar configuración del negocio, y las eliminaciones de insumo/patrón/pedido/cliente/
      movimiento. Nueva tarjeta "Actividad" en Configuración con las últimas 50 entradas.
    - `src/lib/report-error.ts`: un solo punto de paso para errores no capturados (hoy solo
      `console.error`, estructurado para que conectar un monitor real como Sentry después sea
      cambiar una función, no cada pantalla). No se instaló ningún SDK de monitoreo — eso necesita
      una cuenta del usuario.
  - Verificado: `npm run lint`, `npm test` y `npm run build` pasan limpio. **No verificado en vivo
    todavía**: las migraciones 0003 y 0004 no se han corrido en Supabase, así que el flujo de
    invitación/roles/auditoría no se ha probado con datos reales — eso es lo siguiente apenas el
    usuario corra las migraciones.

- **Llega el kit "HEBRA Enterprise" (mismo día).** El usuario pegó `@prompts/00-primer-prompt.md` y
  pidió ejecutarlo tal cual. Apareció un `CLAUDE.md`, `docs/ROADMAP.md`, `docs/DESIGN.md` y 9
  mockups en `docs/mockups/` — un roadmap mucho más detallado y profesional que el trabajo de
  "enterprise" hecho hasta ese momento en esta misma sesión (ver entrada anterior), con su propio
  sistema de diseño (Geist, sin sombras, menú espresso) y su propio modelo de roles (4, con sedes,
  no 3 como se había construido). Se siguió el primer prompt al pie de la letra: se leyeron las 4
  fuentes de verdad, se abrieron los 9 mockups con Playwright para verlos renderizados, y se
  escribió `docs/ESTADO.md` (qué del roadmap ya existe en el MVP, fase por fase, riesgos y 5
  preguntas) y `docs/CHANGELOG.md` vacío — sin tocar `src/` ni `supabase/`, como pedía el prompt.
  Hallazgo más importante documentado ahí: el trabajo de equipo/roles de la entrada anterior ya
  estaba commiteado (`c3b8a12 "MVP funcionando"`, sin pushear) y contradice una regla del nuevo
  `CLAUDE.md` (las tejedoras nunca deben ver costos, ni ese trabajo lo garantiza). Quedó como
  pregunta abierta para el usuario, no se tocó.

- **Fase 0 del roadmap Enterprise: sistema de diseño y nuevo layout (mismo día).** El usuario pidió
  "un plan para comenzar a ejecutar" — se entró a modo plan otra vez, se decidió empezar por la
  Fase 0 (no depende de la pregunta abierta de equipo/roles, que sigue sin resolver) y se ejecutó
  tras su aprobación.
  - `src/app/globals.css`: tokens reemplazados por los exactos de `DESIGN.md` (paleta clara,
    oscura conservando las superficies del MVP, menú lateral espresso). Se quitó el sistema de
    sombras anterior casi por completo (`DESIGN.md` pide paneles sin sombra); solo queda un token
    `--shadow-tab` para la pestaña activa de un `SegmentedControl`. Radios: paneles 16px (ya
    coincidía), botones/inputs 10px, chips 999px.
  - **Migración de tokens en toda la app:** los nombres viejos (`sage`, `line`, `primary-ink`,
    `surface-2`) ya no existen — se reemplazaron en bloque (`sed`) por los nuevos
    (`success`, `border`, `primary-hover`, `surface-muted`) en los ~32 archivos que los usaban, y
    se quitaron todas las referencias a sombras (`shadow-xs/sm/md/lg`) de otros ~20 archivos.
  - Geist y Geist Mono cargados en `src/app/layout.tsx` junto a Fraunces.
  - 16 componentes nuevos en `src/components/ui/` (`DESIGN.md` §6): `AppSidebar`, `TopBar`,
    `PageHeader` (reemplaza `src/components/page-header.tsx`, eliminado), `CommandPalette` (⌘K,
    con lista estática de pantallas + 3 acciones rápidas, atajo de teclado global),
    `StatusChip`, `ProgressBar`, `Avatar`/`AvatarStack`, `KpiCard`, `Panel`, `SegmentedControl`,
    `Tabs`, `DataTable`, `KanbanColumn`/`OrderCard`, `CapacityGrid`, `Stepper`, `ChoiceCard`,
    `Toggle`, `InsightCard`, `AlertRow`. Los que ya tenían un equivalente hecho a mano en el MVP
    (`Avatar`, `ProgressBar`) se conectaron de verdad en Inicio/Clientes/Pedidos/Insumos; el resto
    (pensados para las fases 1-4) quedan construidos pero sin usar todavía.
  - `src/components/nav.tsx`: se quitó `Sidebar` (reemplazado por `AppSidebar`); `BottomNav` se
    mantiene igual, solo hereda los tokens nuevos.
  - `(app)/layout.tsx`: usa `AppSidebar`/`TopBar`/`CommandPalette`; se agregó una consulta liviana
    para el badge de pedidos activos en el menú (dato real, no inventado).
  - **Verificado de verdad, no solo que compile:** capturas de pantalla reales con Playwright
    (cuenta de prueba ya existente) de las 7 pantallas en claro/oscuro y escritorio/móvil, más la
    paleta ⌘K y el modal de invitar al equipo — todo coincide con la dirección de los mockups.
    `npm run lint`, `npm test` y `npm run build` pasan limpio.
  - Casilla de la Fase 0 marcada en `docs/ROADMAP.md`, entrada agregada en `docs/CHANGELOG.md`.
  - **Pendiente:** decidir qué hacer con el trabajo de equipo/roles (Fase 1 real todavía no
    empieza) — sigue siendo la pregunta abierta más importante de `docs/ESTADO.md`.

- **Fase 1 del roadmap Enterprise: sedes, roles y equipo (mismo día, sesión siguiente).** El usuario
  resolvió la pregunta abierta ("Evolucionar lo existente") y pidió seguir con la Fase 1. Antes de
  planear se leyó el `<script>` de `docs/mockups/Ent-Equipo.dc.html` directamente (trae datos reales
  de ejemplo, no solo plantillas `{{}}`) para sacar la matriz de permisos exacta en vez de adivinarla
  — ahí salió un dato que corrigió una suposición de la sesión anterior: **solo la Propietaria
  gestiona equipo**, ni siquiera Administración.
  - **Migraciones `0006`-`0008`** (en archivos separados porque Postgres no deja usar un valor nuevo
    de `ALTER TYPE ... ADD VALUE` en la misma transacción implícita del SQL Editor donde se agregó):
    tabla `locations` + sede "Principal" por tenant (backfill); `location_id` nullable en
    `supplies`/`orders`/`transactions`/`timer_sessions`/`memberships`/`invitations`; roles
    `ventas`/`tejedora` agregados al enum, backfill de `staff`→`tejedora`; `create_invitation`/
    `update_member_role`/`remove_member` apretados a solo `owner` (antes `admin` también podía);
    `create_remission` restringido a owner/admin/ventas también a nivel de base, no solo en la UI.
    Dos bugs reales de estas migraciones, encontrados al probar con cuentas reales (no por leer el
    código): `list_members` no se podía `CREATE OR REPLACE` con columnas de salida nuevas (hubo que
    `DROP FUNCTION` primero) y `create_invitation` usaba `gen_random_bytes()` de `pgcrypto`, que no
    está en el `search_path` restringido a `public` de la función — se cambió el token a
    `gen_random_uuid()` (nativo de Postgres, sin depender de ninguna extensión).
  - **`src/lib/permissions.ts` nuevo:** la matriz de 8 permisos × 4 roles tal cual el mockup, como
    datos tipados (`can(role, permission)`, valores `true`/`false`/`"own"`), con `permissions.test.ts`
    cubriendo las 32 celdas una por una.
  - **La fuga de costos real que había que cerrar:** Recetario le mandaba a cualquier miembro
    (incluida la futura tejedora) el costo de materiales, el valor de la hora y el desgaste de
    herramientas, en la lista y en el editor — vía props de Server Component a Client Component, así
    que viajaba en el JSON igual aunque la UI lo escondiera. Se cortó en el origen: la consulta a
    Supabase ni siquiera pide `unit_cost`/`hourly_rate` cuando el rol no tiene `view_costs`, y hay un
    componente de solo lectura nuevo (`recipe-viewer.tsx`) para quien no tiene `edit_recipes` — sin
    costo ni precio sugerido, pero con el cronómetro de talento completo (eso sí le toca a tejedora).
  - Botón de Remisión en Pedidos gateado por `issue_invoices`; acceso a Caja/Analítica/Configuración
    por `view_finance`; pestaña nueva "Roles y permisos" en Equipo (misma matriz, sin duplicar datos)
    y sección "Sedes" para crear sedes nuevas.
  - Selector de sede global en la barra superior, persistido en cookie (`hebra_location`), que sí
    filtra Insumos/Pedidos/Caja de verdad — no es decorativo. Los insumos/pedidos/movimientos nuevos
    heredan la sede activa al crearse.
  - **Verificado de punta a punta con cuentas reales, no solo con el dueño:** se automatizó con
    Playwright el flujo completo invitación → registro → aceptación para una cuenta `tejedora` y una
    `ventas` (hubo que pedirle al usuario desactivar "Confirm email" en Supabase temporalmente, como
    en la sesión de QA visual anterior). Confirmado: ninguna de las dos ve costos ni en la UI ni en
    las respuestas de red de `/recetario`; tejedora no ve el botón de Remisión en ningún estado,
    ventas sí lo ve al llegar el pedido a "Control de calidad"; ninguna de las dos puede entrar a
    Caja/Analítica/Configuración ni por menú ni por URL directa; el filtro de sede deja Insumos vacío
    al elegir una sede sin datos y los vuelve a mostrar con "Todas las sedes".
  - **Dos bugs reales de código encontrados por esa verificación** (no por leer el código, por verlo
    fallar): el enlace "Crea tu cuenta" de `/login` perdía el token de invitación al pasar por ahí
    sin sesión (terminaría creando un negocio nuevo en vez de unirse al que invitó — se arregló
    extrayendo el token de `next` y pasándolo también como `invite`); y el selector de sede de
    `TopBar` no se resincronizaba visualmente tras revalidar (es un `<select>` no controlado con
    `defaultValue` — se arregló con un `key={activeLocationId}` que fuerza el remount). También se
    encontró y corrigió en el camino un `<form action={fn}>` con una función inline no serializable
    en un Server Component (`locations-section.tsx`).
  - `npm run lint`/`test`/`build` pasan limpio. Casilla de la Fase 1 marcada en `docs/ROADMAP.md`,
    entrada agregada en `docs/CHANGELOG.md`.
  - **Pendiente:** reactivar "Confirm email" en Supabase (se desactivó de nuevo para esta prueba);
    las cuentas de prueba `qa.tejedora.*@gmail.com`/`qa.ventas.*@gmail.com` y la sede "Bogotá" de
    prueba quedaron en la base de datos real del usuario, se pueden borrar si no se quieren dejar.
    "Tejedora solo ve sus pedidos propios" no se aplicó de verdad (no hay columna de asignación
    todavía, es de la Fase 3) — por ahora tejedora tiene el mismo acceso a Pedidos que ventas, documen-
    tado como simplificación intencional en el plan de la fase.

- **Fase 3 del roadmap Enterprise: producción y capacidad (mismo día, sesión siguiente).** El usuario
  pidió seguir y, al ver que esta fase era bastante más grande que las anteriores, eligió
  explícitamente hacerla completa de una vez (no partirla) cuando se le preguntó.
  - **Decisión de arquitectura explicada en el plan:** no se creó una ruta `/produccion` separada —
    el mockup `Ent-Produccion.dc.html` la muestra como nav item distinto de "Pedidos", pero su propio
    `<script>` modela "Tablero" y "Capacidad" como dos vistas de **una sola pantalla** (`state.view`),
    no dos rutas. Se extendió el Kanban que ya existía en `/pedidos` desde el MVP, con un toggle
    "Tablero / Capacidad" (`SegmentedControl`, ya conectado desde la Fase 2).
  - **El problema real que había que resolver con criterio, no adivinando:** "avance" necesita que el
    cronómetro se pueda vincular a un pedido específico, pero el cronómetro de Recetario ya existente
    SIEMPRE suma el tiempo a `products.labor_seconds` (el costo del patrón). Si una sesión vinculada a
    un pedido también sumara ahí, el costo se inflaría cada vez que se produce el pedido, no solo al
    afinar la receta la primera vez. Se resolvió con `log_timer_session` aceptando un `p_order_id`
    opcional: solo toca `labor_seconds` cuando la sesión **no** tiene pedido asociado — el flujo de
    Recetario sigue exactamente igual, el del tablero de Producción no toca el costo.
  - **Otra decisión documentada:** la grilla "Carga por tejedora" del mockup, revisando su script,
    en realidad colorea por umbrales fijos sobre un número por celda — no simula un reparto real de
    horas de pedidos día por día (nadie pidió esa precisión, y repartir inventaría datos). Se
    construyó `availability` como disponibilidad semanal **recurrente** por persona y día de la
    semana (se configura una vez, aplica cada semana), y "Capacidad semanal"/la sugerencia de reparto
    comparan totales reales de la semana, no una distribución día a día inventada.
  - **Migración `0010`:** `orders.assigned_to`, `timer_sessions.order_id`, tabla `availability` con
    RLS (cada quien edita la suya, Propietaria/Administración cualquiera).
  - **`src/lib/production.ts` nuevo con pruebas:** horas estimadas, % de avance, urgencia de
    vencimiento (mismos umbrales que `ordersAtRisk` de la Fase 2, para que tablero y panel ejecutivo
    digan lo mismo), totales semanales, y `suggestReassignment` — heurística simple y explicable
    (la persona más sobrecargada → la más holgada, su pedido más grande que quepa y que no haya
    empezado todavía; `null` si no hay una sugerencia razonable, nunca se inventa una).
  - **Se resolvieron dos simplificaciones documentadas a propósito en fases anteriores**, ahora que
    había datos reales para hacerlo: tejedora solo ve en el tablero sus pedidos asignados + los sin
    asignar (prometido en la Fase 1); "Necesitan atención" del panel ejecutivo pasó de 2 a las 4
    reglas del mockup — "sin asignar · vence pronto" y sobrecarga semanal (prometido en la Fase 2).
    `ordersAtRisk` de `analytics.ts` ganó un 4º parámetro opcional (`overloadedUserIds`) sin romper
    a quien la llamaba sin él.
  - **Verificado de punta a punta con el servidor real, no solo con las pruebas unitarias:** se leyó
    el tiempo de trabajo del patrón "Amigurumi Osito" en Recetario (25 min), se asignó el pedido a una
    cuenta, se inició y detuvo el cronómetro desde el tablero de Pedidos, y se confirmó que el tiempo
    del patrón en Recetario **seguía siendo 25 min** — la separación costo-del-patrón vs.
    avance-del-pedido funciona de verdad, no solo en teoría. Se confirmó con la cuenta tejedora de
    prueba que el tablero ahora solo le muestra sus pedidos asignados + los sin asignar. Se configuró
    disponibilidad para dos cuentas (una con 0,1 h, otra con 10 h) y apareció la sugerencia de reparto
    con el texto exacto del pedido/horas/personas correctas; se aplicó con "Aplicar cambio" y, tras
    navegar de nuevo a la página, el pedido había quedado reasignado de verdad.
  - Durante la verificación, dos scripts de prueba fallaron por errores del propio script (selector
    de botón ambiguo, carrera de tiempo tras crear un pedido) — no eran bugs de la app; se ajustaron y
    se confirmó el comportamiento correcto.
  - `npm run lint`/`test` (44/44, +3 nuevas de `production.ts` y variantes de `ordersAtRisk`)/`build`
    pasan limpio. Casilla de la Fase 3 marcada en `docs/ROADMAP.md`, entrada en `docs/CHANGELOG.md`.
  - **Pendiente:** quedaron varios pedidos de prueba adicionales ("Gorro canal-test" y dos
    "Amigurumi Osito" nuevos con precio $0) en la base de datos real del usuario por las pruebas de
    esta fase — se pueden borrar si no se quieren dejar, igual que las cuentas/sede de prueba de
    fases anteriores. Fases 4-9 del roadmap siguen sin empezar.

- **Fase 2 del roadmap Enterprise: panel ejecutivo (mismo día, sesión siguiente).** El usuario pidió
  seguir. Leí `docs/mockups/Ent-Dashboard.dc.html` completo (su `<script>` trae la lógica real del
  gráfico de ingresos/utilidad) y encontré que varias secciones del mockup dependen de conceptos que
  todavía no existen en el esquema — "Capacidad del taller"/horas disponibles y dos de las cuatro
  reglas de "Necesitan atención" necesitan disponibilidad y tejedora-asignada-a-pedido, que son
  explícitamente de la Fase 3 ("Producción y capacidad"), aunque `docs/ROADMAP.md` los pide en su
  lista de la Fase 2. Mismo criterio que en la Fase 1: construir lo real, documentar lo que falta, no
  inventar números — "Capacidad del taller" se reemplazó por "Cartera pendiente" (dato real que ya se
  calculaba en `inicio/page.tsx`); se omitieron las 2 reglas de riesgo sin datos y el botón "Reasignar
  automáticamente".
  - **Decisión de arquitectura:** en vez de una ruta nueva, `/inicio` se bifurca por
    `canFully(role, "view_finance")` — Propietaria/Administración ven el panel ejecutivo nuevo,
    Ventas/Tejedora ven exactamente el inicio simple de siempre (mismo patrón ya usado en Recetario:
    una ruta, contenido distinto por permiso). `/analitica` no se tocó — sigue siendo un complemento
    válido (desglose de gastos por categoría, que el panel ejecutivo no cubre).
  - **Migración `0009_order_channel.sql`:** agrega `orders.channel` (texto, nullable, sin backfill)
    para poder calcular "Ventas por canal" — campo nuevo en el mismo `OrderForm` de Pedidos.
  - **`src/lib/analytics.ts` nuevo** (con pruebas, tal como pide `docs/ROADMAP.md`): variación %,
    las 2 reglas reales de "Necesitan atención", rentabilidad por producto (reutiliza
    `costBreakdown` de `costing.ts`), ventas por canal, y el reagrupado de la serie diaria de
    ingresos/utilidad en 7 días/12 semanas/12 meses para el gráfico nuevo.
  - **`RevenueProfitChart`** (nuevo en `src/components/charts.tsx`): dos series del mismo matiz
    (ingresos en tono claro, utilidad como capa anidada dentro de la barra, con su alto expresado
    como % de esa barra — así siempre representa el margen real, nunca un número inventado), con
    pestañas de período, tooltip y vista de tabla. Usa `SegmentedControl` para las pestañas — estaba
    construido desde la Fase 0 pero nunca conectado a nada hasta ahora.
  - El panel ejecutivo también terminó de conectar varios componentes de la Fase 0 que llevaban
    "construidos pero sin usar": `KpiCard`, `Panel`, `AlertRow`, `DataTable`.
  - **Verificado con el servidor real, con datos reales de prueba** (no solo revisando que compile):
    el panel carga sin errores con datos escasos, cada sección muestra su estado vacío correcto
    cuando no hay datos suficientes (margen "—", "Pon precio a tus patrones...", etc.); se creó un
    pedido nuevo con canal "Instagram", se marcó pagado, y apareció correctamente en "Ventas por
    canal" (100% · $60K); se confirmó que la cuenta tejedora de prueba de la Fase 1 sigue viendo el
    inicio simple de siempre, sin ninguna fuga de dato financiero.
  - `npm run lint`/`test` (30/30, 15 pruebas nuevas de `analytics.ts`)/`build` pasan limpio. Casilla
    de la Fase 2 marcada en `docs/ROADMAP.md`, entrada en `docs/CHANGELOG.md`.
  - **Pendiente:** el pedido de prueba "Gorro canal-test" quedó en la base de datos real del usuario
    (dato de prueba, se puede borrar). Capacidad del taller real, tejedora asignada a pedido, "sin
    asignar", "reasignar automáticamente" y `sales_channels` con comisiones quedan para la Fase 3/4,
    como estaba documentado en el plan.

- **Fase 4 del roadmap Enterprise: recetario, costeo y simulador (día siguiente).** Antes de seguir,
  el usuario pidió explícitamente excluir las Fases 6 y 7 por ahora (anotado en `docs/ROADMAP.md` y
  `docs/pendientes.md`), luego pidió seguir con la Fase 4.
  - A diferencia de mockups anteriores, `Ent-Costeo.dc.html` trae la fórmula exacta en su
    `<script>` — se reprodujo a mano con los datos del criterio de aceptación (materiales 8.750,
    200 min, $12.000/h, 5% desgaste, canal directo, margen 40%) y dio exactamente $85.400 antes de
    escribir una sola línea de código, confirmando la fórmula sin adivinar nada:
    `neto = ceil((costo + fijo_canal) / (1 − margen − %comisión) / 100) × 100`.
  - **Decisiones de alcance:** se omitió la columna "Lote" de materiales (son lotes de inventario,
    `supply_lots`, un concepto explícito de la Fase 5 que no existe); "gastos fijos de la sede" para
    el punto de equilibrio se resolvió con un campo manual en el simulador, no un dato persistido
    (eso es más de Finanzas — Fase 6, ya excluida); "tiempo real por tejedora" sí se pudo calcular de
    verdad gracias a `timer_sessions.order_id` de la Fase 3 (solo cuentan sesiones vinculadas a un
    pedido, las sueltas de Recetario son para afinar la receta).
  - **Migración `0011`:** `sales_channels` (canales de venta configurables, con backfill de los 4
    del mockup) y `product_versions` (+ RPC `publish_product_version`). De paso se corrigió
    `create_tenant()`: los negocios nuevos no recibían la sede "Principal" — gap real de la Fase 1
    que solo se backfilleó para los tenants que existían en ese momento, nunca para los nuevos.
  - **`src/lib/costing.ts`:** `simulatorPrice()` (con prueba que verifica el valor exacto $85.400 del
    criterio de aceptación) y `averageSecondsPerPiece()`, con pruebas.
  - `CostingSimulator` nuevo conecta `ChoiceCard` y `Toggle`, construidos desde la Fase 0 y nunca
    usados hasta ahora.
  - **Bug real encontrado por la verificación con el servidor real, no por leer el código:** el
    switch de IVA tenía un `<button>` anidado dentro de otro `<button>` (HTML inválido), causando un
    error de hidratación de React que dejaba la pantalla trabada en el esqueleto de carga — se vio
    en una captura de Playwright, no en ninguna prueba automatizada ni en el build. Se corrigió
    cambiando el contenedor externo de `<button>` a `<div>`.
  - **Verificado de punta a punta:** el simulador con los datos reales de un patrón del usuario
    calculó exactamente lo mismo a mano ($15.800 con materiales $3.000, 30 min, $12.000/h, margen
    40%); "Publicar precio" creó la versión y, tras recargar la página, "Versión 1 · vigente" seguía
    ahí — confirma que quedó persistido de verdad, no solo en el estado del cliente.
  - El usuario pidió avanzar a la fase siguiente antes de pedir la verificación completa de esta —
    se hizo de todas formas una verificación real (no solo build/tests) porque fue así como se
    encontró el bug del `<button>` anidado; quedó resuelto antes de cerrar la fase.
  - `npm run lint`/`test` (49/49, +8 nuevas de `costing.ts`)/`build` pasan limpio. Casilla de la
    Fase 4 marcada en `docs/ROADMAP.md`, entrada en `docs/CHANGELOG.md`.

- **Fase 5 del roadmap Enterprise: inventario multisede (mismo día).** El usuario pidió la fase
  completa de una vez.
  - Antes de diseñar nada se revisó a fondo el esquema de `supplies`, porque esta fase toca el
    corazón del costeo. Dos hallazgos que cambiaron el plan para bien: `supplies.unit_cost` ya es una
    columna generada (`total_cost / quantity_purchased`), así que el costo promedio ponderado sale
    solo con que cada lote nuevo sume su cantidad y su valor al agregado — no hubo que tocar esa
    columna ni arriesgar nada que ya funcionaba; y `consume_order_supplies` (el trigger que descuenta
    insumos al enviar un pedido, desde el MVP) ya resolvía "consumir por pedido", así que no se tocó.
  - **Migración `0012`:** `suppliers`, `supply_lots` (historial de recepción, no fuente de verdad del
    stock), `purchase_orders`/`purchase_order_lines` (borrador→por_aprobar→en_tránsito→recibida),
    `stock_transfers`. RPCs `advance_purchase_order` y `complete_transfer` (`security definer`, cada
    una valida el rol internamente). Trigger `supplies_reorder_check`: al cruzar `low_stock_threshold`
    por debajo, crea una OC borrador automática si no hay ya una abierta para ese insumo.
  - `src/lib/inventory.ts` (`needsReorder`, `suggestTransfer`, `blockedOrders`) con 8 pruebas. `/insumos`
    extendido (no se creó `/inventario` nueva, mismo criterio de las Fases 2 y 3) con 4 KPIs y los
    paneles de Órdenes de compra y Transferir entre sedes.
  - **Bug real encontrado en la verificación con el servidor real:** el botón para avanzar una OC
    llamaba al server action directo desde un `onClick` sin `useTransition` — al avanzar dos estados
    seguidos, el segundo click todavía veía el `po.status` anterior (la revalidación no había llegado)
    y reenviaba la misma transición; el RPC la rechazaba (`No se puede pasar de por_aprobar a
    por_aprobar`) y el error quedaba sin capturar, como unhandled rejection. Se corrigió envolviendo
    `advance`/`applySuggestion` en `useTransition` (así la revalidación queda coordinada con la propia
    llamada) + `alert` en el catch, igual que ya hacía `deleteSupply`.
  - **Gap real encontrado:** `createSupplier` existía en `actions.ts` desde el plan pero no estaba
    conectado a ninguna UI — no había forma de crear un proveedor desde la app. Se agregó una sección
    "Proveedores" (lista + alta rápida) en el panel de Insumos, con el mismo patrón que
    `ChannelsSection` de Configuración.
  - **Verificado de punta a punta con datos reales, no solo build/tests:** se creó un proveedor, una
    OC de 50g de Lana café a $180/g, y se avanzó por los 4 estados — al llegar a "recibida" el costo
    pasó de $150/g a $160/g exacto (promedio ponderado: (15.000 + 9.000) / 150) y el stock subió a
    150g; se bajó el punto de reorden por debajo del stock actual y apareció automáticamente una OC
    borrador de 250g (`greatest(umbral·2 − restante, umbral)`); se transfirieron 30g de Principal a
    Bogotá y el stock se movió de verdad entre las dos filas de `supplies` ($160/g heredado en la fila
    nueva). La sugerencia de transferencia automática (`suggestTransfer`/`blockedOrders`) se dejó
    cubierta solo por las 8 pruebas unitarias — armar en vivo un pedido bloqueado por falta de insumo
    en una sede específica era desproporcionado frente a lo que ya prueban esos tests.
  - `npm run lint`/`test` (56/56, +8 nuevas de `inventory.ts`)/`build` pasan limpio. Casilla de la
    Fase 5 marcada en `docs/ROADMAP.md`, entrada en `docs/CHANGELOG.md`.

- **Fase 8 del roadmap Enterprise: móvil por rol y portal del cliente (mismo día).** Las Fases 6 y 7
  siguen excluidas, así que tocaba saltar directo de la 5 a la 8.
  - Antes de escribir código se investigó a fondo el esquema existente (agente Explore) para no
    reinventar nada: `product_steps` no existía (había que crearla); el cronómetro
    (`timer.tsx`/`TimerProvider`) y `OrderTimerButton` ya resolvían iniciar/pausar/parar, "Mi turno"
    solo necesitaba leer su estado; `ordersAtRisk` de `analytics.ts` servía tal cual para la alerta de
    riesgo de un solo pedido; `moveOrder`/`assignOrder`/`markPaid` de Pedidos ya cubrían "pasar a
    calidad"/"sumar apoyo"/"marcar pagado", solo había que reutilizarlos en la pantalla nueva.
  - **Tensión real encontrada:** los 3 mockups (`Ent-Movil-Turno`, `Ent-Movil-Pedido`, `Ent-Portal`)
    asumen anticipos y una pasarela de pago real (Wompi/PSE/Nequi) — exactamente lo que excluyen las
    Fases 6 y 7. Se le preguntó al usuario antes de inventar nada; eligió "saldo real sin pasarela":
    el saldo sale de verdad de `precio×cantidad − Σ transacciones de ingreso ligadas al pedido`
    (reutilizando `transactions.order_id`, que ya existía desde el MVP), y el botón de pago se volvió
    un link de WhatsApp con el monto prellenado — honesto sobre que no hay pasarela todavía.
  - **Migración `0013`:** `product_steps` + `order_step_progress` (esta última sin insert/update/
    delete directo, solo vía RPC `toggle_order_step`, mismo patrón que `supply_lots` de la Fase 5).
    `orders.tracking_token` (generado con `gen_random_uuid()`, no `gen_random_bytes` — ya documentado
    que pgcrypto no está en el `search_path` de las funciones `security definer` de este proyecto) y
    `orders.progress_photo_url`. RPC `get_order_tracking` (autoriza por token, no por sesión, mismo
    mecanismo que `accept_invitation`; proyecta solo los campos mínimos del mockup, nunca `select *`)
    y `get_order_balance`/`register_order_payment`. Bucket de Storage `avance`, mismo patrón que
    `logos`.
  - **Decisión de alcance deliberada:** no se construyó el bottom-nav de 4 pestañas del mockup para
    tejedora (Mi turno/Tareas/Patrones/Perfil) — se reutiliza el actual (Insumos/Recetario/Pedidos ya
    cubren "Patrones"/"Tareas"), mismo criterio de "evolucionar, no bifurcar" repetido toda la
    sesión. El Inicio de tejedora (antes compartía `SimpleHome` con Ventas) se separó en su propio
    `ShiftHome` ("Mi turno").
  - **Gap real encontrado:** `product_steps` no tenía ninguna UI para crearse — se agregó un editor
    simple de pasos en Recetario (lista + alta + borrado), mismo patrón que el gap de proveedores
    encontrado en la Fase 5.
  - **Bug real encontrado en la verificación con el servidor real:** el helper `revalidate()`
    compartido de `pedidos/actions.ts` solo llamaba `revalidatePath("/pedidos")`, que en Next.js NO
    revalida la ruta dinámica `/pedidos/[id]` — así que registrar un abono (o cualquier otra acción)
    desde el propio detalle de un pedido guardaba bien el dato en la base pero la pantalla se quedaba
    mostrando el saldo viejo hasta navegar a otra pantalla y volver. Se corrigió agregando
    `revalidatePath("/pedidos/[id]", "page")` al helper.
  - **Nota de proceso:** durante la verificación se encontraron varios pasos duplicados en el editor
    de Recetario (p. ej. "Orejas y bordado" dos veces) — resultó ser un artefacto de los propios
    scripts de prueba de Playwright (esperas insuficientes entre envíos de formulario, no un bug de
    la app): se confirmó reproduciendo cada paso por separado con esperas explícitas por el contenido
    esperado en pantalla, y se limpiaron los datos de prueba duplicados antes de seguir.
  - **Verificado de punta a punta con datos reales:** cronómetro corriendo + barra de meta reactiva +
    paso tildado sin interrumpir el cronómetro + foto de avance subida y persistida tras recargar, en
    "Mi turno" con la cuenta tejedora real; dos abonos reales ($20.000 y $10.000) sobre un pedido de
    $45.000 reflejados correctamente como saldo $15.000 en el detalle móvil; portal público abierto
    en un contexto de Playwright **sin `storageState`** (visitante anónimo real, sin cuenta HEBRA)
    mostrando el saldo exacto y nada más que los campos del mockup (sin costos, sin datos de otros
    pedidos); un token inválido devuelve 404 limpio.
  - `npm run lint`/`test` (64/64, +8 nuevas de `tracking.ts`)/`build` pasan limpio. Casilla de la
    Fase 8 marcada en `docs/ROADMAP.md`, entrada en `docs/CHANGELOG.md`.

- **Fase 6 del roadmap Enterprise: finanzas y facturación (día siguiente, 2026-10-12).** El usuario
  la había excluido el día anterior y la reinstaló explícitamente, con una condición clara: construir
  todo lo que se pueda en código y dejar el punto de conexión listo para cuando él cree la cuenta de
  un proveedor de facturación electrónica. Le pregunté qué proveedor (Alegra/Siigo/ninguno todavía) y
  eligió no construir ningún adaptador real por ahora — solo el punto de extensión.
  - Dos agentes Explore confirmaron varias cosas que cambiaron el plan para bien antes de escribir
    nada: el "saldo real" ya existía desde la Fase 8 (`get_order_balance`/`register_order_payment`),
    así que Fase 6 no debía crear una tabla `payments` nueva; el patrón de numeración de remisiones
    (`tenants.remission_seq` + función que incrementa y devuelve) era exactamente el patrón a repetir
    para facturas; `ventas` puede emitir documentos pero no ve `/caja` (gatea por `view_finance`, que
    `ventas` no tiene) — el patrón ya resuelto era `RemissionButton` en el Kanban, gateado por
    `issue_invoices`, así que "Emitir factura" debía seguir el mismo camino.
  - **Migración `0014`:** `customers.document_number` (NIT/cédula), `tenants.invoice_seq`, tabla
    `invoices` (RLS: owner/admin/ventas, mismo chequeo inline que ya usaba `create_remission`, no
    `has_role` que solo distingue owner/admin), RPC `reserve_invoice_number`.
  - **Decisión de alcance deliberada:** "gastos fijos" se modela como `transactions` con categoría
    "Gastos fijos" en vez de una tabla de gastos recurrentes nueva — reutiliza lo que ya existía.
    "Recordatorios de cobro" del mockup trae un solo botón "Enviar recordatorios (N)"; se cambió a un
    botón de WhatsApp por cliente pendiente, porque `wa.me` abre una conversación a la vez y los
    navegadores bloquean varios `window.open` seguidos desde el mismo clic — un botón "masivo" real
    no funcionaría, así que se prefirió lo honesto sobre lo que el mockup sugiere.
  - **Gap real encontrado en la verificación con el servidor real:** el desplegable de categoría del
    formulario rápido de gastos en Caja (`EXPENSE_CATEGORIES` en `quick-transaction.tsx`) no incluía
    "Gastos fijos" — la convención que la cascada de Finanzas necesitaba no era alcanzable desde
    ninguna pantalla. Se agregó la opción a la lista existente.
  - **Verificado de punta a punta con datos reales:** se completó el NIT de una clienta de prueba
    (Marcela Ríos) y se emitió una factura desde el botón nuevo del Kanban — quedó en `invoices` con
    estado `rechazada` y el mensaje real "La facturación electrónica aún no está configurada." (no un
    crash ni un estado inventado); "Reintentar" repitió el mismo flujo y mostró el mensaje inline
    correctamente. Se registró un gasto real con categoría "Gastos fijos" ($50.000) y la cascada bajó
    de $135K a $85K de utilidad neta (63,0% de margen) exactamente como corresponde. La cartera por
    antigüedad bucketeó bien el saldo pendiente real de $15.000 (del abono parcial de la Fase 8) en el
    tramo 0-15 días. El CSV exportado tuvo exactamente los movimientos del mes, incluido el gasto
    fijo y los dos abonos. Se confirmó que la cuenta `ventas` ve el botón "Factura" en el Kanban pero
    es redirigida fuera de `/finanzas` (mismo comportamiento que ya tenía `/caja`).
  - Bug cosmético encontrado y corregido: el selector de mes mostraba "Octubre De 2026" (la clase
    `capitalize` de Tailwind capitaliza cada palabra, no solo la primera) — se corrigió capitalizando
    manualmente solo la primera letra en JS.
  - `npm run lint`/`test` (74/74, +10 nuevas de `finance.ts`)/`build` pasan limpio. Casilla de la Fase
    6 marcada en `docs/ROADMAP.md`, entrada en `docs/CHANGELOG.md`.

- **Mejora fuera del roadmap: cuenta de usuario, sidebar y ayuda por rol (mismo día).** El usuario
  preguntó cómo se edita el nombre que aparece en el sidebar; investigar la respuesta destapó un gap
  real: `LogoutButton` solo vivía dentro de `/configuracion`, bloqueada para `ventas`/`tejedora` — esos
  dos roles **no tenían ninguna forma de cerrar sesión**, ni en escritorio ni en celular (el `TopBar`
  con el selector de sede también está oculto en celular, `hidden md:flex`, así que no había ningún
  punto de acceso a la cuenta fuera del sidebar de escritorio).
  - **`AccountMenu`** (`src/components/account-menu.tsx`, nuevo): hoja con avatar, formulario para
    editar el propio nombre (`src/app/(app)/account-actions.ts`, `supabase.auth.updateUser`), link a
    "Ayuda" y `LogoutButton` — accesible para cualquier rol. Se monta en dos sitios: el bloque de
    usuario del sidebar de escritorio (`AppSidebar`) y un botón flotante nuevo arriba a la derecha en
    celular (`TopBar`, que antes era 100% `hidden md:flex` — ahora el botón de cuenta vive fuera de
    ese bloque, visible siempre).
  - **Bug encontrado y corregido en el mismo cambio:** el ícono de engranaje que ya existía en el
    encabezado móvil de Inicio (`SimpleHome` y `ShiftHome`) enlazaba a `/configuracion` — roto para
    ventas/tejedora (redirige a Inicio) y ahora además quedaba tapado/duplicado por el nuevo botón de
    cuenta. Se quitó de ambos archivos.
  - **Etiqueta de rol más neutra:** "Propietaria" (femenino fijo, igual que el mockup, que asume una
    dueña mujer) se cambió a "Titular" en `src/lib/roles.ts` — el usuario pidió explícitamente que no
    asumiera el género del dueño del negocio.
  - **`Tooltip`** (`src/components/ui/tooltip.tsx`, nuevo): CSS puro, sin JS, con foco de teclado
    además de hover. Conectado al botón de cuenta (sidebar y celular) y a la campana de notificaciones
    del `TopBar`; queda disponible para reutilizar en otros controles de solo ícono.
  - **Sidebar más pulido:** indicador de ítem activo (barra de color a la izquierda, antes solo el
    fondo cambiaba), el círculo de usuario pasó de iniciales planas a reutilizar el componente
    `Avatar` compartido (mismo color por persona en toda la app), nuevo ítem "Ayuda" visible para
    todos los roles (no solo administración).
  - **`/ayuda`** (nuevo, dentro de `(app)` pero sin gatear por `view_finance`): guía por rol con
    secciones plegables (`<details>`), contenido real y específico de las pantallas que cada rol
    puede ver — no un texto genérico. Tejedora ve "Tu cuenta" + "Mi turno"; Ventas ve "Tu cuenta" +
    "Pedidos" + "Clientes"; Administración/Titular ve las 9 secciones completas.
  - **Verificado de punta a punta con las 3 cuentas de rol:** se cambió el nombre del propietario de
    "QA Visual" a "Ana Owner QA" y se confirmó que se propaga al saludo y al sidebar tras recargar
    (persistido de verdad en Supabase Auth, no solo en el estado del cliente); se cerró sesión desde
    la cuenta tejedora y terminó en `/login` — antes era imposible; `/ayuda` mostró el contenido
    correcto para cada uno de los 3 roles probados; el tooltip de la campana apareció correctamente
    al pasar el mouse.
  - `npm run lint`/`test` (74/74)/`build` pasan limpio.

- **Continuación: auditoría completa de experiencia de usuario (mismo día).** El usuario reportó no
  ver los cambios de cuenta/sidebar — resultó ser caché del service worker, pero pidió de paso una
  revisión completa de la experiencia de usuario. Se recorrió la app con Playwright como los 3 roles
  (owner/ventas/tejedora), en escritorio y celular, sobre las pantallas principales. Encontró 3
  problemas reales, no cosméticos:
  - **Fuga de costos a roles sin `view_costs` (serio, pre-existente desde antes de esta sesión):**
    `/insumos` nunca filtraba por rol — ni al leer (`select("*")` sin gating, a diferencia de
    Recetario que sí lo hacía desde la Fase 0) ni al escribir (`saveSupply`/`deleteSupply` en
    `insumos/actions.ts` no tenían ningún chequeo de permiso, cualquier tejedora podía crear/editar/
    borrar insumos con su costo). Corregido: `saveSupply`/`deleteSupply` ahora exigen
    `canFully(role, "edit_recipes")`; `insumos/page.tsx` sigue trayendo la fila completa de la base
    (evita el límite de Supabase de que el string de `.select()` sea literal para poder tipar
    condicionalmente) pero **sanitiza `unit_cost`/`total_cost` a 0 antes de pasarlos como prop al
    componente cliente**, así el dato real nunca llega al navegador; `SuppliesView` ahora oculta
    costo unitario, "Compra: $X", el KPI "Valor del inventario", el monto de "Órdenes de compra
    abiertas", el tip "Así calcula HEBRA tu costo", "+ Nueva compra" y el panel de Órdenes de
    compra/Transferencias completo para quien no tiene `view_costs` — queda una vista de solo stock,
    igual de honesta que `RecipeViewer` en Recetario. De paso, el subtítulo de Recetario ("con su
    costo real...") también prometía algo que esos roles no ven — se volvió condicional.
  - **Navegación móvil incompleta (gap real, no solo de esta sesión):** `TopBar` (con el selector de
    sede) y `AppSidebar` son ambos `hidden md:flex` — exclusivamente de escritorio. La barra inferior
    (`BottomNav`) nunca incluyó "Clientes" (crítico para `ventas`, cuyo trabajo diario depende de
    eso), y tampoco "Caja"/"Finanzas"/"Analítica"/"Configuración" para administración — en celular,
    el dueño del negocio no tenía ninguna forma de llegar a Finanzas o Configuración. Se rediseñó
    `BottomNav`: 4 ítems fijos (Inicio/Insumos/Recetario/Pedidos) + un quinto "Más" que abre una hoja
    con el resto (Clientes, Caja/Finanzas/Analítica/Configuración si el rol tiene `view_finance`,
    Ayuda) — mismo criterio de "nunca dejar una pantalla sin punto de entrada en celular" que ya
    estableció el `AccountMenu` flotante.
  - **Botón de cronómetro visible para quien no tiene `use_timer`:** `HomeActions` (acciones rápidas
    de Inicio) mostraba "Iniciar cronómetro" a cualquier rol, sin chequear `canFully(role,
    "use_timer")` — `ventas` (que no tiene ese permiso) podía iniciar y correr el cronómetro
    normalmente, pero al intentar guardarlo `logTimerSession` lo rechazaba en el servidor, dejando la
    sesión atascada en la cola de pendientes para siempre, sin ningún aviso. Se agregó el chequeo: sin
    `use_timer`, Inicio solo muestra "Registrar venta" (ancho completo en vez de 2 columnas).
  - **Verificado de punta a punta con las 3 cuentas de rol:** Insumos sin ningún $ visible para
    tejedora, sin regresión para administración; el menú "Más" mostró exactamente los ítems
    correctos para `ventas` (Clientes + Ayuda) y para administración (Clientes, Caja, Finanzas,
    Analítica, Configuración, Ayuda); Inicio de `ventas` ya no ofrece el cronómetro.
  - **Nota de proceso:** el archivo de sesión de Playwright para tejedora había quedado inválido por
    la prueba de logout de la tanda anterior — se detectó por screenshots idénticos (misma pantalla
    de login repetida) y se resolvió decodificando el JWT de la cookie vieja para recuperar el correo
    y volver a iniciar sesión, guardando un `storageState` fresco.

- **Continuación: cancelación de pedidos con devolución justa, "Bloqueado" en el tablero y menú "⋯"
  en la tarjeta (mismo día).** El usuario comparó el mockup de Producción contra el Kanban real y
  encontró 3 brechas, pedidas en orden de más a menos complejas: no había forma de cancelar un
  pedido con devolución real (`deleteOrder` solo borraba, sin registrar nada en Caja); el mockup
  muestra un badge "Bloqueado" para pedidos sin insumos, ausente del tablero real; y la tarjeta real
  acumuló hasta 6 botones (más alta que el mockup). Sobre la devolución, el usuario fue explícito:
  reembolso automático pero **justo** — si ya hay tiempo real de trabajo registrado, ese tiempo no se
  devuelve, porque ya es esfuerzo de quien teje.
  - **Migración `0015`** (sin tocar el enum `order_status` — ya documentado el riesgo de `ALTER TYPE
    ... ADD VALUE` en la misma transacción que su uso): `orders.cancelled_at`/`cancel_reason`/
    `refund_amount`, nullable, ortogonales al estado. RPC `cancel_order` (`security definer`, mismo
    patrón que `mark_order_paid`/`reserve_invoice_number`): chequeo inline de rol (owner/admin/
    ventas), rechaza pedidos ya `enviado` o ya cancelados, valida `0 ≤ monto ≤ pagado` en el
    servidor, y si el monto es mayor a 0 inserta una `transactions` nueva (`gasto`, categoría
    "Devolución") — la venta original nunca se borra ni se edita, queda el historial completo.
  - **Devolución justa, basada en datos reales:** `suggestedRefund()` en `src/lib/finance.ts` —
    `máx(0, total pagado − costo real de las horas ya logueadas)`, usando `timer_sessions` del pedido
    y `laborCost()` (ya existía). No se descuenta un estimado de materiales (HEBRA no rastrea consumo
    parcial, así que inventar ese número sería adivinar). El monto queda editable antes de confirmar.
    Bug encontrado y corregido en la propia verificación: sin redondear, el campo mostraba
    `29986.666666666668` en vez de un peso entero — se envolvió el resultado en `Math.round()`.
  - **"Bloqueado" en el tablero:** sin consultas nuevas — reutiliza `outOfStockByProduct`, que
    `pedidos/page.tsx` ya calculaba para el filtro "En riesgo" y nunca se pintaba en la tarjeta. Chip
    `danger` junto al badge de fecha, con `Tooltip` (ya existía) mostrando el insumo agotado.
  - **Tarjeta reorganizada:** quedan siempre visibles Cronómetro (si aplica), "Detalle", "Cancelar"
    (si no está cancelado y el estado no es enviado) y "Avanzar estado"; WhatsApp/Remisión/Factura se
    agruparon detrás de un botón "⋯" que abre una hoja — mismo patrón del "Más" del `BottomNav`.
  - **Pestaña nueva "Cancelados"** en el tablero (mismo patrón del toggle Tablero/Capacidad): lista
    de solo lectura con motivo, fecha y monto devuelto. El tablero activo excluye
    `cancelled_at is not null` en la consulta principal.
  - **Fuera de esta fase, a propósito:** cancelar un pedido ya `enviado` (requeriría inventario de
    producto terminado, que HEBRA no tiene); descuento automático de materiales en la devolución (sin
    dato real de consumo parcial que lo respalde); penalidades configurables (el monto editable a
    mano cubre ese caso).
  - **Verificado de punta a punta con datos reales:** un pedido sin tiempo logueado sugirió devolución
    del 100% (`$60.000`, caso probado desde `/pedidos/[id]` con la cuenta `ventas`); un pedido con
    ~4 segundos de cronómetro real vinculado sugirió `$29.987` sobre `$30.000` pagados (el descuento
    exacto de esa mano de obra); al confirmar, apareció la `transactions` "Devolución" en Caja
    (`−$29.987`, Balance recalculado a `$55.013`), el pedido salió del tablero activo y apareció en
    "Cancelados · 1" con motivo y fecha correctos; `ventas` ve el botón "Cancelar" en cada tarjeta,
    `tejedora` no. El badge "Bloqueado" se verificó por código (línea por línea en `board.tsx` y
    `pedidos/page.tsx`) — no se forzó un insumo a cero en los datos de prueba porque la única forma de
    lograrlo es enviar un pedido real a `'enviado'`, acción irreversible que habría alterado el
    inventario de prueba solo para ver un chip condicional ya probado en el mismo componente
    (`Tooltip`) y con el mismo dato (`outOfStockByProduct`) para el filtro "En riesgo".
  - `npm run lint`/`test` (78/78, +4 nuevas de `suggestedRefund`)/`build` pasan limpio.

- **Auditoría mockup-vs-real en el resto de la app, Fase 1: Equipo (2026-10-13).** El usuario pidió
  repetir, para las 8 pantallas restantes, la misma comparación mockup-vs-real ya hecha en
  Pedidos/Producción. Se delegó en 8 agentes de solo lectura (uno por `docs/mockups/*.dc.html`
  contra su pantalla real) que devolvieron hallazgos priorizados con citas de línea. El usuario
  aprobó implementar todo, de más a menos complejo (plan guardado en
  `C:\Users\T460s\.claude\plans\smooth-riding-phoenix.md`), empezando por Equipo/Configuración —
  la brecha más profunda de las 8: faltaban 2 de las 4 pestañas que define
  `Ent-Equipo.dc.html` ("Integraciones" y "Plan y seguridad").
  - Dos decisiones de alcance confirmadas con el usuario antes de construir, para no inventar
    datos/estados falsos (mismo criterio que la facturación electrónica real de la Fase 6):
    **Integraciones** se construye como catálogo de 9 conectores en estado real "No conectada
    todavía" (sin fingir un "Conectado"); **Plan y seguridad** muestra conteos reales de uso
    (miembros/sedes/facturas del mes) en vez de un cupo de plan inventado, y **sin** los 4 toggles
    de seguridad del mockup (SSO/2FA obligatoria/restricción por IP/aprobación de exportaciones)
    porque un toggle que no aplica nada de verdad da una falsa sensación de seguridad.
  - Migración `0016`: `list_members` (RPC `security definer` ya existente) ahora también devuelve
    `last_sign_in_at` (de `auth.users`) y `two_factor_enabled` (`exists` sobre
    `auth.mfa_factors` con `status='verified'`) — ambos datos reales, mismo patrón ya usado para
    leer `auth.users.email`.
  - Nuevo `src/lib/format.ts`: `relativeTime()` ("Hace 12 min"/"Hace 3 h"/"Hace 5 días"), reutilizado
    en la columna "Último acceso" de `member-row.tsx`.
  - Nuevo `integrations-section.tsx`: WhatsApp Business, Instagram Shopping, Wompi, Coordinadora,
    Shopify, Siigo, Alegra, Google Drive, API y webhooks — cada tarjeta con botón "Próximamente"
    deshabilitado, documentando el punto de conexión futuro sin fingir que ya funciona.
  - Nuevo `plan-section.tsx`: 3 conteos reales (miembros/sedes/facturas generadas este mes, esta
    última vía una consulta nueva a `invoices` filtrada por el mes en curso) + `ActivitySection`
    movida aquí dentro (como en el mockup), con botón nuevo "Exportar CSV" (mismo patrón que
    `export-csv-button.tsx` de Finanzas).
  - Terminología: se mantuvo "Titular" (no se revirtió a "Propietaria" del mockup) — decisión
    explícita de una sesión anterior, no un error a corregir.
  - **Verificado de punta a punta con datos reales:** las 4 pestañas renderizan correctamente; la
    tabla de miembros muestra "Hace 2 días"/"Hace 19 h" (tiempo relativo real) y "2FA pendiente"
    para las 3 cuentas de prueba (ninguna tiene 2FA activo, dato honesto); Integraciones muestra
    las 9 tarjetas con "No conectada"; Plan muestra "3 miembros · 2 sedes · 1 factura generada este
    mes" (conteos reales, no inventados) y la actividad con el botón de exportar CSV.
  - `npm run lint`/`test` (78/78)/`build` pasan limpio.

- **Auditoría mockup-vs-real, Fase 2: Analítica (2026-10-13).** El plan aprobado para esta fase era
  mover el `ExecutivePanel` de `/inicio` a `/analitica` (el mockup `Ent-Dashboard.dc.html` y el
  propio nav lo ubican ahí, no en Inicio). A mitad de implementación el usuario corrigió: **no se
  puede modificar el panel de Inicio**, punto. Se revirtió el cambio en `inicio/page.tsx` (`git
  checkout`, limpio) y, preguntando de nuevo con `AskUserQuestion` cómo seguir, se eligió la opción
  de dejar `/analitica` como una **copia fiel** del mismo contenido en vez de un movimiento — ambas
  pantallas muestran el mismo panel para Titular/Administración.
  - `analitica/page.tsx` reescrita completa con el contenido de `ExecutivePanel` (KPIs, gráfico de
    ingresos/utilidad, paneles de riesgo/rentabilidad/canales/inventario), gateada igual que antes
    (`canFully(role, "view_finance")`, redirige a `/inicio` si no).
  - Se agregaron las 2 acciones del mockup que faltaban, **sin inventar lógica nueva**: encontrado
    que `suggestReassignment()`/`applySuggestion()` (Fase 3, `src/lib/production.ts`) y el flujo de
    órdenes de compra de Insumos ya resuelven exactamente lo que el mockup pedía con
    "Reasignar automáticamente" y "Crear orden de compra" — solo faltaba el punto de entrada desde
    Analítica. Se agregó soporte de deep-link `?view=capacity` en `pedidos/board.tsx`
    (`useSearchParams` siembra el estado inicial de la vista) para que "Reasignar
    automáticamente" enlace directo a la vista Capacidad real, en vez de duplicar la heurística.
  - **Verificado de punta a punta:** `/inicio` sigue mostrando el panel ejecutivo sin cambios;
    `/analitica` muestra el mismo panel más los 2 botones nuevos; `/pedidos?view=capacity` abre
    directo en la pestaña Capacidad con una sugerencia real ("Mover el pedido Amigurumi Osito
    (0,5 h) de qa.visual... a qa.tejedora... equilibra la semana", botón "Aplicar cambio"
    funcional); `ventas` sigue siendo redirigida de `/analitica` a `/inicio`.
  - `npm run lint`/`test` (78/78)/`build` pasan limpio.

- **Auditoría mockup-vs-real, Fase 3: Insumos → Inventario (2026-10-13).** Hallazgo clave
  confirmado al leer `supabase/migrations/0001_hebra_schema.sql` y `0012_inventario.sql` antes de
  tocar nada: `supplies` ya es por-lote-por-sede desde el MVP (`brand`/`lot_color`/`location_id`/
  `quantity_remaining`/`quantity_purchased`/`total_cost`/`low_stock_threshold` por fila) — no hizo
  falta ninguna migración nueva, la brecha con `Ent-Inventario.dc.html` era 100% de presentación
  (tarjetas por insumo vs. tabla por lote).
  - `supplies-view.tsx` reescrita: tabla (`DataTable`) con columnas Insumo, Sede (solo visible
    cuando el selector global está en "Todas las sedes" — confirmado que esa consulta ya devuelve
    todos los lotes sin filtrar cuando `activeLocationId` es `null`, cero consultas nuevas), Lote
    (de `brand`/`lot_color`), Stock vs. reorden, Costo u., Valor, Estado.
  - Estado de 3 niveles (Agotado/Reordenar/Disponible, calculado de `quantity_remaining` vs.
    `low_stock_threshold`) reemplaza el booleano "por agotarse" que tenía antes.
  - `ProgressBar` (`src/components/ui/progress-bar.tsx`) ganó un prop opcional `markerPct` — línea
    vertical fija marcando el punto de reorden exacto (% = stock / (mínimo×2), con el mínimo al
    50%), mismo criterio visual del mockup. Opcional y sin valor por defecto, no rompe ningún otro
    uso del componente (Finanzas, Analítica, Recetario).
  - Botón renombrado "Nueva compra" → "Registrar compra" (texto del mockup).
  - **Bug real encontrado en el propio proceso de verificación visual, no solo desajuste de
    mockup:** el componente compartido `DataTable` no tenía ningún padding horizontal entre
    columnas — en la tabla nueva de Insumos, "Valor" y "Estado" se veían pegados como una sola
    palabra "ValorEstado". Revisando el mismo componente en Analítica/Inicio (tabla "Rentabilidad
    por producto") se confirmó el mismo bug ahí también ("CostoMargen"), pasado por alto en la
    verificación visual de la Fase 2 porque es sutil con pocas columnas. Corregido con `px-2
    first:pl-0 last:pr-0` en el propio `data-table.tsx` — arregla ambas pantallas a la vez.
  - **Nota de proceso, bug falso detectado y descartado:** al verificar el selector de sede con
    Playwright, una primera prueba pareció mostrar que cambiar a "Principal" no filtraba la tabla
    (seguían apareciendo lotes de Bogotá). Antes de reportarlo como bug, se depuró con
    `waitForResponse` + inspección directa de la cookie `hebra_location` — confirmó que el flujo
    real (`<select>` → `form.requestSubmit()` → server action → cookie → refetch) sí funciona
    correctamente; las primeras capturas solo fueron tomadas antes de que la transición terminara
    de asentarse. Con una espera adecuada, el filtro por sede funciona perfecto: 1 fila, columna
    "Sede" oculta, KPIs recalculados.
  - **Fuera de esta fase, a propósito (documentado, no inventado):** KPI "Rotación promedio" — no
    hay ningún dato histórico de consumo por período en el esquema, solo una foto del stock actual,
    así que inventar esa cifra sería adivinar; botón "Revisar" y campo de fecha estimada (ETA) en
    órdenes de compra; mover "Transferir entre sedes" al encabezado de la página (se queda donde ya
    funciona, dentro del panel de compras, para no duplicar el punto de entrada ni la lógica).
  - **Verificado de punta a punta:** tabla correcta para `owner` con "Todas las sedes" (columna
    Sede visible, 2 filas, chips "Reordenar"); tabla filtrada a 1 fila sin columna Sede al elegir
    "Principal"; `tejedora` ve la tabla sin columnas de costo y sin botón "Registrar compra"
    (filas no clicables); el sheet de edición sigue abriendo y guardando igual que antes.
  - `npm run lint`/`test` (78/78)/`build` pasan limpio.

- **Auditoría mockup-vs-real, Fase 4: Recetario → Costeo (2026-10-13).**
  - **Bug real corregido (no solo desajuste de mockup):** `recipe-editor.tsx`, sección "Tiempo real
    por tejedora" — el % de ancho de la barra se calculaba como `fastest.avgSeconds /
    p.avgSeconds`, lo que hacía que la persona MÁS RÁPIDA llenara la barra al 100% y las demás
    proporcionalmente menos. Invertido a `p.avgSeconds / slowest.avgSeconds` (la más lenta al
    100%), que es la lectura visual correcta y la que usa el mockup.
  - Nueva acción `duplicateProduct` (`recetario/actions.ts`) + botón "Duplicar como variante" en el
    encabezado del editor: clona nombre/categoría/notas/tiempo/margen/precio del producto y sus
    líneas de `product_supplies`, redirige al nuevo patrón (mismo patrón de `createProduct`).
  - **Segundo bug real, encontrado verificando el primero:** el primer intento de
    `duplicateProduct` sí creaba el producto copia pero dejaba la receta vacía — el insert a
    `product_supplies` no incluía `tenant_id` (columna requerida ahí, confirmado comparando con
    `upsertRecipeLine` que sí la manda) y el `error` de ese insert no se estaba revisando en
    absoluto, así que la falla era completamente silenciosa: la UI mostraba "Duplicando…" y
    redirigía con normalidad, sin ningún indicio de que la receta no se había copiado. Se detectó
    solo porque el simulador de precio de la copia mostraba "Materiales $0" en vez de $3.200.
    Corregido: se agrega `tenant_id: tenant.id` a cada línea y se revisa `linesError`, lanzando
    "El patrón se duplicó, pero no se pudieron copiar sus insumos." si falla — verificado de nuevo,
    ahora la copia trae la receta completa y el mismo precio sugerido que el original ($16.100).
  - **Fuera de esta fase, a propósito:** mover "Publicar precio" al encabezado (ya vive en el panel
    lateral `sticky`, visible todo el tiempo al hacer scroll — mover solo la posición no mejora
    nada real y arriesga romper el estado del simulador); persistir "Gastos fijos de la sede" como
    dato real del negocio (hoy es un input manual no guardado — requeriría un campo nuevo en
    `tenants`/`locations`, se queda pendiente); SKU (no existe en el modelo de `products` todavía).
  - **Nota de proceso:** se crearon 2 patrones de prueba ("Amigurumi Osito (copia)") durante la
    verificación de `duplicateProduct` (uno antes del fix, con receta vacía; uno después, correcto)
    — ambos se eliminaron al cerrar la fase para no dejar basura de prueba en el tenant QA.
  - `npm run lint`/`test` (78/78)/`build` pasan limpio.

- **Logo nuevo, pantalla de inicio pública y política de privacidad (2026-10-13).** El usuario pidió
  cambiar el logo del software (compartió una imagen) y agregar una pantalla de inicio que no fuera
  solo el login, con tratamiento de datos/privacidad — aclarando que HEBRA es de uso privado de un
  cliente, no un servicio público, así que el texto legal debía reflejar eso y no un ToS genérico
  de SaaS masivo.
  - **Problema técnico real encontrado antes de tocar nada:** el archivo del logo era un `.jpg`
    (`Format24bppRgb`, confirmado con `System.Drawing`), sin canal alfa — el cuadriculado de
    "fondo transparente" que se veía era un patrón pintado en los píxeles, no transparencia real.
    Usarlo tal cual habría dejado ese cuadriculado visible como parte del logo. Se confirmó con el
    usuario (`AskUserQuestion`) antes de intentar arreglarlo automáticamente en vez de asumir.
  - **Recorte cromático con despill, no solo binario:** primer intento (corte binario por
    saturación/brillo) dejó un halo rosado visible en los bordes curvos del símbolo a resolución
    completa. Se mejoró a una matting real: banda de transición con alpha proporcional a la
    saturación + recuperación del color de primer plano (fórmula `fg = bg + (observado-bg)/alpha`,
    asumiendo fondo ~RGB(236,236,236), el promedio real de las 2 celdas del cuadriculado medidas
    con `GetPixel`). El halo que persiste a 1365px es imperceptible una vez reducido a tamaño real
    de ícono (192px/64px, verificado visualmente) — verificado en vivo antes de darlo por bueno.
  - Set completo generado con `System.Drawing` (sin dependencias npm nuevas): `icon-192.png`/
    `icon-512.png` (transparentes), `icon-maskable-512.png` (fondo crema `#F8F5EF`, símbolo al 62%
    para la zona segura de íconos maskable), `apple-touch-icon.png` (180px, fondo crema — iOS no
    maneja bien transparencia). Master sin comprimir en `public/brand/hebra-mark.png`.
  - `Logo` (`src/components/icons.tsx`) pasó de un SVG placeholder (círculo + trazo) a `<img
    src="/icons/icon-512.png">` — se propaga solo a login/404/error/offline/bienvenida/invitación/
    portal de seguimiento (como *fallback* cuando el negocio no subió su propio logo, nunca
    reemplazando el logo real de un negocio).
  - **Nueva portada pública** (`src/app/page.tsx`, antes un `redirect("/inicio")` ciego):
    ahora revisa sesión con una consulta liviana (`supabase.auth.getUser()`, no `getSession()`
    completo, que fuerza redirect a `/login`) — con sesión redirige a `/inicio` como antes; sin
    sesión muestra encabezado + hero + 4 tarjetas de función (Insumos/Recetario/Pedidos/Caja) + pie
    con enlace a `/privacidad`. CTA principal "Iniciar sesión"; CTA secundaria "Tengo una
    invitación" hacia `/registro` (deliberadamente no "Regístrate gratis", coherente con que no es
    un servicio público).
  - **Nueva `/privacidad`**: tratamiento de datos encuadrado en Ley 1581 de 2012/Decreto 1377 de
    2013 (Habeas Data Colombia), aclarando que HEBRA es *encargado* del tratamiento y el negocio
    titular es *responsable*; cubre qué se recopila (cuenta de equipo, operación del negocio,
    clientes finales del negocio, datos técnicos de acceso/2FA), para qué se usa, dónde se
    almacena (Supabase + RLS) y derechos del titular. Enlazada desde el pie de la portada y desde
    `/registro` (nueva línea de consentimiento antes del botón de crear cuenta).
  - **Bug real encontrado en la propia verificación en vivo:** `src/proxy.ts` (middleware) redirige
    a `/login` cualquier ruta no listada en `PUBLIC_PATHS` cuando no hay sesión — `/` y
    `/privacidad` no estaban en esa lista, así que la portada nueva nunca se habría mostrado en la
    práctica (se habría visto siempre el login, exactamente el problema original que se pedía
    resolver). Corregido: se agregó `/privacidad` a `PUBLIC_PATHS` y se cambió la comparación de
    `/` a coincidencia exacta en vez de `startsWith` (que habría hecho público todo el sitio por
    error, ya que toda ruta empieza con `/`).
  - **Verificado de punta a punta:** `/` sin sesión muestra la portada completa; `/` con sesión
    (cuenta owner) redirige correctamente a `/inicio`; `/privacidad` renderiza las 8 secciones;
    `/login`, `/offline`, `/registro` muestran el logo nuevo sin errores de consola.
  - `npm run lint`/`test` (78/78)/`build` pasan limpio.

- **Rediseño premium de portada, login y registro (2026-10-13).** Ronda de ajustes rápidos sobre el
  trabajo de logo/portada anterior, varios pedidos sueltos del usuario en la misma sesión:
  - Quitar de `/privacidad` cualquier mención de tecnología específica (el usuario fue explícito:
    "ni Supabase ni ninguna otra") — la sección 5 ahora describe las protecciones en términos
    neutros (controles de acceso por negocio, autenticación por cuenta) sin nombrar infraestructura.
  - Pie de página de la portada: "Software de uso privado — no es un servicio público de
    autorregistro abierto" (tono defensivo, explicando qué NO es) → "Software de uso privado." →
    finalmente "Software de gestión." (2 iteraciones pedidas por el usuario). Se agregó una línea
    "Hecho por Jormelia Soft" enlazada a jormeliasoft.com.
  - El usuario preguntó "¿ya se ve enterprise?" — en vez de asumir, se le preguntó qué significaba
    eso en este contexto (¿más producción/pulido, o un lenguaje visual corporativo distinto?) dado
    que "Enterprise" ya es el nombre de esta fase del proyecto (prefijo `Ent-` en todos los
    mockups) y cambiar a una paleta azul/gris genérica rompería la identidad cálida que ya tiene
    toda la app. El usuario pidió la recomendación: más producción/pulido manteniendo la identidad
    de marca (terracota/crema/Fraunces), no un cambio de lenguaje visual.
  - **Portada (`src/app/page.tsx`) reescrita** con ese criterio: hero con tarjeta ilustrativa del
    costeo real (mismo patrón visual del simulador de precio real de Recetario — stack de barras +
    desglose Materiales/Mano de obra/Desgaste/Utilidad —, claramente etiquetada "Ejemplo" para no
    presentar un dato inventado como real), fondo con manchas de degradado suave en los tonos de
    marca, flujo numerado de 4 pasos conectado con `ThreadLine`, tarjetas de función con hover, y
    una banda oscura (`bg-night`, mismo tono que las tarjetas de cronómetro/simulador en el resto
    de la app) con la CTA final.
  - **`(auth)/layout.tsx`** (compartido por login y registro): mismo fondo con degradados; logo
    ahora enlaza a `/`; se quitó la tagline para ahorrar espacio vertical; el contenedor pasó de
    `max-w-sm` a `max-w-md`.
  - **Registro tenía scroll vertical innecesario** (el usuario lo señaló explícitamente): el
    formulario apilaba 5 campos en una sola columna. Se reorganizó en pares de 2 columnas (Tu
    nombre/Correo, Nombre del negocio/Qué haces) dejando Contraseña sola — verificado que a
    390×844 (viewport móvil real) el `scrollHeight` del body quedó exactamente igual a la altura
    del viewport (844px): cero scroll, antes tenía scroll visible.
  - `npm run lint`/`test` (78/78)/`build` pasan limpio.

- **Pulido final de portada y autenticación (2026-10-13).** Dos pedidos puntuales de UX sobre el
  trabajo anterior:
  - "No hay un enlace al inicio ni desde login ni desde registro" — el logo del layout de auth ya
    enlazaba a `/`, pero no era obvio como enlace. Se agregó un "← Inicio" explícito (mismo patrón
    `IconBack` que ya usa `/privacidad`) arriba a la izquierda, además de mantener el logo clicable.
  - "Las 4 cards se ven genéricas, dale sombra a los títulos" — se les dio identidad propia:
    `TONE_STYLES` mapea cada función a un acento de color ya existente en la paleta (primary/
    success/warning), con una barra de 1px arriba de la tarjeta y el ícono en ese tono; "Caja y
    finanzas" rompe el patrón con una tarjeta oscura (`bg-night`) en vez de un cuarto tono —
    variedad visual sin inventar un color nuevo fuera del sistema. Cada tarjeta ganó un detalle
    corto en mayúsculas (ej. "POR SEDE Y POR LOTE") y una numeración "01–04" en la esquina. Los
    títulos principales (`h1` del hero, ambos `h2` de sección) ganaron `text-shadow` sutil —
    cálido sobre fondo claro, oscuro sobre las bandas `bg-night` — vía `style` inline (Tailwind no
    trae utilidad de text-shadow en este proyecto).
  - Verificado en escritorio y móvil (390×844): acentos de color visibles, tarjeta oscura
    diferenciada, enlace "Inicio" funcional desde login (confirmado con `waitForURL`, el primer
    intento de prueba dio un falso negativo por una condición de carrera en el script, no un bug
    real de la app).
  - `npm run lint`/`test` (78/78)/`build` pasan limpio.

- **Mostrar contraseña y validación de complejidad (2026-10-13).** El usuario pidió, en sus
  palabras, "la opción del ojo de ver contraseña" y algo que avise "que debe tener mínimo un
  número, letra en mayúscula, un carácter especial" — un checklist de requisitos de contraseña.
  - Reglas centralizadas en `src/lib/password.ts` (`PASSWORD_RULES` + `passwordMeetsAllRules`),
    con prueba nueva (`password.test.ts`, 5 casos) — un solo lugar para que el checklist visual y
    la validación del servidor nunca puedan desincronizarse.
  - `IconEye`/`IconEyeOff` nuevos en `icons.tsx`; `PasswordInput` (`src/components/
    password-input.tsx`) envuelve el input con un botón de mostrar/ocultar, soporta uso controlado
    (con `value`/`onChange`, para que el checklist pueda leer el valor en vivo) o sin controlar.
  - `PasswordStrength` (`src/components/password-strength.tsx`): checklist en vivo mientras no se
    cumplen todas las reglas (cada ítem en gris con punto, o verde con check al cumplirse), y una
    sola línea verde "Contraseña segura" una vez que se cumple todo — para no dejar una lista de 4
    checks verdes ocupando espacio permanentemente.
  - **Decisión de alcance, no pedida explícitamente pero necesaria:** el ojo se agregó tanto a
    login como a registro (pedido correcto, útil en cualquier campo de contraseña), pero el
    checklist de complejidad **solo en registro** — exigir complejidad al iniciar sesión no tendría
    sentido, bloquearía a cuentas existentes cuya contraseña es válida pero fue creada antes de
    esta regla.
  - `signUp` (`src/app/(auth)/actions.ts`) reemplazó su único chequeo (`password.length < 8`) por
    `passwordMeetsAllRules()` — la validación real nunca depende solo de lo que valide el
    navegador.
  - **Verificado en vivo:** login con el ojo mostrando/ocultando el texto correctamente; registro
    con "abc" mostró las 4 reglas en gris sin cumplir; con "Abcdefg1!" cambió a "Contraseña segura"
    en verde.
  - `npm run lint`/`test` (83/83, +5 nuevas)/`build` pasan limpio.

- **Notificaciones reales (2026-10-13).** El usuario preguntó por qué el botón de la campana en el
  `TopBar` no hacía nada — se confirmó leyendo el código: era un `<button>` sin `onClick`, nunca
  conectado a nada, y una búsqueda de "notification" en todo `src/` y `supabase/migrations/` no
  dio ningún resultado — cero backend. El usuario pidió construirlo "con lo que en el momento es
  funcional", dejando el resto documentado como pendiente.
  - `src/lib/notifications.ts` (`getNotifications`): agrega 5 señales reales, cada una gateada por
    el mismo permiso que ya protege su pantalla (mismo criterio que el resto de la app, nunca un
    chequeo nuevo inventado): insumos bajo punto de reorden y órdenes de compra por aprobar
    (`view_costs`), pedidos vencidos sin enviar (`manage_orders`), facturas rechazadas
    (`view_finance`), invitaciones de equipo pendientes (`owner`, mismo criterio que ya usa
    `member-row.tsx` para quién gestiona el equipo).
  - **Documentado explícitamente como pendiente** (no construido, por ser más costoso de calcular
    en cada carga de página): insumo agotado cruzado con la receta de un pedido específico (ya
    existe la lógica en `blockedOrders`/`ordersAtRisk`, pero necesita las consultas completas de
    productos que hoy solo se piden en Analítica/Insumos); tejedora con más horas comprometidas
    que disponibles esta semana (necesita disponibilidad + horas comprometidas, igual que el
    panel de Capacidad de Pedidos).
  - `NotificationsButton` (`src/components/notifications-button.tsx`, nuevo): badge con el conteo
    sobre el ícono de campana; al hacer clic abre un `Sheet` (mismo patrón ya usado en toda la app
    para overlays) listando cada notificación con su categoría y enlace a la pantalla real.
  - `(app)/layout.tsx` calcula las notificaciones server-side (junto a las demás consultas del
    layout) y las pasa a `TopBar` como prop — mismo patrón de datos ya usado para
    `activeOrders`/`locations`, sin fetch adicional en el cliente.
  - **Verificado con las 3 cuentas de rol:** `owner` vio badge "3" con "2 insumos por debajo del
    punto de reorden", "1 factura rechazada, pendiente de reintentar" y "2 invitaciones
    pendientes de aceptar" — las 3 cifras coinciden con el estado real de los datos de prueba
    acumulados en sesiones anteriores. `ventas` y `tejedora` vieron "No tienes notificaciones
    nuevas" (ninguna señal falsa, el gating por permiso funciona).
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

- **Auditoría mockup-vs-real, Fase 5: Finanzas (2026-10-13).**
  - Nuevo `EmitInvoiceButton` (`finanzas/emit-invoice-button.tsx`): botón "+ Emitir factura" en el
    header de la página (`PageHeader action`), con un `Sheet` que lista los pedidos pagados sin
    ninguna factura todavía (`invoicedOrderIds` calculado de las facturas ya cargadas, sin consulta
    nueva) y reutiliza `createInvoice` tal cual — mismo criterio honesto de Fase 6 (nunca inventa
    un éxito; si falla, muestra el motivo real).
  - KPI "Ingresos" con variación % vs. mes anterior: nueva consulta liviana a `transactions` del
    mes previo + `periodChangePct` (ya existía en `src/lib/analytics.ts`, reutilizada tal cual, sin
    duplicar la fórmula).
  - Badge "DIAN · habilitado/no habilitado" junto a "Documentos de venta", leyendo
    `getInvoicingProvider().id !== "none"` — refleja el estado real (hoy siempre "no habilitado",
    porque no hay proveedor conectado, documentado desde la Fase 6).
  - **Bug real corregido en `documents-table.tsx`:** `errors` (el estado que pinta el motivo de
    rechazo bajo el chip) se inicializaba vacío y solo se llenaba tras pulsar "Reintentar" — una
    factura ya rechazada desde antes no mostraba su error al cargar la página, aunque el dato
    (`d.errorMessage`) ya viniera del servidor. Corregido sembrando el estado inicial desde los
    props. También se agregó "Ver PDF" (enlaza a `invoices.pdf_url` cuando existe — dato ya
    disponible, nunca se exponía en la tabla).
  - **Verificado de punta a punta:** la factura rechazada de prueba (`FE-0001`, de la Fase 6)
    mostró su error real ("La facturación electrónica aún no está configurada.") inmediatamente al
    cargar la página, sin necesitar reintentar; el badge DIAN mostró "no habilitado"; el flujo de
    "+ Emitir factura" completo (abrir sheet, elegir "Gorro canal-test", confirmar) mostró el error
    real del servidor ("Este cliente no tiene NIT/cédula...") sin fabricar ningún éxito — no se
    creó ninguna factura de prueba nueva, nada que limpiar.
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

- **Foto de perfil y rediseño de "Mi cuenta" (2026-10-13).** El usuario notó que al abrir "Mi
  cuenta" solo veía el círculo de iniciales, nunca una foto — resultó no ser un bug sino una
  función que nunca existió (confirmado leyendo `avatar.tsx`: siempre fue iniciales por hash de
  color, sin ningún campo ni carga de imagen de persona). Se preguntó el alcance antes de construir
  y el usuario pidió que la foto se vea en todas partes donde aparece una persona del equipo, no
  solo en su propia cuenta.
  - Migración `0017`: extiende `list_members` (mismo patrón drop+create de 0007/0016) con
    `avatar_url` (lee `auth.users.raw_user_meta_data->>'avatar_url'`) y crea el bucket de Storage
    `avatars` — mismo patrón exacto de los buckets `logos`/`avance` ya existentes, pero la carpeta
    raíz es el `user_id` de quien sube (validado con `auth.uid()`), no un `tenant_id`, porque la
    foto es de la persona, no del negocio.
  - `uploadAvatar` (`account-actions.ts`) replica `uploadLogo` de Configuración: sube a
    `avatars/<user_id>/avatar.png|jpg`, guarda la URL pública en `user_metadata.avatar_url` vía
    `supabase.auth.updateUser` (mismo lugar que ya usa `full_name`, sin tabla nueva).
  - `Avatar` (`ui/avatar.tsx`) gana un prop opcional `avatarUrl` — si existe, `<img
    object-cover>`; si no, las iniciales de siempre. No rompe ningún uso existente (clientes,
    pedidos, etc. simplemente no pasan el prop).
  - **Propagación real, no solo en "Mi cuenta":** se hiló `avatar_url`/`userAvatarUrl` por
    `(app)/layout.tsx` → `AppSidebar`/`TopBar` (foto propia) y por `Membership`/`Crew` → el
    asignado de una tarjeta en el Kanban de Pedidos (`board.tsx`), el detalle de pedido
    (`pedidos/[id]/page.tsx`) y la lista de personas en la vista de Capacidad
    (`capacity-view.tsx`). Se dejaron fuera a propósito los avatares de **clientes** (pedidos,
    `clientes/customers-view.tsx`, `inicio/page.tsx`) — esos representan al cliente final, no a una
    persona del equipo con cuenta en HEBRA, no tiene sentido mostrarles una "foto de perfil" de
    sistema. También se descartó `src/components/ui/order-card.tsx` por ser código muerto sin
    ningún import en todo el proyecto (confirmado con una búsqueda) — no se tocó.
  - **Pedido aparte del usuario, mismo hilo de conversación:** "mejora la ui/ux de mi cuenta que no
    sea solo texto plano" — `account-menu.tsx` reescrito: avatar grande (76px) con overlay de
    cámara al pasar el mouse (clic directo sobre la foto para cambiarla, sin un `<input type=file>`
    suelto visible), nombre con edición en línea (vista → botón "Editar" → formulario con
    Guardar/Cancelar, en vez de un formulario siempre abierto), fila "Ayuda" con ícono en círculo y
    chevron (mismo lenguaje visual que el resto de la app), "Cerrar sesión" como botón claro al
    final. Nuevo `IconCamera` en `icons.tsx`.
  - **Verificado en vivo:** el nuevo diseño de "Mi cuenta" renderiza correctamente (avatar grande,
    chip de rol, tarjeta "Tu nombre" con botón "Editar" que abre el formulario en línea con
    Guardar/Cancelar, fila de Ayuda, botón de cerrar sesión). La subida real de la foto queda
    pendiente de verificar hasta que el usuario ejecute la migración `0017` (crea el bucket de
    Storage que `uploadAvatar` necesita).
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

- **Auditoría mockup-vs-real, Fase 6: Portal de seguimiento (2026-10-13).** `get_order_tracking`
  (migración `0013`, Fase 8) nunca unía `product_steps`/`order_step_progress` de "Mi turno" —
  migración `0018` la extiende con tejedora asignada (primer nombre) y avance real de pasos. El
  timeline ahora muestra, en el paso activo, el dato real en vez de un texto fijo. Bug real
  corregido de paso: la tarjeta de precio usaba `tracking.title` mientras el encabezado usaba
  `tracking.product_name ?? tracking.title` — unificado. Encabezado con bloque de fondo propio y
  "Entrega estimada" como pastilla.
  - **Nota de migración:** el primer intento de `0018` falló con "cannot change return type of
    existing function" (mismo problema ya documentado para `list_members`/`list_audit_log`) —
    corregido agregando `drop function if exists get_order_tracking(text);` antes del `create`.
  - **Verificado en vivo:** se avanzó el pedido de prueba `#B5F445` (Amigurumi Osito, asignado a
    `qa.tejedora`, con 1 de 3 pasos ya marcados desde "Mi turno" en una sesión anterior) a "En
    proceso" y se extrajo el link de seguimiento interceptando `navigator.clipboard.writeText`
    (el botón "Compartir seguimiento" no muestra el token en pantalla). El portal mostró "QA lo
    está tejiendo a mano — va en el 33% (1 de 3 pasos). Sigue: Cuerpo." — coincide exactamente con
    el estado real de los pasos.
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

- **Auditoría mockup-vs-real, Fase 7: Pedido móvil (2026-10-13).** `order-timeline.tsx` ganó un
  prop `activePct` que muestra el % real de avance (cronómetro, ya calculado en la página) dentro
  del nodo activo. "Cancelar pedido" se movió del fondo (tercer botón apilado) a un botón "⋯" en
  el encabezado (`CancelOrderTrigger` ganó `variant="icon"|"full"`), dejando 2 botones en grid
  abajo (Compartir seguimiento / Avanzar estado).
  - **Bug real encontrado en la propia verificación:** al probar el clic del nuevo botón "⋯" con
    Playwright, el click fallaba repetidamente con "element intercepts pointer events" — el botón
    flotante de cuenta (`fixed top-[...] right-4`, visible en toda la app en móvil) se superponía
    exactamente encima del nuevo botón y lo hacía intocable de verdad, no solo visualmente
    apretado. Corregido con `pr-12 md:pr-0` en la fila del encabezado para reservarle espacio a esa
    esquina en móvil; reverificado y el clic funciona.
  - **Fuera de esta fase, documentado (ya estaba en el plan aprobado):** "Sumar apoyo" (segundo
    colaborador sin reemplazar al asignado principal) cambiaría el modelo de datos de
    `assigned_to` (hoy un único usuario); el insight combinado "horas restantes del pedido +
    disponibilidad diaria de la persona" — HEBRA solo tiene capacidad semanal real
    (`weeklyAvailableHours`), no diaria, así que inventar la parte diaria sería adivinar.
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

- **Auditoría mockup-vs-real, Fase 8: Inicio tejedora — última de las 8 pantallas (2026-10-13).**
  - `OrderTimerButton` (`pedidos/order-timer-button.tsx`) ganó un prop `size="sm"|"lg"` — "Mi
    turno" usa `lg` (64px, acción principal) sin afectar el tamaño chico que sigue usando el
    Kanban de Pedidos.
  - `ShiftTimerCard` (`inicio/shift-timer-card.tsx`) reescrita para fusionar el bloque claro
    (id/cliente/título/"Ver detalle", antes separado en `shift-home.tsx`) con la tarjeta oscura del
    cronómetro en una sola tarjeta "hero", fiel al mockup.
  - `shift-home.tsx`: cabecera agrega la sede activa real junto a la fecha (consulta nueva a
    `locations` solo cuando hay una sede seleccionada en el selector global — si es "Todas las
    sedes" no se muestra nada, en vez de inventar un valor). Se decidió explícitamente NO derivar
    "turno mañana/tarde" de la hora del sistema: HEBRA no tiene datos reales de horario de turno,
    así que inventarlo sería adivinar, no sería un dato real. "Después" gana un punto de color por
    estado (`STATUS_DOT`, mismo patrón ya usado en `board.tsx`/Analítica).
  - **Verificado en vivo con la cuenta tejedora:** la tarjeta "hero" renderiza correcta (un solo
    bloque oscuro con ID, chip de fecha, título, cliente, botón de cronómetro grande de 64px,
    barra de progreso, estado), "Pasos del patrón" muestra "1 de 3" con el progreso real
    acumulado de sesiones anteriores.
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

**Con esta fase se cierran las 8 pantallas de la auditoría mockup-vs-real** (Equipo, Analítica,
Insumos, Recetario, Finanzas, Portal de seguimiento, Pedido móvil, Inicio tejedora) iniciada a
partir de la comparación de Pedidos/Producción contra `Ent-Produccion.dc.html`.

- **Foto de fondo en el hero de la portada, fuera del roadmap (2026-10-13).** El usuario pidió usar
  una foto de ovillos de lana como fondo del hero de `/`, desenfocada y semitransparente, cubriendo
  solo la zona superior (no toda la página). Primer intento invisible por un bug real de CSS: la
  capa decorativa usaba `z-index: -10`, que la deja detrás del propio fondo opaco de `<main>`
  (contexto de apilamiento, no un problema de opacidad) — corregido con `z-0`/`z-10` explícito.
  Luego, iterando sobre feedback directo: imagen más visible y extendida para cubrir también la
  franja del encabezado (como si el logo/botón fueran una barra flotando sobre la foto), después se
  quitó la barra translúcida que había quedado detrás del encabezado para que todo quedara
  uniforme, y por último se bajó el desenfoque de `blur-[2px]` a `blur-[1px]` a pedido del usuario.
  Para cerrar, se ajustó la card "Así se calcula un precio en HEBRA" (antes `bg-night` opaco con
  borde genérico, se veía pegada encima de la foto) a `bg-night/90 backdrop-blur-xl` con
  `border-white/10` y `shadow-tab`, dejando que el tono cálido del fondo se filtre levemente para
  mejor armonía visual. `npm run lint`/`test` (83/83)/`build` pasan limpio en cada iteración.

- **Preparación para desplegar en Cloudflare, fuera del roadmap (2026-10-13).** El usuario avisó
  que está subiendo el proyecto a Cloudflare y pidió dejar el código listo para un despliegue
  exitoso. Se instaló `@opennextjs/cloudflare` + `wrangler` como devDependencies y se agregaron
  `wrangler.jsonc`, `open-next.config.ts`, `.dev.vars.example`, scripts
  `preview`/`deploy`/`cf-typegen` y `docs/DEPLOY.md` con la guía completa. No se verificó solo
  instalando: se corrió `npx opennextjs-cloudflare build` de verdad, lo que encontró dos avisos
  reales:
  - Se intentó fijar `export const runtime = "edge"` en `src/proxy.ts` para evitar el aviso "Node.js
    middleware support is experimental in cloudflare" — **el build falló**: Next.js 16 prohíbe esa
    config en el proxy ("Proxy always runs on Node.js runtime", sin alternativa). Se revirtió el
    cambio; el aviso queda documentado en `DEPLOY.md` como algo a vigilar tras desplegar (probar
    login/logout en producción), no como algo que se pueda evitar con esta versión de Next.
  - OpenNext avisa que no es 100% compatible compilando en Windows ("could encounter unpredictable
    failures during runtime") — por eso `DEPLOY.md` recomienda conectar el repo de GitHub para que
    Cloudflare compile en su propia infraestructura (Linux) en vez de `npm run deploy` local.
  - `next.config.ts` ganó `images.unoptimized: true` (el optimizador de imágenes de Next necesita
    Vercel o el binding de pago "Images" de Cloudflare; las fotos que sube la app ya se comprimen
    antes de subirse, así que no hace falta).
  - Las credenciales de Supabase (`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`) NO se
    escribieron en `wrangler.jsonc` ni en ningún archivo versionado — quedan documentadas en
    `DEPLOY.md` para configurarse como variables de build en el dashboard de Cloudflare.
  - `npm run lint`/`test` (83/83) pasan limpio; `npx opennextjs-cloudflare build` termina en
    `OpenNext build complete.` sin errores (solo 2 warnings cosméticos de esbuild dentro de un
    chunk de una dependencia de terceros, no del código propio).

- **Primer despliegue real en Cloudflare, con dos bugs reales encontrados en el camino
  (2026-10-13).** El usuario conectó el repo de GitHub a Cloudflare Workers Builds y fue pasando
  los errores de cada build a medida que salían, en vivo:
  1. `ERROR Could not find compiled Open Next config` — el Build command del dashboard estaba en
     el default `npm run build` (solo `next build`, nunca genera `.open-next/`). Se agregó el
     script `build:cf` y se documentó en `DEPLOY.md` cambiar ese campo a `npm run build:cf`.
  2. `Service binding 'WORKER_SELF_REFERENCE' references Worker 'hebra' which was not found` — el
     Worker real en la cuenta se llama `hebra-soft` (se confirmó leyendo la URL/breadcrumb del
     dashboard en una captura del usuario), pero `wrangler.jsonc` decía `"hebra"`. Corregido en
     los dos lugares (`name` y `services[0].service`); verificado después en el dashboard
     (Overview → Bindings) que el binding ya apunta a `hebra-soft`.
  3. El sitio quedó devolviendo 500 en todas las rutas incluso con el build y el binding ya
     arreglados. Primero se sospechó de las variables de Supabase no configuradas (teoría
     razonable dado que `process.env.NEXT_PUBLIC_SUPABASE_URL!` se usa en `src/proxy.ts`/
     `src/lib/supabase/server.ts` sin validar), pero **se verificó en vez de asumir**: se guió al
     usuario paso a paso para activar "Workers Logs" en Observability, y el log real mostró
     `Unexpected loadManifest(/.next/server/preview-props.json) call!` — nada que ver con
     Supabase. Investigado por web: bug conocido y sin corregir del adaptador
     `opennextjs-cloudflare`, introducido por `getPreviewProps()` de Next.js 16.4.0 (issues
     #1355/#1448 del repo, un PR con fix #1428 cerrado sin mergear por accidente). Se confirmó con
     el usuario (HEBRA no usa Draft Mode, cero impacto funcional) antes de bajar `next` de
     `^16.4.0` a `16.3.8` fijo. Verificado no solo con el build sino levantando el Worker en el
     runtime real con `npx wrangler dev` en local: la portada responde `200 OK` con el HTML
     completo (se veía hasta el preload de la imagen del hero).
  - `npm run lint`/`test` (83/83) pasan limpio tras el downgrade.

- **"Instala HEBRA" reaparecía tras descartarlo, bug real en producción (2026-10-13).** El usuario
  probó en Chrome de escritorio ya en producción y vio el aviso volver a aparecer sobre cualquier
  pantalla después de tocar "Ahora no", navegando por los links del menú. Antes de tocar código se
  verificó con Playwright contra la URL real: (1) la navegación SPA no remonta el layout (un
  marcador en `window` sobrevive la navegación), descartando que fuera el mismo bug de Turbopack en
  dev ya corregido antes; (2) el descarte sí persiste en `localStorage` y bloquea el efecto en un
  remount nuevo. La causa real: el listener de `beforeinstallprompt` en `InstallPrompt`
  (`src/components/pwa.tsx`) se agregaba una vez al montar pero nunca se quitaba al descartar ni al
  instalar — como el componente no se remonta entre pantallas, si el navegador reemite el evento
  más tarde en la misma sesión (pasa en la práctica en Chrome), el handler seguía activo y volvía a
  abrir el aviso encima de la pantalla actual. Corregido guardando el handler en un `useRef` y
  llamando `removeEventListener` explícitamente en `dismiss()` e `install()`.
  - Aparte, se confirmó con el usuario (no se asumió) que en el celular el instalador nunca
    apareció porque abrió el link desde WhatsApp — ese navegador embebido no soporta instalar PWAs,
    es una limitación de la app externa, no un bug de HEBRA. Para instalar en el celular hay que
    abrir el link directo en Chrome/Safari.
  - `npm run lint`/`test` (83/83) pasan limpio.

- **Cierra el autorregistro abierto, código corto de invitación (2026-10-13).** El usuario, ya
  probando en producción, notó que `/registro` dejaba crear un negocio nuevo sin ninguna
  invitación y que el botón "Tengo una invitación" de la portada en realidad mandaba a ese mismo
  formulario abierto — ningún lado pedía de verdad un código o token. Propuso que invitar fuera
  generar un código corto para compartir, en vez de solo el link largo; se acordó con el usuario
  antes de tocar nada ("¿Sigo con esto?" → "si").
  - Migración `0019_codigo_invitacion.sql`: columna `code` en `invitations`, `create_invitation`
    la genera, nueva función `get_invitation_by_code`. Verificado contra el historial de
    migraciones real (no asumido): `create_invitation` había sido redefinida después de la 0003
    por `0008_fix_invite_token.sql` (permiso solo-owner, no admin; `gen_random_uuid()` en vez de
    `gen_random_bytes()` porque pgcrypto no está disponible en el search_path restringido de estas
    funciones security definer) — la nueva versión se basó en esa, no en la original desactualizada.
  - Nueva pantalla `/invitar` (código) con su propio `Shell` compartido (extraído del que ya
    usaba `/invitar/[token]`, antes duplicado).
  - `/registro` sin `invite` muestra un aviso en vez del formulario de negocio nuevo; `signUp`
    (server action) también lo rechaza del lado del servidor, no solo oculta la UI.
  - Portada y login actualizados para apuntar a `/invitar`.
  - `InviteSheet` (Equipo) ahora muestra el código grande junto al link existente.
  - **Verificado de punta a punta con Playwright contra la cuenta real**, no solo mirando código:
    se generó una invitación de prueba real, se extrajo el código del DOM, se resolvió en
    `/invitar` hasta llegar al flujo de aceptación ya existente con el token correcto, y se
    confirmó que "Crea tu cuenta" desde el login preserva el `invite` en la URL. Se canceló la
    invitación de prueba al terminar para no dejar basura en el panel real de Equipo.
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

- **Scroll innecesario en el sidebar (2026-10-13).** El usuario lo vio en su pantalla real; medido
  con Playwright antes de tocar nada: a 800px de alto de ventana el menú entraba justo, a 720px
  (resolución de laptop común) se pasaba por 30px y aparecía la barra. Se recortaron espacios en
  `AppSidebar` (gaps, padding de encabezados de grupo, alto de ítem 40→36px, padding del bloque de
  cuenta) — verificado que ahora entra sin scroll hasta 680px, con las cuentas owner (10 ítems) y
  tejedora (6 ítems) para confirmar que no quedó apretado en ningún caso. `npm run lint`/`test`
  (83/83)/`build` pasan limpio.

- **Resend para correos transaccionales + rediseño de las 4 cards de la portada (2026-10-13).** El
  usuario compartió una API key de Resend (`re_...`, nunca escrita en ningún archivo del repo —
  solo en `.env.local`/`.dev.vars`, gitignored, y pendiente de cargar como secret en Cloudflare) y
  pidió que la info llegue a `herbrasoft1@gmail.com` pero que el usuario externo vea
  `hola@hebrasoft.com`. Antes de programar se preguntó qué correos específicamente, vía
  `AskUserQuestion` — eligió las 4 opciones (dueño/a por pedido nuevo y factura rechazada, cliente
  por pedido enviado, reemplazar correos de Supabase, formulario de contacto).
  - **Hallazgo real que cambió el alcance**: `customers` nunca tuvo columna `email` (solo
    whatsapp/instagram/dirección) — se agregó en la migración `0020_correo_cliente.sql`, con campo
    nuevo en el formulario de Clientes. Sin esto, "avisar al cliente por correo" habría sido
    imposible sin inventar un dato.
  - **Decisión explicada, no silenciosa**: NO se conectó el aviso de "factura rechazada" — hoy
    *todas* las facturas quedan rechazadas por diseño (sin proveedor DIAN conectado), así que
    mandar un correo en cada intento sería spam engañoso, no una alerta real. Se deja para cuando
    haya un proveedor real.
  - `src/lib/email.ts` nuevo: wrapper con `fetch` directo a la API de Resend (sin SDK), nunca
    bloquea ni rompe la acción que lo llama. Conectado a: pedido nuevo → dueños (`saveOrder`),
    pedido → "Enviado" → cliente si tiene correo (`moveOrder`), formulario de contacto nuevo en la
    portada pública.
  - **Verificación real, no solo "parece que compila"**: se probó el envío real contra la API de
    Resend (`curl` directo) antes de confiar en que el runtime funcionaba — confirmó HTTP 200 con
    ID de mensaje aunque el dominio `hebrasoft.com` todavía no estaba verificado en Resend; el
    usuario confirmó que los correos SÍ llegaron a su Gmail real. Después, con un cliente y pedido
    de prueba reales (creados y luego limpiados), se confirmó también el correo de "pedido
    enviado" sin errores en el log del servidor.
  - El usuario pidió explícitamente mejorar el diseño de los correos ("que no se vean genericos
    default sino con la identidad y el logo de hebra con un copywriter bien amigable") — reescrito
    con los tokens exactos de color de `globals.css`, tipografía serif para encabezados, logo real
    (`hebra-mark.png`), y copy cálido en vez de texto plano. Confirmado visualmente en Gmail real.
  - **Pendiente manual, fuera de código**: configurar SMTP personalizado de Resend en el dashboard
    de Supabase (Authentication → SMTP Settings) para que los correos de registro/invitación que
    hoy manda Supabase también salgan con la marca de HEBRA — no se puede hacer desde el repo.
  - **Cards de la portada**: el usuario mandó 4 fotos para usar de fondo en las 4 cards de "Todo tu
    taller", pero 3 de las 4 traían la misma leyenda "Insumos" quemada en el píxel — no eran 4
    fotos distintas por card. Se preguntó antes de asumir nada; el usuario autorizó modificarlas.
    Se reasignaron por el contenido real fotografiado (no la leyenda incorrecta): notebook con
    "Technique sketch" → Recetario, notebook con "Customer order/Tracking timeline" → Pedidos,
    ovillos con etiquetas de lote → Insumos, libro contable con gráfico → Caja y finanzas (la única
    que ya coincidía).
  - **Bug real encontrado en la propia verificación visual** (no se habría visto solo leyendo
    código): con las fotos como fondo vía `object-cover` en una card vertical, la leyenda quemada
    original seguía viéndose a través del degradado, superpuesta con el texto nuevo — porque
    `object-cover` en una card más alta que ancha recorta sobre todo a lo ancho, no a lo alto, así
    que toda la altura original de la foto (leyenda incluida) seguía entrando en el recorte. Se
    resolvió recortando físicamente el 45% superior de cada imagen (sin texto) antes de subirla,
    no confiando solo en el degradado de CSS para taparla.
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

- **Copy de la portada más neutral (2026-10-13).** El usuario pidió sacar "artesanales" y ampliar
  la bajada del hero para que hable más del core del negocio. Se neutralizó también "taller" en el
  encabezado de funciones y el CTA final (no se tocó solo lo pedido literalmente, para que el
  mensaje quedara consistente en toda la página). Se dejó a propósito sin tocar el nombre/
  descripción del manifest de instalación de la PWA (`src/app/manifest.ts`) — ese es el que ve el
  cliente real al instalar la app, y ese cliente sí es un negocio de tejido.

- **SEO básico: robots, sitemap, Open Graph (2026-10-13).** El usuario ya había creado Google
  Search Console y verificado el sitio por DNS en Cloudflare; pidió "todo lo que es de código".
  - Antes de programar nada se preguntó cómo había verificado la propiedad (DNS vs. meta tag),
    porque de la respuesta dependía si hacía falta agregar una etiqueta de verificación — confirmó
    DNS, así que no hizo falta.
  - `robots.ts`/`sitemap.ts` nuevos (convención de rutas de Next): solo `/` y `/privacidad`
    indexables; todo lo demás explícitamente en `Disallow` (incluido `/seguimiento/`, que lleva un
    token único por cliente y jamás debe indexarse).
  - **Bug real encontrado probando en vivo, no asumido**: el proxy de autenticación redirigía
    `/robots.txt` y `/sitemap.xml` a `/login` porque no estaban en su lista de rutas públicas ni
    excluidos del matcher — ningún rastreador los habría podido leer nunca. Corregido agregándolos
    al matcher (mismo trato que `manifest.webmanifest`/`sw.js`), no a `PUBLIC_PATHS` (no tienen
    nada que ver con sesión).
  - `layout.tsx` gana `metadataBase` + Open Graph + Twitter Card completos (no existían). Imagen
    nueva `public/og-image.jpg` generada con PowerShell/System.Drawing a partir de la misma foto
    del hero de la portada, con la marca HEBRA — consistente con lo que la persona va a ver si
    entra al link, no una imagen genérica de stock.
  - **Build falló una vez con un error real pero no del código propio**: un archivo autogenerado
    de `.next/dev/types/` quedó corrupto por correr `npm run dev` y `npm run build` sobre la misma
    carpeta `.next/` al mismo tiempo — se resolvió deteniendo el dev server antes de compilar y
    borrando `.next/`, no hubo que tocar ningún archivo del repo.
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.

- **Sitemap en Search Console y favicon faltante (2026-10-14).** El usuario reportó "Dirección de
  sitemap no válida" al cargar `sitemap.xml` a mano en Search Console. Antes de asumir nada se
  probó el endpoint real simulando el user-agent de Googlebot (`curl -A "...Googlebot..."`) —
  respondió 200 con el XML correcto, confirmando que el problema era del lado de la consola de
  Google (error instantáneo, antes de que pudiera intentar siquiera leer el archivo — típico bug
  reportado por otros en foros de soporte de Google, sin fix oficial). Se le indicó que no era
  bloqueante (`Sitemap:` ya estaba declarado en `robots.txt`, que Google lee solo) y, tras
  reintentar, el usuario confirmó que sí funcionó.
  - Reporte siguiente: en los resultados de Google aparecía un ícono gris genérico en vez del logo
    de HEBRA. Verificado (no asumido): `/favicon.ico` devolvía 404, aunque el `<link rel="icon">`
    sí apuntaba correctamente a `/icons/icon-192.png` (200 OK) — muchos sistemas, Google incluido,
    buscan además `/favicon.ico` en la raíz por convención, independientemente del `<link>`. Se
    generó `src/app/favicon.ico` real (no un PNG renombrado: un `.ico` de verdad vía
    `System.Drawing.Icon`, 48×48, transparencia verificada visualmente antes de confiar en él) a
    partir del ícono oficial de HEBRA — Next.js lo sirve solo por convención de archivo especial.
  - `npm run lint`/`test` (83/83)/`build` pasan limpio.
  - **Esa misma transparencia resultó un problema real, reportado horas después**: en la pestaña
    del navegador el área transparente del favicon tomaba el color oscuro del navegador/SO en vez
    de verse en blanco. Se regeneró con relleno blanco sólido detrás del logo (verificado
    pixel por pixel con `GetPixel` antes de confiar en él, no solo "se ve bien" a simple vista).
  - **El relleno blanco fue el fix equivocado — el usuario corrigió el malentendido**: lo que
    pidió no es "blanco en vez de oscuro", es "sin relleno, ni blanco ni oscuro, solo el logo
    flotando" (igual que cualquier favicon normal; el blanco que Google muestra en resultados de
    búsqueda es de la interfaz de Google, no del archivo). Al investigar de nuevo apareció la
    causa raíz real que el primer intento nunca encontró: `Icon.FromHandle(bitmap.GetHicon())` no
    preserva alfa de verdad, compone contra **negro opaco** — el primer "favicon transparente"
    nunca fue transparente, por eso se veía oscuro. Se abandonó ese método por completo: el `.ico`
    final se arma a mano (header `ICONDIR`/`ICONDIRENTRY` + un PNG de 48×48 con alfa real embebido
    tal cual, formato "PNG-in-ICO" estándar). Verificado en tres niveles antes de confiar en él:
    alfa del PNG intermedio, parseo manual de los bytes del `.ico` final, y render en Chromium real
    sobre fondo oscuro y claro a la vez — recién ahí se confirmó que el logo flota sin relleno en
    ningún caso.

- **El correo de contacto nunca llegó — causa raíz real encontrada (2026-10-14).** El usuario ya
  había cargado `RESEND_API_KEY` como secret en Cloudflare y redesplegado (una vez con "Retry
  deploy", otra con un push fresco forzado) y el correo de prueba seguía sin llegar. En vez de
  seguir probando a ciegas, se investigó por qué: Cloudflare solo popula `process.env`
  automáticamente con las variables/secrets de un Worker si la `compatibility_date` es del
  2025-04-01 en adelante (flag `nodejs_compat_populate_process_env`) — la nuestra quedó en
  `2024-12-30` desde el primer despliegue (Fase de Cloudflare, antes en esta misma sesión). Eso
  explica por qué las `NEXT_PUBLIC_*` sí funcionaban (se hornean en el build, no dependen de esto)
  pero `RESEND_API_KEY` quedaba `undefined` en runtime aunque estuviera bien cargada en el
  dashboard — el código de `src/lib/email.ts` ya tenía el guard correcto (`if (!apiKey) return`),
  por eso fallaba en silencio sin romper nada, solo sin mandar el correo. Se agregó el flag a
  `wrangler.jsonc` sin tocar `compatibility_date` (un cambio de fecha podría traer otros efectos no
  evaluados; el flag resuelve justo este problema). No se pudo verificar en local con `wrangler
  dev` por un lock de Windows en `.open-next/` (procesos `workerd`/`node` colgados de pruebas
  anteriores en la sesión que no soltaban el archivo) — se decidió verificar directo en producción
  en su lugar, mismo entorno donde se manifestó el bug originalmente.

- **El flag tampoco alcanzó — fix real encontrado viendo el log en vivo (2026-10-14).** El usuario
  agregó el flag a mano en el dashboard (Settings → Runtime) y redesplegó, pero el correo de
  contacto siguió sin llegar. En vez de seguir adivinando, se activó Observability en el Worker
  (estaba deshabilitada — otro hallazgo en el camino) y se vio el evento en vivo mientras se
  disparaba una prueba real: el log mostró explícitamente
  `"[email] RESEND_API_KEY no configurada, correo no enviado"` — confirmando que
  `process.env.RESEND_API_KEY` seguía `undefined` pese a todo lo anterior.
  - Se abandonó por completo la dependencia de `process.env` para secrets de Cloudflare. Fix real:
    `src/lib/email.ts` ahora usa `getCloudflareContext({ async: true }).env.RESEND_API_KEY` de
    `@opennextjs/cloudflare` — la forma oficial del adaptador para leer bindings/secrets,
    independiente de cualquier compatibility flag. `next.config.ts` gana
    `initOpenNextCloudflareForDev()` para que esto también funcione en local (`next dev`/`wrangler
    dev`, leyendo de `.dev.vars`).
  - **Esta vez sí se verificó en el runtime real antes de subir a producción**, no se repitió el
    error de confiar en que "compila" bastaba: se encontraron y mataron procesos `wrangler
    dev`/`workerd` colgados de horas antes en la sesión (eran la causa del lock de `.open-next/`
    del intento anterior — cada vez que se mataba un `workerd` reaparecía otro, hasta encontrar el
    proceso padre real que los relanzaba), se compiló limpio, se levantó el Worker real con
    `wrangler dev` y la key real en `.dev.vars`, se mandó el formulario de contacto contra ese
    Worker, y se confirmó en el dashboard de Resend (no solo "no tiró error") que el correo llegó
    de verdad.
  - `npm run lint`/`test` (83/83) pasan limpio.

- **Causa raíz real, por fin (2026-10-14).** `getCloudflareContext()` seguía sin encontrar la key
  en producción pese a todo lo anterior. En vez de seguir cambiando código a ciegas, se agregó un
  log de diagnóstico temporal (`src/lib/email.ts`, solo nombres de claves/bindings, nunca valores)
  y se vio en vivo con Observability: `getCloudflareContext().env` en producción solo tenía
  `WORKER_SELF_REFERENCE` y `ASSETS` — exactamente los bindings declarados en `wrangler.jsonc`.
  `RESEND_API_KEY` **nunca estuvo adjunta al Worker desplegado**, a pesar de aparecer cargada en
  el dashboard.
  - Revisando la pantalla real de Cloudflare junto con el usuario apareció la causa: el dashboard
    tiene DOS secciones separadas bajo "Variables and Secrets" — **Build variables** (para
    `NEXT_PUBLIC_*`, usadas solo durante `npm run build:cf`, donde SÍ viven
    `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` desde la Fase de Cloudflare) y **Runtime variables and
    secrets** (lo que el Worker ya desplegado lee en cada request). La key se había cargado en la
    de Build — con la pestaña "Production" de Runtime abierta, la lista estaba literalmente vacía
    ("Configure API tokens and other runtime variables"), confirmando que nunca estuvo ahí. Fácil
    de confundir porque ambas pantallas se llaman "Variables and Secrets" y se usó la misma mecánica
    para cargar las de Supabase sin que causara problema (esas sí van en Build).
  - Se agregó el secret en la sección correcta (Runtime, Production) y se verificó de punta a
    punta: log en vivo sin error, entrada nueva en el dashboard de Resend, correo real recibido en
    el Gmail del usuario — confirmado por el usuario mismo en cada paso, no asumido.
  - Se quitó el log de diagnóstico temporal, se deja `getCloudflareContext()` como forma
    definitiva de leer la key (de todas formas es la recomendada por el adaptador, más robusta que
    `process.env`).
  - `npm run lint`/`test` (83/83) pasan limpio.
