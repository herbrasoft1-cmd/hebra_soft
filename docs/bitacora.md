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
  - **Pendiente antes de desplegar:** correr `supabase/migrations/0002_mark_order_paid.sql` en
    Supabase (SQL Editor). Ver `pendientes.md` para el resto de recomendaciones no bloqueantes.
