# HEBRA

SaaS multitenant de gestión operativa y costeo para negocios handmade (enfoque inicial: crochet).
Es una **PWA**: se instala en el celular desde el navegador y el cronómetro funciona sin internet.

**Stack:** Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (PostgreSQL + Auth + Storage) · jsPDF

---

## 1. Requisitos

- Node.js 20 o superior (probado con Node 22)
- Una cuenta gratuita en [supabase.com](https://supabase.com)
- VS Code (al abrir la carpeta te sugerirá las extensiones de `.vscode/extensions.json`)

## 2. Crear la base de datos en Supabase

1. Crea un proyecto nuevo en Supabase.
2. Ve a **SQL Editor → New query**, pega todo el contenido de `supabase/migrations/0001_hebra_schema.sql` y dale **Run**.
   Esto crea las tablas, las políticas de seguridad (RLS) por negocio, las funciones y el bucket `logos`.
3. En **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:3000` (luego tu dominio real)
   - *Redirect URLs*: agrega `http://localhost:3000/auth/callback` (y luego `https://tu-dominio/auth/callback`)
4. (Opcional, para probar más rápido) En **Authentication → Providers → Email** puedes desactivar
   *Confirm email*. Así el registro entra directo sin esperar el correo.

## 3. Correr el proyecto

```bash
npm install
cp .env.example .env.local     # en Windows: copy .env.example .env.local
```

Completa `.env.local` con los datos de **Project Settings → API** de Supabase:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

```bash
npm run dev        # http://localhost:3000
```

Otros comandos:

| Comando          | Qué hace                                                   |
| ---------------- | ---------------------------------------------------------- |
| `npm run build`  | Compila para producción                                    |
| `npm start`      | Sirve el build (aquí se activa el service worker de la PWA) |
| `npm test`       | Pruebas del motor de costeo (Vitest)                       |
| `npm run lint`   | Revisión de tipos con TypeScript                           |
| `npm run icons`  | Regenera los íconos PNG desde `public/icons/icon.svg`      |

> **Probar la PWA:** el service worker solo se registra en producción. Usa `npm run build && npm start`
> y abre Chrome → DevTools → Application → Manifest / Service Workers. Para probar en el celular
> necesitas HTTPS (despliega en Vercel o usa un túnel como `ngrok`).

## 4. Desplegar (Vercel)

1. Sube el proyecto a GitHub.
2. En [vercel.com](https://vercel.com) → *Add New Project* → importa el repo.
3. Agrega las dos variables de entorno de Supabase.
4. Actualiza *Site URL* y *Redirect URLs* en Supabase con tu dominio de Vercel.

---

## Estructura

```
src/
├─ app/
│  ├─ (auth)/            login, registro y server actions de autenticación
│  ├─ (app)/             pantallas protegidas (comparten menú lateral / barra inferior)
│  │  ├─ inicio/         resumen + acciones de "un clic" (venta, cronómetro)
│  │  ├─ insumos/        A. Insumos y costo por unidad mínima
│  │  ├─ recetario/      B. Patrones: insumos, cronómetro de talento, margen y precio
│  │  ├─ pedidos/        C. Tablero Kanban (arrastrar en escritorio, hebra en celular)
│  │  ├─ clientes/       C. Ficha de cliente
│  │  ├─ caja/           D. Caja chica + remisión express en PDF
│  │  └─ configuracion/  negocio, valor de la hora, desgaste, logo, modo nocturno
│  ├─ bienvenida/        onboarding: crea el negocio tras confirmar el correo
│  ├─ auth/callback/     canje del enlace de confirmación
│  ├─ offline/           pantalla sin conexión de la PWA
│  └─ manifest.ts        manifest de la PWA
├─ components/           íconos de nicho, navegación, cronómetro, hojas, PWA
├─ lib/
│  ├─ costing.ts         motor de costeo (lógica pura + pruebas)
│  ├─ remission-pdf.ts   generador de remisiones y compartir por WhatsApp
│  ├─ invoicing.ts       punto de extensión para facturación electrónica
│  ├─ tenant.ts          sesión + negocio actual
│  └─ supabase/          clientes de Supabase (servidor / navegador)
├─ modules/              plugins por industria (crochet, joyería…)
└─ proxy.ts              refresco de sesión y protección de rutas
public/sw.js             service worker
supabase/migrations/     esquema SQL multitenant con RLS
```

## Decisiones de arquitectura

**Multitenancy (base única, esquema compartido).** Cada tabla de negocio tiene `tenant_id`. El aislamiento
se garantiza en dos capas: el código filtra siempre por `tenant_id`, y además PostgreSQL lo impone con
Row Level Security usando la función `is_member(tenant_id)`. Aunque un bug olvide el filtro, la base no
devuelve datos de otro negocio.

**Core genérico + plugins.** Insumos, pedidos, clientes y caja son iguales para cualquier negocio handmade.
Lo específico del nicho (vocabulario del recetario, nombres de las etapas, unidades sugeridas) vive en
`src/modules/`. Para sumar cerámica o costura: copia `src/modules/jewelry.ts`, ajústalo y regístralo en
`src/modules/index.ts`. No se toca el core.

**Costeo.** `Materiales + Mano de obra (tiempo real × valor de la hora) + % desgaste` → precios sugeridos
con márgenes de 30 %, 50 % y 100 %, redondeados a la centena. Toda la lógica está en `src/lib/costing.ts`
con pruebas.

**Cronómetro offline.** El estado vive en `localStorage`, así que sobrevive a cerrar la app o perder la
conexión. Cada sesión terminada entra a una cola local con un `client_id` único y se sube al volver el
internet; la base ignora duplicados.

**Inventario automático.** Al mover un pedido a *Enviado*, un trigger descuenta del inventario los insumos
de su receta multiplicados por la cantidad.

**Remisiones.** El consecutivo se reserva en la base (por negocio) y el PDF se dibuja en el navegador,
para compartirlo directo por WhatsApp con la Web Share API. Para facturación electrónica, implementa la
interfaz de `src/lib/invoicing.ts` con tu proveedor.

## Próximos pasos sugeridos

- Invitar colaboradores a un negocio (la tabla `memberships` ya soporta roles).
- Planes y cobro de suscripción del SaaS.
- Cola offline también para ventas y movimientos de pedidos.
- Reportes mensuales (productos más rentables, tiempo promedio por pieza).
