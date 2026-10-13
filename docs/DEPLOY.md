# Despliegue en Cloudflare

HEBRA se despliega como **Cloudflare Worker** (no Cloudflare Pages estático) usando el adaptador
[`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare), que empaqueta el build de Next.js
(App Router, Server Actions, `src/proxy.ts`, rutas dinámicas) para correr en el runtime de Workers.

> **Next.js está fijado en `16.3.8` (no `^16.4.0`) a propósito.** Next 16.4.0 agregó
> `getPreviewProps()` (Draft Mode interno), que el adaptador de Cloudflare no sabe servir todavía
> — tira `Unexpected loadManifest(/.next/server/preview-props.json) call!` y la app cae con 500 en
> **todas** las rutas. Es un bug conocido y sin corregir en `opennextjs-cloudflare` (GitHub
> `opennextjs-cloudflare` issues #1355/#1448, reportados en octubre 2026). HEBRA no usa Draft Mode,
> así que no hay pérdida funcional. **No subir `next` más allá de `16.3.x` hasta que el adaptador
> publique un fix** (revisar el changelog de `@opennextjs/cloudflare` antes de actualizar Next).

## Qué se agregó al proyecto para esto

- `wrangler.jsonc` — config del Worker (nombre, flags de compatibilidad, carpeta de assets).
- `open-next.config.ts` — config del adaptador (mínima: sin caché R2 porque HEBRA no usa
  `revalidate`/ISR todavía, todo el contenido es dinámico por tenant).
- `next.config.ts` — `images.unoptimized: true`: el optimizador de imágenes de Next necesita el
  runtime de Vercel o el binding de pago "Images" de Cloudflare; se desactivó para no depender de
  eso (las fotos que sube la app — logo, avatar, avance de pedido — ya se comprimen antes de
  subirse). Se puede reactivar más adelante sumando `"images": { "binding": "IMAGES" }` a
  `wrangler.jsonc` si hace falta.
- `.dev.vars.example` — plantilla para `wrangler dev`/`npm run preview` en local (análogo a
  `.env.example` pero para el runtime de Workers).
- `package.json`: scripts `preview` (build + corre el Worker en local con `wrangler`), `deploy`
  (build + sube a Cloudflare) y `cf-typegen` (genera tipos de los bindings).

No se tocó la app en sí: `src/proxy.ts` ya usaba las APIs estándar de `next/server`
(`NextRequest`/`NextResponse`) y `@supabase/ssr`, compatibles con el runtime de Workers sin
cambios.

## Variables de entorno

HEBRA solo necesita las dos variables públicas de Supabase (no hay claves privadas en el
servidor: todo lo sensible pasa por funciones `security definer` en Postgres con RLS):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Como son `NEXT_PUBLIC_*`, Next.js las incrusta en el bundle **durante el build**, no solo en
runtime. Por eso hay que configurarlas en dos lugares distintos según cómo se despliegue:

1. **Build automático desde GitHub (recomendado, "Workers Builds"):** en el dashboard de
   Cloudflare → Workers & Pages → el proyecto `hebra-soft` → *Settings → Variables and Secrets* →
   agregar ambas como variables de **build** (no solo de runtime), con los valores reales del
   proyecto de Supabase (Project Settings → API).
2. **Deploy manual desde esta máquina (`npm run deploy`):** copiar `.env.example` → `.env.local`
   (ya existe, para `next dev`/`next build` local) y además `.dev.vars.example` → `.dev.vars` si se
   va a usar `npm run preview` para probar el Worker en local antes de subir.

## Primer despliegue

1. `npm install` (ya incluye `@opennextjs/cloudflare` y `wrangler` como devDependencies).
2. `npx wrangler login` (una vez, autentica esta máquina contra la cuenta de Cloudflare).
3. Configurar las variables de build en el dashboard (ver arriba) si se va a conectar el repo de
   GitHub para builds automáticos — es la opción recomendada para que cada push a `main` despliegue
   solo. Si se prefiere desplegar manualmente desde aquí: `npm run deploy`.
4. Verificar el dominio/ruta asignado por Cloudflare y, si aplica, apuntar el dominio propio desde
   el dashboard (*Settings → Domains & Routes*).

## Después de cambiar variables de entorno en el dashboard

`NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` se incrustan en el código **durante el
build**, no se leen en runtime. Si se agregan o cambian en *Settings → Variables and Secrets*,
hace falta un **build nuevo**, no solo un "Retry" del build fallido anterior (puede reusar capas
cacheadas de un build que corrió sin esas variables). Si el sitio sigue devolviendo `error code:
1101` después de guardar las variables y reintentar, forzar un build con un commit nuevo.

## Configurar "Workers Builds" (despliegue automático desde GitHub)

Cloudflare separa el despliegue en dos comandos configurables en el dashboard (*Workers & Pages →
el proyecto `hebra-soft` → Settings → Build*), y **el valor por defecto que propone Cloudflare para
Next.js no sirve para un proyecto con OpenNext**:

- **Build command:** poner `npm run build:cf` (o `npx opennextjs-cloudflare build`) — **no** dejar
  el default `npm run build`, que solo corre `next build` normal y nunca genera la carpeta
  `.open-next/`.
- **Deploy command:** dejar el default `npx wrangler deploy` — Wrangler detecta solo que es un
  proyecto OpenNext (por `open-next.config.ts` y el `main` de `wrangler.jsonc`) y internamente llama
  a `opennextjs-cloudflare deploy` por su cuenta.

**Si aparece el error `ERROR Could not find compiled Open Next config, did you run the build
command?`** es exactamente este problema: el Build command configurado no corrió
`opennextjs-cloudflare build`, así que el paso de deploy no encuentra nada que subir. La solución es
cambiar el campo **Build command** en el dashboard a `npm run build:cf`, no un cambio de código.

## Notas

- `compatibility_flags: ["nodejs_compat", ...]` en `wrangler.jsonc` es obligatorio: sin él, varias
  dependencias de Next.js/Supabase que usan APIs de Node no cargan en el Worker.
- El Worker necesita el binding `services` que apunta a sí mismo (`WORKER_SELF_REFERENCE`) — ya
  está en `wrangler.jsonc`, no se debe quitar; lo usa el adaptador internamente para revalidación.
- `.open-next/` y `.wrangler/` son carpetas de build, están en `.gitignore`.
- **`src/proxy.ts` corre en runtime Node.js (no edge) — verificado al compilar.** Next.js 16
  elimina la opción de fijar `export const runtime = "edge"` en el proxy (antes "middleware"):
  siempre corre en Node.js, sin alternativa. El build de Cloudflare avisa: *"Node.js middleware
  support is experimental in cloudflare, and not officially maintained by OpenNext maintainers"*.
  El build igual compila y funciona, pero es un punto a vigilar después de desplegar: probar el
  login/logout y la redirección automática (rutas protegidas) específicamente en producción, no
  solo en local.
- **Compilar en Windows funciona pero con advertencia de OpenNext** ("OpenNext is not fully
  compatible with Windows... could encounter unpredictable failures during runtime"). Por eso la
  opción recomendada es el build automático desde GitHub (Cloudflare lo compila en su propia
  infraestructura, Linux) en vez de `npm run deploy` desde esta máquina — ver la opción 1 de
  "Variables de entorno" arriba.

## Dominio propio (`hebrasoft.com`)

El dominio se compró directo en Cloudflare (mismo account), así que no hace falta tocar DNS a
mano: `wrangler.jsonc` tiene `"routes": [{ "pattern": "hebrasoft.com", "custom_domain": true }]`
— Cloudflare lo conecta solo al Worker `hebra-soft` en el próximo deploy (certificado SSL
incluido). Si más adelante se quiere `www.hebrasoft.com` también, agregar otra entrada igual en
ese array con ese pattern.

**Pendiente tras activar el dominio propio:** agregar `https://hebrasoft.com/auth/callback` (y de
paso `https://hebra-soft.herbrasoft1.workers.dev/auth/callback` si se quiere mantener esa URL
usable) a la lista de *Redirect URLs* permitidas en Supabase (Authentication → URL Configuration).
El código ya arma la URL de redirect dinámicamente a partir del header `host` de cada request
(`src/app/(auth)/actions.ts`, `siteOrigin()`), así que no hace falta tocar código — pero Supabase
igual exige que la URL esté en esa lista blanca, si no, los links de invitación/confirmación de
registro van a fallar silenciosamente (redirigen al Site URL por defecto en vez del callback real)
en cuanto alguien los abra desde el dominio nuevo.
