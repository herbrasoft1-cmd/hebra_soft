# HEBRA — instrucciones para Claude

HEBRA es un SaaS multitenant (PWA) de gestión operativa y costeo para negocios handmade, con
enfoque inicial en crochet. Este repositorio ya tiene un **MVP funcional**; el objetivo ahora es
llevarlo a la **versión Enterprise** que está diseñada en `docs/mockups/`, por fases.

## Fuentes de verdad (léelas antes de cambiar código)

1. `docs/ROADMAP.md` — qué se construye en cada fase, con criterios de aceptación. Trabaja **una fase a la vez**.
2. `docs/DESIGN.md` — sistema de diseño Enterprise: colores, tipografía, espaciados y componentes.
3. `docs/mockups/*.dc.html` — las pantallas aprobadas. El resultado debe verse **igual**: mismos
   colores hex, tamaños, radios, jerarquía, textos y orden de los elementos. Cómo leerlas: `docs/mockups/README.md`.
4. `supabase/migrations/` — el esquema actual. Los cambios de base de datos van en **migraciones nuevas
   numeradas** (`0002_…sql`, `0003_…sql`); nunca edites una migración ya aplicada.

Si el mockup y el roadmap se contradicen, manda el mockup en lo visual y el roadmap en lo funcional.
Si algo no está definido en ninguno, pregunta antes de inventarlo.

## Stack (no cambiar sin preguntar)

Next.js 16 (App Router, `src/proxy.ts` en lugar de middleware) · React 19 · TypeScript estricto ·
Tailwind CSS 4 (tokens en `src/app/globals.css` con `@theme`) · Supabase (Postgres + Auth + Storage, RLS) ·
jsPDF · Vitest. Sin librerías de UI (nada de shadcn, MUI, Chakra) ni de gráficos pesadas: los
componentes y gráficos se construyen a mano para que se vean exactamente como el mockup.

## El proyecto ya está en uso: no se borra nada

- El MVP ya corre con datos reales. Se evoluciona sobre lo que existe; **nunca** se recrea el proyecto,
  se borran carpetas ni se reemplazan archivos completos sin explicarme por qué.
- Migraciones **aditivas**: `ALTER TABLE … ADD COLUMN` (nullable o con `default`), tablas nuevas,
  vistas y funciones nuevas. Prohibido `DROP TABLE`, `TRUNCATE` o recrear tablas existentes.
- Toda columna nueva obligatoria lleva **backfill** de los datos existentes en la misma migración
  (ej.: al crear `locations`, crear una sede "Principal" por cada tenant y asignarle las filas actuales).
- Antes de aplicar una migración, muéstramela y dime qué datos toca. Pruébala primero en el proyecto
  de Supabase de desarrollo.
- Las rutas actuales (`/inicio`, `/insumos`, `/recetario`, `/pedidos`, `/caja`…) siguen funcionando;
  si una pantalla se reemplaza, la ruta vieja redirige a la nueva.

## Reglas de arquitectura

- **Multitenancy:** toda tabla de negocio lleva `tenant_id` y RLS con `is_member(tenant_id)`. Además, el
  código filtra siempre por `tenant.id` (de `getSession()` en `src/lib/tenant.ts`). Nunca relajes una política.
- **Permisos por rol** (desde la fase 1): toda acción del servidor valida el permiso con el helper central
  (`src/lib/permissions.ts`). Las tejedoras **nunca** reciben costos, márgenes ni datos financieros, ni
  siquiera en el JSON enviado al navegador.
- **Core genérico + módulos de industria:** vocabulario por nicho en `src/modules/`. No escribas "tejido"
  o "crochet" directamente en el core; usa las etiquetas del módulo.
- **Lógica pura y probada:** cálculos (costeo, simulador, capacidad, cartera, reorden) van en `src/lib/`
  como funciones puras con pruebas Vitest al lado (`*.test.ts`).
- **Server Components** para leer, **Server Actions** para escribir. Las acciones devuelven
  `{ error?: string }` en lugar de lanzar errores con mensajes para el usuario.
- **PWA:** no rompas `public/sw.js`, el manifest ni el cronómetro offline (`src/components/timer.tsx`).

## Convenciones

- Interfaz en español de Colombia, tuteo, tono cálido y concreto. Dinero `$85.400`, millones `$18,42 M`,
  porcentajes `46,8%` (coma decimal). Fechas con `Intl` en `es-CO`.
- Números siempre con `tabular-nums`. IDs, SKU y lotes en Geist Mono.
- Accesibilidad: `<button>` y `<a>` reales, `aria-label` en botones solo con ícono, contraste AA,
  objetivos táctiles ≥ 44 px en móvil.
- Componentes en `src/components/ui/` (base) y `src/components/<dominio>/` (específicos).

## Comandos

```bash
npm run dev      # desarrollo
npm run lint     # tsc --noEmit
npm test         # vitest
npm run build    # build de producción (debe pasar antes de cerrar una fase)
```

## Cómo cerrar una fase (definición de terminado)

1. Se cumplen todos los criterios de aceptación de la fase en `docs/ROADMAP.md`.
2. `npm run lint`, `npm test` y `npm run build` pasan sin errores.
3. Las pantallas de la fase coinciden con su mockup (revísalas lado a lado).
4. Las migraciones nuevas incluyen RLS y se probaron (al menos: otro tenant no ve ni escribe nada).
5. Actualiza la casilla de la fase en `docs/ROADMAP.md` y deja un resumen corto en `docs/CHANGELOG.md`.
