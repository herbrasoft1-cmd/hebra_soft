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
