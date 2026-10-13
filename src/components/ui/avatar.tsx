/** DESIGN.md §2: paleta de personas — hash del id, siempre el mismo color para la misma persona. */
const PALETTE = ["#6E4A3A", "#4E6E5B", "#8A6A3B", "#5A5E7A", "#7A4A5E", "#4D4741"];

function colorFor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export function Avatar({ id, name, size = 36, avatarUrl }: { id: string; name: string; size?: number; avatarUrl?: string | null }) {
  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt=""
        aria-hidden="true"
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white"
      style={{ width: size, height: size, background: colorFor(id), fontSize: Math.round(size * 0.4) }}
      aria-hidden="true"
    >
      {initialsOf(name)}
    </span>
  );
}

/** Pila con solapamiento −6px y borde del color de fondo (DESIGN.md §6). */
export function AvatarStack({ people }: { people: { id: string; name: string }[] }) {
  return (
    <div className="flex items-center">
      {people.map((p, i) => (
        <span key={p.id} className="rounded-full ring-2 ring-surface" style={{ marginLeft: i === 0 ? 0 : -6 }}>
          <Avatar id={p.id} name={p.name} size={28} />
        </span>
      ))}
    </div>
  );
}
