# Changelog — HEBRA Enterprise

Registro corto por fase, agregado al cerrar cada una (ver "Cómo cerrar una fase" en `CLAUDE.md`).

## Fase 6 — Finanzas y facturación (2026-10-12)

El usuario había excluido esta fase y la reinstaló explícitamente, con una condición clara:
construir todo lo que se pueda en código, y dejar listo el punto de conexión para cuando él cree la
cuenta de un proveedor de facturación electrónica (confirmó no construir ningún adaptador real de
Alegra/Siigo todavía).

- Migración `0014`: `customers.document_number` (NIT/cédula) y `tenants.invoice_seq`. Tabla
  `invoices` — registra cada intento real de factura electrónica, nunca un estado inventado (RLS:
  owner/admin/ventas, mismo chequeo inline que ya usaba `create_remission`). RPC
  `reserve_invoice_number`, mismo patrón que `remission_seq`.
- **Sin tabla `payments` nueva**: el saldo/cartera siguen saliendo de `transactions.order_id`, ya
  formalizado en la Fase 8 (`get_order_balance`). "Gastos fijos" se reutiliza como `transactions` con
  categoría "Gastos fijos" (se agregó esa opción al desplegable de Caja, que antes no la tenía — sin
  eso, la convención no era alcanzable desde la UI).
- `src/lib/finance.ts`: `receivableAging` (cartera por antigüedad, 0-15/16-30/31-60/+60 días),
  `incomeStatement` (la cascada ingresos − materiales − mano de obra − comisiones − gastos fijos),
  `channelCommission`. Con pruebas.
- Página `/finanzas` (gateada por `view_finance`, igual que Caja): KPIs, cascada "De ingresos a
  utilidad" (gráfico de cascada), cartera por antigüedad con recordatorio de WhatsApp **por cliente**
  (no un botón masivo — `wa.me` abre una conversación a la vez y los navegadores bloquean varios
  `window.open` seguidos), tabla de documentos (facturas + remisiones unificadas), export a CSV.
- "Emitir factura" vive en dos lugares, igual que "Remisión": el Kanban de Pedidos (gateado por
  `issue_invoices`, así `ventas` también puede sin entrar a `/finanzas`) y la tabla de documentos de
  Finanzas (para reintentar).
- `src/lib/invoicing.ts` documenta exactamente qué archivo crear y qué variables de entorno leer
  cuando se conecte un proveedor real — el resto del app no necesita cambios.
- Verificado de punta a punta con datos reales: completar el NIT de un cliente y emitir una factura
  desde el Kanban queda en `invoices` con estado `rechazada` y el mensaje real "La facturación
  electrónica aún no está configurada." (no un crash); "Reintentar" repite el flujo; un gasto con
  categoría "Gastos fijos" se reflejó correctamente en la cascada ($135K → $85K, 63,0%); la cartera
  bucketeó bien un saldo real; el CSV exportado tiene los datos correctos; `ventas` ve el botón
  "Factura" en el Kanban pero es redirigida fuera de `/finanzas`.
- `npm run lint`/`test` (74/74, +10 nuevas de `finance.ts`)/`build` pasan limpio. Casilla de la Fase 6
  marcada en `docs/ROADMAP.md`.

## Mejora fuera del roadmap — Cancelación de pedidos con devolución justa (2026-10-12)

Pedida por el usuario tras comparar el mockup de Producción con el Kanban real: faltaba poder
cancelar un pedido con devolución registrada en Caja, el badge "Bloqueado" del mockup no existía, y
la tarjeta había acumulado demasiados botones.

- Migración `0015`: `orders.cancelled_at`/`cancel_reason`/`refund_amount` (nullable, ortogonales al
  estado — sin tocar el enum `order_status`). RPC `cancel_order` (`security definer`, mismo patrón
  que `mark_order_paid`): valida rol (owner/admin/ventas), rechaza pedidos `enviado` o ya cancelados,
  valida el monto en el servidor, registra la devolución como `transactions` tipo gasto/"Devolución"
  sin tocar la venta original.
- `suggestedRefund()` en `src/lib/finance.ts`: devolución = pagado − costo real de horas logueadas
  (`timer_sessions` + `laborCost()`), nunca un porcentaje inventado; monto editable antes de
  confirmar, política explícitamente pedida por el usuario para ser justa con el tiempo ya invertido.
- "Bloqueado" en la tarjeta del Kanban: reutiliza `outOfStockByProduct` (ya existía para "En
  riesgo", nunca se pintaba) con `Tooltip` mostrando el insumo agotado — cero consultas nuevas.
- Tarjeta reorganizada: Cronómetro/Detalle/Cancelar/Avanzar estado quedan visibles; WhatsApp/
  Remisión/Factura se agruparon en un menú "⋯". Pestaña nueva "Cancelados" en el tablero.
- Verificado con datos reales: devolución 100% sin tiempo logueado, devolución descontada
  correctamente con tiempo real logueado, `transactions` de "Devolución" visible en Caja, `ventas`
  puede cancelar y `tejedora` no ve el botón, flujo probado tanto desde el Kanban como desde
  `/pedidos/[id]`.
- `npm run lint`/`test` (78/78, +4 nuevas)/`build` pasan limpio.

## Mejora fuera del roadmap — Auditoría mockup-vs-real en 8 pantallas, Fase 1: Equipo (2026-10-13)

El usuario pidió repetir, para el resto de la app, la comparación mockup-vs-real ya hecha en
Pedidos. 8 agentes de solo lectura compararon cada mockup contra su pantalla real; se aprobó
implementar todo en orden de más a menos complejo, empezando por Equipo/Configuración (la brecha
más grande: faltaban 2 de 4 pestañas del mockup).

- Migración `0016`: `list_members` ahora también devuelve `last_sign_in_at` y
  `two_factor_enabled` (de `auth.users`/`auth.mfa_factors`, datos reales).
- Pestañas nuevas en Equipo: "Integraciones" (catálogo de 9 conectores, todos "No conectada
  todavía" con botón deshabilitado — mismo criterio honesto que la facturación electrónica de la
  Fase 6, nunca un "Conectado" falso) y "Plan y seguridad" (conteos reales de miembros/sedes/
  facturas del mes, sin inventar un cupo de plan; sin los 4 toggles de seguridad del mockup
  porque un toggle que no aplica nada de verdad es peor que no tenerlo).
- "Actividad" se movió dentro de "Plan y seguridad" (como en el mockup) y ganó botón "Exportar
  CSV".
- Tabla de miembros: columna "Último acceso" (tiempo relativo real) y chip "2FA activo/pendiente"
  por persona.
- `npm run lint`/`test` (78/78)/`build` pasan limpio.

## Mejora fuera del roadmap — Auditoría mockup-vs-real, Fase 5: Finanzas (2026-10-13)

- Botón "+ Emitir factura" en el header de `/finanzas` (antes el flujo solo vivía en el Kanban de
  Pedidos): selector de pedidos pagados sin factura todavía, reutiliza la misma acción
  `createInvoice` real (sin inventar éxito — muestra el error real del servidor si el cliente no
  tiene NIT/cédula).
- KPI "Ingresos" con variación % vs. mes anterior (mismo patrón ya usado en Analítica).
- Badge "DIAN · habilitado/no habilitado" junto a "Documentos de venta", reflejando si hay un
  proveedor de facturación real conectado (`src/lib/invoicing.ts`).
- **Bug real corregido:** el mensaje de error de una factura rechazada (`error_message`, ya
  presente en el dato que trae la fila) solo se mostraba después de pulsar "Reintentar" — en la
  carga inicial de la página, una factura rechazada no mostraba por qué. Corregido sembrando el
  estado de errores con los datos que ya vienen del servidor. También se expone "Ver PDF" cuando
  `invoices.pdf_url` existe (dato ya disponible, nunca se renderizaba).
- `npm run lint`/`test` (83/83)/`build` pasan limpio.

## Mejora fuera del roadmap — Notificaciones reales (2026-10-13)

El botón de la campana era decorativo desde siempre (sin `onClick`, sin backend). Se construyó con
señales que ya son reales y baratas de calcular, gateadas por el mismo permiso que ya protege cada
pantalla:

- Insumos bajo punto de reorden y órdenes de compra por aprobar (`view_costs`).
- Pedidos vencidos sin enviar (`manage_orders`).
- Facturas rechazadas pendientes de reintentar (`view_finance`).
- Invitaciones de equipo pendientes de aceptar (`owner`).
- Badge con el conteo en la campana; panel (`Sheet`) con cada notificación enlazando a su pantalla.
- **Pendiente de activar/conectar** (requieren cálculos más pesados, no caben en cada carga de
  página): insumo agotado cruzado con la receta de un pedido específico; tejedora con más horas
  comprometidas que disponibles esta semana. Documentado en `src/lib/notifications.ts`.
- `npm run lint`/`test` (83/83)/`build` pasan limpio.

## Mejora fuera del roadmap — Mostrar contraseña y validación de complejidad (2026-10-13)

- Nuevo `PasswordInput` (botón de ojo para mostrar/ocultar) en los campos de contraseña de login y
  registro.
- Nuevo `PasswordStrength` en registro: checklist en vivo (mínimo 8 caracteres, una mayúscula, un
  número, un carácter especial), con confirmación verde "Contraseña segura" cuando se cumple todo.
- Las reglas viven en un solo lugar (`src/lib/password.ts`, con prueba) y el servidor (`signUp`)
  las aplica también — nunca se confía solo en la validación del formulario.
- `npm run lint`/`test` (83/83, +5 nuevas)/`build` pasan limpio.

## Mejora fuera del roadmap — Pulido final de portada y autenticación (2026-10-13)

Última ronda de ajustes sobre la portada/login/registro:

- Enlace "← Inicio" explícito en el layout de autenticación (antes solo el logo era clicable, poco
  obvio) — visible en login y registro.
- Las 4 tarjetas de función de la portada dejaron de verse genéricas: cada una con su color de
  acento (barra superior + ícono), un detalle corto en mayúsculas, numeración "01–04", y "Caja y
  finanzas" como tarjeta oscura para romper la monotonía de las otras 3.
- Sombra de texto sutil (cálida sobre fondo claro, oscura sobre las bandas `bg-night`) en los
  títulos principales de la portada, pedida explícitamente por el usuario.
- `npm run lint`/`test` (78/78)/`build` pasan limpio.

## Mejora fuera del roadmap — Rediseño premium de portada y autenticación (2026-10-13)

Ajustes pedidos sobre el trabajo anterior: quitar menciones de tecnología de la política de
privacidad, textos del pie más neutros, crédito de la agencia, y un nivel de pulido "enterprise"
(más producción, sin cambiar la identidad cálida/artesanal de HEBRA) en portada, login y registro.

- `/privacidad`: ya no menciona la infraestructura técnica específica, descrita en términos
  neutros (controles de acceso, autenticación).
- Pie de la portada: "Software de gestión." (antes explicaba qué NO era, en tono defensivo) +
  línea "Hecho por Jormelia Soft" enlazada a jormeliasoft.com.
- **Portada (`/`) rediseñada**: tarjeta ilustrativa del costeo real en el hero (mismo patrón visual
  del simulador de precio real, claramente etiquetada "Ejemplo"), flujo numerado de 4 pasos con
  línea conectora, fondo con degradados suaves, banda oscura de CTA final — mismo lenguaje visual
  que ya usa el resto de la app (tarjetas `bg-night`, sin sombras, tipografía Fraunces), no una
  estética corporativa genérica.
- **Login y registro**: mismo tratamiento de fondo con degradados; registro pasó de una sola
  columna (con scroll vertical en móvil) a campos emparejados en 2 columnas — queda sin scroll en
  los tamaños de pantalla probados.
- `npm run lint`/`test` (78/78)/`build` pasan limpio.

## Mejora fuera del roadmap — Logo nuevo, pantalla de inicio y política de privacidad (2026-10-13)

El usuario pidió reemplazar el logo del software y agregar una pantalla pública de inicio (hoy `/`
redirigía ciegamente a `/inicio`, que exige sesión), con tratamiento de datos y privacidad
enfocados en uso privado (no un servicio público de autoregistro masivo).

- **Logo:** la imagen enviada era un `.jpg` sin canal alfa real (el cuadriculado de "transparencia"
  estaba pintado en los píxeles, no era alfa). Se recuperó transparencia real con un script de
  recorte cromático (umbral de saturación + despill de color) y se generó el set completo de
  íconos (`icon-192`, `icon-512`, `icon-maskable-512` con zona segura, `apple-touch-icon` con fondo
  sólido). El componente `Logo` (`src/components/icons.tsx`) ahora usa la marca nueva en vez del
  placeholder SVG anterior — se propaga automáticamente a login, 404, error, offline, bienvenida,
  invitaciones y el portal de seguimiento (como *fallback* cuando el negocio no subió su propio
  logo).
- **Pantalla de inicio pública** (`src/app/page.tsx`): si hay sesión, redirige a `/inicio` como
  antes; si no, muestra una landing simple (encabezado, hero, 4 tarjetas de funciones, pie con
  enlace a la política) — sin prometer autoregistro masivo, con "Tengo una invitación" como CTA
  secundaria hacia `/registro`.
- **Nueva página `/privacidad`**: tratamiento de datos encuadrado en uso privado (Ley 1581 de 2012
  / Habeas Data Colombia), aclarando que el negocio titular es responsable del tratamiento y HEBRA
  es encargado del tratamiento; cubre qué datos se recopilan (cuenta, operación, clientes finales
  del negocio), para qué se usan, dónde se almacenan (Supabase, RLS) y derechos del titular. Se
  enlaza desde el pie de la portada y desde el formulario de registro.
- **Bug real encontrado al verificar:** el middleware (`src/proxy.ts`) redirigía a `/login`
  cualquier ruta no listada explícitamente en `PUBLIC_PATHS` para usuarios sin sesión — `/` y
  `/privacidad` no estaban ahí, así que la nueva portada nunca se habría visto en la práctica.
  Corregido agregando `/privacidad` a la lista y tratando `/` como coincidencia exacta (no
  `startsWith`, que habría hecho público todo el sitio).
- `npm run lint`/`test` (78/78)/`build` pasan limpio.

## Mejora fuera del roadmap — Auditoría mockup-vs-real, Fase 4: Recetario → Costeo (2026-10-13)

- **Bug real corregido:** la barra de "Tiempo real por tejedora" (`recipe-editor.tsx`) calculaba el
  % de ancho al revés — la persona más rápida llenaba la barra al 100% en vez de la más lenta.
  Invertido para que el ancho represente cuánto tardó cada quien, fiel a `Ent-Costeo.dc.html`.
- Nueva acción `duplicateProduct`: clona un patrón completo (receta + insumos) como
  "{nombre} (copia)", botón "Duplicar como variante" en el encabezado del editor.
- **Bug real encontrado en la propia verificación del punto anterior:** el primer intento de
  `duplicateProduct` copiaba el producto pero no sus líneas de insumos — el insert a
  `product_supplies` le faltaba `tenant_id` (columna requerida, mismo patrón que
  `upsertRecipeLine`) y el error no se estaba revisando, así que fallaba en silencio. Corregido:
  se agrega `tenant_id` y se revisa el error, lanzando un mensaje claro si falla.
- Fuera de esta fase (documentado, no inventado): mover "Publicar precio" al encabezado (ya es
  visible permanentemente por estar en el panel lateral `sticky`, así que el beneficio real es
  bajo frente al riesgo de reestructurar el estado del simulador); persistir "Gastos fijos de la
  sede" como dato real (requeriría un campo nuevo en `tenants`/`locations`); SKU (no existe en el
  modelo de `products`).
- `npm run lint`/`test` (78/78)/`build` pasan limpio.

## Mejora fuera del roadmap — Auditoría mockup-vs-real, Fase 3: Insumos → Inventario (2026-10-13)

`supplies` ya era por-lote-por-sede desde la migración 0001 (sin migración nueva): la reescritura
fue de presentación, pasando de tarjetas por insumo a una tabla por lote, fiel a
`Ent-Inventario.dc.html`.

- `supplies-view.tsx`: tabla (`DataTable`) con columnas Insumo | Sede (solo con "Todas las sedes"
  activo) | Lote | Stock vs. reorden | Costo u. | Valor | Estado.
- Estado de 3 niveles (Agotado/Reordenar/Disponible) reemplaza el booleano "por agotarse" anterior.
- `ProgressBar` ganó un `markerPct` opcional (línea vertical de punto de reorden), sin afectar sus
  otros usos.
- Botón renombrado "Nueva compra" → "Registrar compra".
- **Bug real encontrado y corregido en el componente compartido `DataTable`:** las columnas no
  tenían separación horizontal (se veían pegadas, ej. "ValorEstado") — afectaba también la tabla
  "Rentabilidad por producto" de Analítica/Inicio. Corregido con padding horizontal en el propio
  componente.
- Fuera de esta fase (documentado, no inventado): KPI "Rotación promedio" (no hay historial de
  consumo por período, solo stock actual); botón "Revisar"/ETA en órdenes de compra; mover
  "Transferir entre sedes" al header (se queda donde ya funciona, sin duplicar el punto de entrada).
- `npm run lint`/`test` (78/78)/`build` pasan limpio.

## Mejora fuera del roadmap — Auditoría mockup-vs-real, Fase 2: Analítica (2026-10-13)

El plan original proponía mover el panel ejecutivo de `/inicio` a `/analitica` (que es donde el
mockup `Ent-Dashboard.dc.html` y el nav lo ubican). El usuario corrigió eso a mitad de
implementación: **`/inicio` no se toca**. Se revirtió ese cambio y en su lugar `/analitica` quedó
con una copia fiel del mismo panel (KPIs, gráfico ingresos/utilidad, "Necesitan atención",
rentabilidad por producto, ventas por canal, inventario crítico) — Titular/Administración ven el
mismo contenido en ambos lugares.

- `/analitica` reescrita completa con el contenido fiel al mockup.
- Se agregaron las 2 acciones que el mockup pedía y faltaban, ambas conectadas a funcionalidad
  real ya existente (sin duplicar lógica): "Reasignar automáticamente" en "Necesitan atención"
  (enlaza a `/pedidos?view=capacity`, que ahora soporta abrir directo en la vista Capacidad — la
  sugerencia real ya existía ahí, `suggestReassignment`/`applySuggestion`, de la Fase 3) y "Crear
  orden de compra" en "Inventario crítico" (enlaza a `/insumos`, donde ya vive el flujo real de
  órdenes de compra).
- `npm run lint`/`test` (78/78)/`build` pasan limpio.

## Fase 8 — Móvil por rol y portal del cliente (2026-10-11)

Las Fases 6 y 7 siguen excluidas, así que el roadmap saltó directo de la 5 a la 8. Los 3 mockups
(`Ent-Movil-Turno`, `Ent-Movil-Pedido`, `Ent-Portal`) asumen anticipos/pasarela de pago (Wompi/PSE/
Nequi) — exactamente lo que excluyen esas dos fases. Se resolvió con **saldo real sin pasarela**:
el saldo se calcula de verdad como `precio×cantidad − Σ transacciones de ingreso ligadas al pedido`
(reutilizando `transactions.order_id`, que ya existía) y el botón de pago se volvió un mensaje de
WhatsApp prellenado con el monto, no un cobro real.

- Migración `0013`: `product_steps` (pasos del patrón) + `order_step_progress` (marcado por pedido,
  vía RPC `toggle_order_step`, sin insert/update/delete directo). `orders.tracking_token` (token
  aleatorio, autogenerado con `gen_random_uuid()`, no `gen_random_bytes` — pgcrypto no está en el
  search_path de las funciones `security definer` de este proyecto) y `orders.progress_photo_url`.
  RPC `get_order_tracking` (autoriza por token, no por sesión, igual que `accept_invitation`;
  proyecta solo los campos mínimos del mockup, nunca `select *`) y `get_order_balance`/
  `register_order_payment` para el saldo real. Bucket de Storage `avance` (foto de avance), mismo
  patrón que el bucket `logos`.
- **"Mi turno"** (`src/app/(app)/inicio/shift-home.tsx`): nueva vista de Inicio solo para tejedora
  (antes compartía `SimpleHome` con Ventas). No se creó el bottom-nav de 4 pestañas del mockup (Mi
  turno/Tareas/Patrones/Perfil) — se reutiliza el actual (Tareas ya es Pedidos propio, Patrones ya es
  Recetario), mismo criterio de "evolucionar, no bifurcar" de toda la sesión. Cronómetro con barra de
  progreso contra la meta del patrón, pasos del patrón marcables, una sola foto de avance (no
  galería).
- Editor de pasos en Recetario (`product_steps` no tenía ninguna UI para crearse — se agregó, mismo
  patrón que el gap de proveedores encontrado en la Fase 5).
- Detalle de pedido móvil nuevo (`/pedidos/[id]`, no existía): línea de tiempo, alerta de riesgo
  (reutiliza `ordersAtRisk` de `analytics.ts`), tarjeta de pago con saldo real y registro de abonos,
  "Compartir seguimiento", reutiliza `moveOrder`/`assignOrder`/`markPaid` ya existentes de Pedidos.
- Portal público `/seguimiento/[token]` (fuera de `(app)`, agregado a `PUBLIC_PATHS` en `proxy.ts`):
  sin sesión, por token.
- **Bug real encontrado en la verificación con el servidor real:** el helper `revalidate()` de
  `pedidos/actions.ts` solo llamaba `revalidatePath("/pedidos")`, que no revalida la ruta dinámica
  `/pedidos/[id]` — así que registrar un abono desde el propio detalle del pedido no actualizaba el
  saldo en pantalla (sí quedaba guardado en la base, solo no se reflejaba). Se corrigió agregando
  `revalidatePath("/pedidos/[id]", "page")` al helper compartido.
- Verificado de punta a punta con datos reales: cronómetro + pasos + foto en "Mi turno" (persistidos
  tras recargar); dos abonos reales ($20.000 + $10.000) reflejados correctamente en el saldo
  ($45.000 → $15.000); portal abierto en un contexto de Playwright sin `storageState` (sin sesión)
  mostrando exactamente el saldo real y nada más que los campos del mockup; token inválido → 404.
- `npm run lint`/`test` (64/64, +8 nuevas de `tracking.ts`)/`build` pasan limpio. Casilla de la Fase
  8 marcada en `docs/ROADMAP.md`.

## Fase 5 — Inventario multisede (2026-10-11)

Antes de diseñar nada se revisó a fondo el esquema de `supplies` porque esta fase toca el corazón
del costeo. Dos hallazgos clave: `supplies.unit_cost` ya es una columna generada
(`total_cost / quantity_purchased`), así que el costo promedio ponderado sale solo con que cada lote
nuevo sume su cantidad y su valor al agregado — no hizo falta tocar esa columna ni reescribir nada.
Y `consume_order_supplies` (el trigger que descuenta insumos al enviar un pedido, desde el MVP) no
se tocó en absoluto.

- Migración `0012`: `suppliers`, `supply_lots` (historial de recepción, no fuente de verdad del
  stock), `purchase_orders` + `purchase_order_lines` (flujo borrador → por_aprobar → en_tránsito →
  recibida), `stock_transfers`. RPCs `advance_purchase_order` (valida la transición y el rol; al
  llegar a "recibida" crea el lote y sube `quantity_purchased`/`total_cost`/`quantity_remaining`) y
  `complete_transfer` (resta del origen, busca o crea la fila destino por nombre+unidad+sede). Trigger
  `supplies_reorder_check`: al cruzar `low_stock_threshold` por debajo, crea una OC borrador
  automática de una sola línea si no hay ya una abierta para ese insumo.
- `src/lib/inventory.ts`: `needsReorder`, `suggestTransfer` (heurística sede-con-excedente →
  sede-con-pedido-bloqueado), `blockedOrders`. Con 8 pruebas.
- `/insumos` extendido (no se creó `/inventario` nueva, mismo criterio de las Fases 2 y 3): 4 KPIs
  (valor de inventario, bajo punto de reorden, OCs abiertas, proveedores), panel de **Órdenes de
  compra** con botones de avance por estado, panel de **Transferir entre sedes** (manual + sugerida),
  selector de proveedor en "Nueva compra".
- **Bug real encontrado en verificación en vivo**: el botón de avanzar una OC llamaba al server
  action directo desde un `onClick` sin `useTransition`, así que la revalidación del `po.status` no
  quedaba coordinada con la propia llamada — al avanzar dos estados seguidos rápido, el segundo click
  todavía veía el estado anterior y reenviaba la misma transición (el RPC la rechazaba, y el error
  quedaba sin capturar). Se corrigió envolviendo `advance`/`applySuggestion` en `useTransition` +
  manejo de error con `alert`, igual que el patrón ya usado en `deleteSupply`.
- **Gap real encontrado**: `createSupplier` existía en `actions.ts` desde el plan pero no estaba
  conectado a ninguna UI — no había forma de crear un proveedor. Se agregó una sección "Proveedores"
  en el panel de Insumos (lista + alta rápida), siguiendo el mismo patrón de `ChannelsSection`.
- Verificado en vivo contra datos reales (no solo build/tests): ciclo completo de una OC
  (borrador→recibida) con costo promedio ponderado exacto ($150→$160/g al recibir 50g a $180);
  reorden automático disparado al cruzar el umbral (OC de 250g = `greatest(umbral·2−restante, umbral)`);
  transferencia manual entre Principal y Bogotá moviendo stock real entre dos filas de `supplies`.
- Fuera de esta fase, a propósito: crear un insumo nuevo desde una OC (se sigue usando "Nueva
  compra"), agrupar varios insumos en una OC automática, "rotación promedio" (necesitaría historial
  de valor de inventario que no se guarda), deshacer una transferencia o recepción confirmada.

## Fase 4 — Recetario, costeo y simulador (2026-10-11)

Simulador de precio nuevo en Recetario, con margen **sobre precio de venta** (no sobre costo, como
el anterior), usando la fórmula exacta de `Ent-Costeo.dc.html`: reproducida a mano con los datos de
ejemplo del criterio de aceptación da exactamente $85.400, y quedó cubierta por una prueba que
verifica ese número exacto.

- Migración `0011`: tabla `sales_channels` (canales de venta configurables, con backfill de los 4
  del mockup para tenants existentes), tabla `product_versions` (cada "Publicar precio" crea una
  versión, con el desglose completo del costo) + RPC `publish_product_version`. De paso se corrigió
  `create_tenant()`: los negocios nuevos no estaban recibiendo la sede "Principal" (gap real de la
  Fase 1 que solo se backfilleó para los tenants que existían en ese momento) — ahora también siembra
  los 4 canales de ejemplo.
- `src/lib/costing.ts`: `simulatorPrice()` (la fórmula completa, con IVA aparte del margen — no es
  ganancia del negocio) y `averageSecondsPerPiece()` (tiempo real por tejedora, solo cuenta sesiones
  de cronómetro vinculadas a un pedido — las sueltas de Recetario son para afinar la receta, no
  producción real). Con pruebas.
- `CostingSimulator` nuevo reemplaza las secciones viejas de costo/precio en el editor de receta:
  steppers de tiempo/valor-hora, canales (`ChoiceCard` de la Fase 0, por fin conectado), 4 botones de
  margen, switch de IVA (`Toggle` de la Fase 0, también por fin conectado), barra de composición del
  precio, punto de equilibrio con un campo manual de gastos fijos (no hay un lugar donde guardar eso
  todavía — es más de Finanzas, Fase 6, excluida por ahora), y "Publicar precio".
- Nueva sección "Tiempo real por tejedora" en Recetario, con el aviso de cuánto costaría la pieza si
  todo el equipo tejiera al ritmo de la más rápida — calculado de verdad, no un texto fijo.
- Canales de venta configurables en Configuración (`ChannelsSection`); el selector de canal del
  formulario de pedidos pasa de una lista fija a estos mismos canales.
- **Bug real encontrado y corregido durante la verificación con el servidor real:** el switch de
  IVA tenía un `<button>` dentro de otro `<button>` (HTML inválido), causando un error de hidratación
  en React que dejaba la pantalla en skeleton de carga. Se cambió el contenedor externo a `<div>`.
- Verificado de punta a punta: el simulador con los datos reales de un patrón calculó exactamente lo
  mismo que a mano; "Publicar precio" creó la versión, actualizó el precio vigente del patrón, y
  "Versión N · vigente" se mantuvo después de recargar la página.
- `npm run lint`/`test` (49/49, +8 nuevas de `costing.ts`)/`build` pasan limpio. Casilla de la
  Fase 4 marcada en `docs/ROADMAP.md`.

## Fase 3 — Producción y capacidad (2026-10-10)

Tejedora asignada a pedidos, horas estimadas, avance real y vista de Capacidad, usando
`Ent-Produccion.dc.html` como referencia. Se construyó dentro de `/pedidos` (su tablero Kanban ya
existía desde el MVP) en vez de una ruta `/produccion` separada, con un toggle "Tablero / Capacidad"
— el propio mockup ya modela esto como una sola pantalla con dos vistas, no dos rutas.

- Migración `0010`: `orders.assigned_to`, `timer_sessions.order_id` (el cronómetro ahora se puede
  vincular a un pedido específico), tabla `availability` (disponibilidad semanal recurrente por
  persona y día, cada quien edita la suya, Propietaria/Administración cualquiera). `log_timer_session`
  solo suma al costo del patrón (`products.labor_seconds`) cuando la sesión **no** tiene pedido
  asociado — si sumara también con pedido, el costo se inflaría cada vez que se produce, no solo al
  afinar la receta. Verificado con el servidor real: 25 min de trabajo del patrón, antes y después de
  correr el cronómetro vinculado a un pedido desde el tablero, sin cambiar.
- `src/lib/production.ts` nuevo (con pruebas): horas estimadas, % de avance, urgencia de vencimiento,
  totales semanales de disponibilidad/carga, y una heurística simple de reparto (la persona más
  sobrecargada → la más holgada, su pedido más grande que quepa y no haya empezado).
- Tablero: tarjetas con código corto, avance real, tejedora asignada, y filtros (buscador, tejedora,
  canal, "en riesgo" — reutiliza `ordersAtRisk` de la Fase 2). Vista Capacidad: grilla de
  disponibilidad editable, "Capacidad semanal" y tarjeta de sugerencia con "Aplicar cambio".
- Se resolvieron dos simplificaciones documentadas en fases anteriores precisamente porque dependían
  de esto: tejedora ahora solo ve en el tablero sus pedidos asignados + los sin asignar (Fase 1,
  verificado con la cuenta de prueba); "Necesitan atención" ahora tiene las 4 reglas del mockup, no
  solo 2 (Fase 2) — "sin asignar · vence pronto" y sobrecarga semanal, sin inventar un reparto día a
  día (ver nota en `docs/bitacora.md` sobre por qué la grilla de Capacidad no simula eso).
- Verificado de punta a punta con el servidor real: asignar una tejedora, iniciar/detener el
  cronómetro de un pedido desde el tablero (avance sube, costo del patrón intacto), configurar
  disponibilidad para dos personas, ver aparecer la sugerencia de reparto con el texto correcto, y
  confirmar con una navegación nueva que "Aplicar cambio" reasignó el pedido de verdad.
- `npm run lint`/`test` (44/44)/`build` pasan limpio. Casilla de la Fase 3 marcada en
  `docs/ROADMAP.md`.

## Fase 2 — Panel ejecutivo (2026-10-10)

`/inicio` se bifurca por permiso (`view_finance`): Propietaria y Administración ven el panel
ejecutivo nuevo; Ventas y Tejedora siguen viendo exactamente el inicio simple del MVP, sin ningún
dato financiero nuevo. El mockup `Ent-Dashboard.dc.html` pide varias cosas
que dependen de datos de la Fase 3 (capacidad del taller con disponibilidad real, tejedora asignada,
"reasignar automáticamente") — se documentaron como fuera de alcance en vez de simularlas; la tarjeta
"Capacidad del taller" se reemplazó por "Cartera pendiente" (dato real que ya existía).

- Migración `0009`: `orders.channel` (texto, nullable) para "Ventas por canal" — selector nuevo en el
  formulario de pedido (Instagram/WhatsApp/Tienda y ferias/Tienda online/Otro).
- `src/lib/analytics.ts` nuevo: variación %, reglas de "Necesitan atención" (vence pronto, insumo
  agotado — las otras dos reglas del mockup necesitan la Fase 3), rentabilidad por producto con
  alerta de margen objetivo, ventas por canal, reagrupado de la serie diaria por período (7d/12s/12m).
  Con pruebas.
- `RevenueProfitChart` nuevo en `src/components/charts.tsx`: ingresos y utilidad con pestañas de
  período (usa el `SegmentedControl` de la Fase 0, que seguía sin conectar a nada).
- 4 KPIs con variación real, "Necesitan atención", "Rentabilidad por producto" (tabla con
  `DataTable`, también sin usar desde la Fase 0), "Ventas por canal" e "Inventario crítico" —
  reutilizan `KpiCard`, `Panel`, `AlertRow`, `ProgressBar` de la Fase 0.
- Todo respeta el selector de sede global de la Fase 1 (cookie `hebra_location`), sin un selector
  nuevo en esta pantalla.
- Verificado con el servidor real: el panel carga sin errores con datos escasos (estados vacíos
  correctos en cada sección), un pedido nuevo con canal aparece en "Ventas por canal" al marcarlo
  pagado, y la cuenta tejedora de prueba de la Fase 1 sigue viendo el inicio simple sin fuga de datos
  financieros.

## Fase 1 — Sedes, roles y equipo (2026-10-10)

Evolucionó el equipo/roles del MVP (owner/admin/staff) hacia el modelo de 4 roles del roadmap
(Propietaria/Administración/Ventas/Tejedora) con la matriz exacta de `Ent-Equipo.dc.html`, en vez de
reescribirlo — ver `docs/ESTADO.md`. Migraciones `0006`–`0008`: tabla `locations` (sede "Principal"
por tenant, backfill), `location_id` en supplies/orders/transactions/timer_sessions/memberships/
invitations, roles `ventas`/`tejedora` nuevos, gestión de equipo apretada a solo Propietaria (antes
también Administración podía — corregido contra la matriz real del mockup), remisiones restringidas
a owner/admin/ventas a nivel de base, y un fix al token de invitación que usaba una función de
`pgcrypto` no disponible en el `search_path` de la función.

`src/lib/permissions.ts` nuevo: la matriz de 8 permisos × 4 roles como código, con pruebas (las 32
celdas). Recetario deja de mandar costo/margen/valor-hora a quien no tiene `view_costs`/
`edit_recipes` — ni en la UI ni en la consulta a la base, con una vista de solo lectura
(`RecipeViewer`) para ventas/tejedora que conserva el cronómetro de talento. El botón de Remisión en
Pedidos y el acceso a Caja/Analítica/Configuración ahora se gatean con la misma matriz. Selector de
sede global en la barra superior (persistido en cookie) que filtra Insumos/Pedidos/Caja de verdad,
con una pantalla "Sedes" para crear sedes nuevas y una pestaña "Roles y permisos" en Equipo que
muestra la misma matriz.

Verificado de punta a punta con Playwright: invitación → registro → aceptación real para una cuenta
tejedora y una ventas, confirmando que ninguna ve costos/finanzas por UI ni en las respuestas de red,
que ventas sí puede emitir remisión y tejedora no, y que el filtro de sede funciona con una segunda
sede real. En el camino se corrigieron dos bugs reales encontrados por esa verificación (no solo por
lectura de código): el enlace "Crea tu cuenta" en `/login` perdía el token de invitación al pasar por
ahí sin sesión, y el selector de sede no se resincronizaba visualmente tras elegir una sede.

## Fase 0 — Sistema de diseño y nuevo layout (2026-10-10)

Las 7 pantallas del MVP (Inicio, Insumos, Recetario, Pedidos, Clientes, Caja, Configuración) ya
usan el sistema de diseño Enterprise: tokens exactos de `docs/DESIGN.md` en `globals.css` (sin
sombras fuertes, radios 16/10/8px, Geist + Geist Mono + Fraunces), menú lateral oscuro `AppSidebar`
con grupos OPERACIÓN/NEGOCIO y badge de pedidos activos, `TopBar` con migas de pan, paleta de
comandos ⌘K funcional, y 16 componentes base nuevos en `src/components/ui/` (algunos ya conectados
— `StatusChip`-equivalente, `ProgressBar`, `Avatar` — y otros listos para las fases 1-4). Ninguna
pantalla cambió de funcionalidad, solo de apariencia. Verificado con capturas de pantalla reales
(Playwright) en claro/oscuro y escritorio/móvil, además de `npm run lint/test/build`.

Reemplaza por completo el rediseño visual anterior (terracota/salvia con sombras, DM Sans) que no
seguía `DESIGN.md` — ver `docs/bitacora.md` para el detalle de esa decisión.
