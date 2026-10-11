# Mockups aprobados — cómo leerlos

Estas son las pantallas Enterprise diseñadas para HEBRA. Son la referencia visual: el código debe
quedar igual. Cada archivo es **una pantalla** en formato `.dc.html` (Design Component):

- El HTML dentro de `<x-dc>` es la pantalla. **Los estilos inline son la especificación**: colores hex,
  tamaños, radios, paddings, gaps y fuentes exactos. Pásalos a clases de Tailwind / tokens de `DESIGN.md`.
- `{{nombre}}` es un valor que calcula la función `renderVals()` del `<script>` al final del archivo.
  Ese script es la referencia de la **lógica de la interacción** (simulador, pestañas, filtros, cronómetro).
- `<sc-for list="{{items}}" as="item">` = un `.map()`; `<sc-if value="{{cond}}">` = renderizado condicional.
- `<script src="./support.js">` y `<helmet>` son del visor de mockups: ignóralos (las fuentes se cargan en el layout de la app).
- Los datos ("Ovillo Studio", personas, cifras) son de ejemplo: en la app salen de Supabase.

| Archivo | Pantalla | Ruta sugerida |
|---|---|---|
| `Ent-Dashboard.dc.html` | Panel ejecutivo | `/inicio` (owner/admin) |
| `Ent-Produccion.dc.html` | Producción: tablero y capacidad | `/produccion` |
| `Ent-Costeo.dc.html` | Recetario: costeo y simulador | `/recetario/[id]` |
| `Ent-Inventario.dc.html` | Inventario multisede | `/inventario` |
| `Ent-Finanzas.dc.html` | Finanzas y facturación | `/finanzas` |
| `Ent-Equipo.dc.html` | Equipo, roles, integraciones, seguridad | `/ajustes` |
| `Ent-Movil-Turno.dc.html` | Móvil · Mi turno (tejedora) | `/inicio` (rol tejedora) |
| `Ent-Movil-Pedido.dc.html` | Móvil · Detalle de pedido | `/pedidos/[id]` |
| `Ent-Portal.dc.html` | Portal público del cliente | `/seguimiento/[token]` |

Para ver las pantallas renderizadas, abre el lienzo del mockup (página "Enterprise").
