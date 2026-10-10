# Arquitectura

Decisiones técnicas de HEBRA y su razón de ser. El "qué cambió y cuándo" vive en
[`bitacora.md`](./bitacora.md); aquí vive el estado actual de las decisiones.

## Multitenancy

Base de datos única, esquema compartido. Cada tabla de negocio tiene `tenant_id`. Doble capa de
aislamiento: el código siempre filtra por `tenant_id`, y PostgreSQL lo impone además con Row Level
Security (función `is_member(tenant_id)`). Si el código olvida el filtro, la base no devuelve datos
de otro negocio igual.

## Core + plugins por nicho

Insumos, pedidos, clientes y caja son genéricos para cualquier negocio handmade. Lo específico del
nicho (vocabulario del recetario, nombres de etapas, unidades sugeridas) vive en `src/modules/`
(ej. `crochet.ts`, `jewelry.ts`), registrado en `src/modules/index.ts`. Para un nicho nuevo se copia
un módulo existente y se ajusta — no se toca el core.

## Motor de costeo

`src/lib/costing.ts` (con pruebas en `costing.test.ts`): Materiales + Mano de obra (tiempo real ×
valor de la hora) + % desgaste → precios sugeridos con márgenes de 30 %, 50 % y 100 %, redondeados
a la centena.

## Cronómetro offline

Estado en `localStorage`: sobrevive a cerrar la app o perder conexión. Cada sesión terminada entra
a una cola local con `client_id` único y se sube al volver el internet; la base ignora duplicados.

## Inventario automático

Trigger en Supabase: al mover un pedido a *Enviado*, descuenta del inventario los insumos de su
receta multiplicados por la cantidad.

## Remisiones

El consecutivo se reserva en la base (por negocio); el PDF se dibuja en el navegador con `jsPDF` y
se comparte por WhatsApp vía Web Share API. Para facturación electrónica, implementar la interfaz
de `src/lib/invoicing.ts` con el proveedor que corresponda.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind CSS 4 · Supabase (Postgres + Auth +
Storage) · jsPDF. PWA: se instala desde el navegador, el service worker (`public/sw.js`) solo se
registra en producción (`npm run build && npm start`).
