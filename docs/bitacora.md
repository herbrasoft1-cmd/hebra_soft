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
