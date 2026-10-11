# HEBRA Enterprise — Sistema de diseño

Extraído de los mockups aprobados (`docs/mockups/`). Úsalo para los tokens de `src/app/globals.css`
y para los componentes de `src/components/ui/`. Ante cualquier duda, el mockup manda.

## 1. Dirección visual

Profesional y cálido a la vez: lienzo lino, superficies blancas con bordes finos, menú lateral oscuro
tipo espresso, títulos en serif (Fraunces) e interfaz en Geist. Nada de degradados, sombras fuertes,
bordes de color a la izquierda de las tarjetas ni emojis. El color se reserva para estados y datos.

## 2. Color

### Tema claro (por defecto)

| Token | Hex | Uso |
|---|---|---|
| `bg` | `#F8F5EF` | Fondo del área de trabajo |
| `surface` | `#FFFFFF` | Paneles y tarjetas |
| `surface-muted` | `#F4EFE7` | Controles segmentados, avisos neutros |
| `track` | `#F1ECE4` | Fondo de barras de progreso, columnas Kanban |
| `border` | `#EAE3D8` | Borde de paneles, separador del encabezado |
| `border-strong` | `#E2D9CC` | Borde de botones secundarios e inputs |
| `divider` | `#F2EDE5` | Líneas entre filas de tablas |
| `ink` | `#26221F` | Texto principal; botón oscuro |
| `ink-2` | `#4D4741` | Texto secundario |
| `muted` | `#7A7168` | Etiquetas, metadatos (cumple AA sobre blanco) |
| `primary` | `#A4533D` | Botón principal, enlaces, selección |
| `primary-hover` | `#7E3D2C` | Hover de enlaces; texto sobre `primary-soft` |
| `primary-soft` | `#F6E9E2` | Fondo de opción seleccionada |
| `accent` | `#C97A63` | Acento decorativo, serie "en proceso" |
| `accent-light` | `#E2A285` | Ícono activo del menú; botón sobre fondo oscuro |
| `income` | `#EBCDBF` | Barra de ingresos en gráficos |
| `success` / `success-ink` / `success-soft` | `#4E6E5B` / `#3F5A4A` / `#E7EFE9` | Positivo, disponible, aceptado |
| `warning` / `warning-ink` / `warning-soft` | `#B7791F` / `#7A4F0E` / `#FBF0DC` | Alerta, reordenar, por aprobar |
| `danger` / `danger-ink` / `danger-soft` | `#B23A2E` / `#8C2E24` / `#FBE7E4` | Riesgo, agotado, rechazado |
| `danger-tint` / `danger-tint-border` | `#FDF6F4` / `#F3DCD7` | Filas de alerta en listas |
| `warning-tint` / `warning-tint-border` | `#FEFAF1` / `#F3E4C4` | Filas de advertencia en listas |
| `night` / `on-night` / `on-night-muted` | `#26221F` / `#F3EAE0` / `#BFB2A4` | Tarjetas de sugerencia y simulador |

### Menú lateral (igual en tema claro y oscuro)

| Token | Hex |
|---|---|
| `sidebar-bg` | `#1E1916` |
| `sidebar-raised` | `#261F1B` (selector de negocio, tarjeta "Taller en vivo") |
| `sidebar-border` | `#332A25` |
| `sidebar-active` | `#2F2723` (fondo del ítem activo) |
| `sidebar-text` | `#EDE3D6` · activo `#FFF5EC` |
| `sidebar-text-2` | `#CDBFAF` (ítems inactivos) |
| `sidebar-muted` | `#A8988A` |
| `sidebar-label` | `#7D6F63` (títulos de grupo OPERACIÓN / NEGOCIO) |
| `sidebar-icon-active` | `#E2A285` |

### Tema oscuro ("modo nocturno cálido")

Conserva el del MVP para superficies (`bg #231C19`, `surface #2E2622`, `border #3A302B`,
`ink #EFE5D8`, `muted #BDAE9C`, `primary #D9A77F` con texto `#231C19`). Los colores de estado
se aclaran para mantener contraste AA sobre `#2E2622`. El menú lateral no cambia.

### Paleta de personas (avatares)

`#6E4A3A`, `#4E6E5B`, `#8A6A3B`, `#5A5E7A`, `#7A4A5E`, `#4D4741`, con iniciales blancas. Asignar por
hash del id del usuario, siempre el mismo color para la misma persona.

## 3. Tipografía

Google Fonts: **Fraunces** (opsz 9..144; 400/500/600), **Geist** (400/500/600), **Geist Mono** (400/500).

| Rol | Fuente | Tamaño / peso | Notas |
|---|---|---|---|
| Título de página (H1) | Fraunces | 36 px / 400, tracking −0.5 px | 30 px en móvil |
| Cifra KPI | Fraunces | 28–30 px / 500 | `tabular-nums` |
| Cifra destacada (precio, cronómetro) | Fraunces | 40–44 px / 400 | |
| Título de panel (H2) | Geist | 16 px / 600 | |
| Texto base | Geist | 14 px / 400 | |
| Secundario | Geist | 13 px | color `muted` o `ink-2` |
| Pie / metadatos | Geist | 12 px | |
| Etiqueta de grupo | Geist | 11 px / 600, MAYÚSCULAS, tracking 1 px | color `sidebar-label` |
| IDs, SKU, lotes, atajos | Geist Mono | 11–13 px | |

## 4. Forma y espacio

- Radios: paneles **16 px** · tarjetas internas **12 px** · botones e inputs **10 px** · controles pequeños **8 px** · chips **999 px**.
- Página: padding `20px 32px 40px`; gap vertical entre bloques 22–24 px; gap entre paneles 16 px.
- Paneles: `surface` + borde 1 px `border`, padding 20 px. Sin sombra (solo la pestaña activa del control segmentado lleva `0 1px 2px rgba(38,34,31,.08)`).
- Botones: alto 40 px en escritorio (38 en la barra superior), 44–48 px en móvil.
- Menú lateral: 248 px; ítems de 40 px de alto, padding 0 12 px, radio 10 px, gap ícono-texto 12 px.

## 5. Layout

- Escritorio: `[menú lateral 248px][contenido fluido]`. Contenido: barra superior (migas de pan a la
  izquierda; sede, rango de fechas y notificaciones a la derecha, con borde inferior), encabezado
  (H1 + subtítulo a la izquierda, acciones a la derecha), luego filas de paneles con `flex-wrap`
  (proporción típica 2:1, mínimos 560 px y 320 px).
- KPIs: grilla `repeat(auto-fit, minmax(220px, 1fr))`.
- Tablas anchas: dentro de un contenedor `overflow-x: auto` con ancho mínimo.
- Menos de 768 px: el menú lateral se convierte en barra inferior (como el MVP) con los ítems que el rol puede ver.

## 6. Componentes (crear en `src/components/ui/`)

| Componente | Referencia en mockup | Detalles clave |
|---|---|---|
| `AppSidebar` | todas las pantallas de escritorio | Selector de negocio (logo 38 px terracota + nombre + "Enterprise · N sedes"), botón "Buscar o ejecutar… ⌘K", grupos OPERACIÓN / NEGOCIO, badge numérico terracota en Producción, tarjeta "Taller en vivo", usuario al pie |
| `TopBar` | todas | Migas de pan 13 px; botones 38 px con ícono 15 px |
| `PageHeader` | todas | H1 Fraunces + subtítulo 15 px `ink-2` + acciones |
| `KpiCard` | Panel, Inventario, Finanzas | Etiqueta 13 px `muted`, chip de variación, cifra Fraunces, sparkline o barra opcional |
| `Panel` | todas | Contenedor con título H2 y acción opcional a la derecha (enlace 13 px) |
| `SegmentedControl` | Panel (periodo), Producción, Inventario, Finanzas | Fondo `surface-muted`, padding 3 px, pestaña activa blanca con sombra mínima; `role="tablist"` |
| `Tabs` (subrayado) | Equipo | Subrayado 2 px `primary` en la activa |
| `StatusChip` | todas | Variantes `success`, `warning`, `danger`, `neutral`, `dark`; 11–12 px / 600 |
| `ProgressBar` | varias | Alto 5–8 px, fondo `track` |
| `DataTable` | Panel, Inventario, Finanzas, Equipo | Encabezado 13 px `muted` con borde inferior `border`; filas con `divider`; números a la derecha |
| `KanbanColumn` / `OrderCard` | Producción | Columna `track` radio 16; tarjeta con ID mono, chip de vencimiento, cliente·canal, barra de avance, horas, avatar, precio |
| `CapacityGrid` | Producción › Capacidad | Celdas 38 px: 0 h `#F7F4EF`, ≤6 h `success-soft`, ≤8 h `#F6DFC9`, >8 h `#E9B3A8` |
| `Stepper` | Simulador | Botones −/+ de 40 px sobre `bg` |
| `ChoiceCard` | Simulador (canal) | Seleccionado: borde 2 px `primary` + `primary-soft` |
| `Toggle` | Simulador (IVA), Seguridad | Pista 40×22, perilla 16 px; activo `primary`, inactivo `#D9CFC2`; `aria-pressed` |
| `InsightCard` | Panel, Producción, Inventario | Fondo `night`, título 13 px `accent-light`, texto 14 px, botón `accent-light` con texto `ink` |
| `AlertRow` | Panel ("Necesitan atención") | Punto de estado 8 px + título 600 + detalle 13 px sobre `danger-tint` / `warning-tint` |
| `Avatar` / `AvatarStack` | varias | Iniciales; pila con solapamiento −6 px y borde del color de fondo |
| `ThreadLine` | móvil, pedidos | Hebra ondulada SVG como línea de tiempo (identidad de marca) |

Íconos: trazo 1,7–1,8, `currentColor`, 18 px en el menú. Íconos de nicho: ovillo = Inventario,
agujas cruzadas = Ajustes, hebra = Producción/Pedidos. Reutiliza `src/components/icons.tsx`.

## 7. Gráficos (sin librería)

- **Barras apiladas** (Ingresos y utilidad): columna `income` con la porción de utilidad `primary` abajo; líneas guía punteadas `#EFE9E0`; etiqueta 11 px bajo cada barra; tooltip con valores.
- **Sparkline**: SVG 200×36 sin ejes, trazo 2 px y relleno al 8 % del mismo color.
- **Cascada** (Finanzas): verde para ingresos y utilidad, terracotas/gris para descuentos, cifra encima.
- **Barra de composición** (precio, cartera, estados de pedidos): una barra de 8–14 px dividida en segmentos con leyenda.
- Todos los gráficos llevan `role="img"` y un `aria-label` que dice los valores.

## 8. Contenido

- Los mockups usan un negocio de ejemplo ("Ovillo Studio", 3 sedes) y cifras inventadas pero
  coherentes. En el producto real todo viene de la base de datos; usa esos datos solo como **seed** de desarrollo.
- Los textos de interfaz del mockup son el copy aprobado: cópialos tal cual.
