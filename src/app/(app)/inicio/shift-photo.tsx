"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { IconOvillo } from "@/components/icons";
import { uploadProgressPhoto } from "./actions";

export function ShiftPhoto({ orderId, photoUrl }: { orderId: string; photoUrl: string | null }) {
  const [url, setUrl] = useState(photoUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = async (file: File) => {
    setBusy(true);
    setError(null);
    const fd = new FormData();
    fd.set("photo", file);
    const res = await uploadProgressPhoto(orderId, fd);
    setBusy(false);
    if (res.error) setError(res.error);
    else setUrl(URL.createObjectURL(file));
  };

  return (
    <section className="flex flex-col gap-3">
      <h2 className="font-display text-xl font-semibold">Foto de avance</h2>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="card relative flex aspect-video w-full items-center justify-center overflow-hidden border-dashed p-0"
      >
        {url ? (
          <Image src={url} alt="Avance del pedido" fill unoptimized className="object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-2 text-muted">
            <IconOvillo size={28} />
            <span className="text-sm">{busy ? "Subiendo…" : "Toca para subir una foto"}</span>
          </span>
        )}
      </button>
      {error && <p className="text-sm text-danger-ink">{error}</p>}
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) pick(file);
          e.target.value = "";
        }}
      />
    </section>
  );
}
