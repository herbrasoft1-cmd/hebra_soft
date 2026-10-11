"use client";

import { useActionState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { acceptInvitation, type AcceptState } from "./actions";

export function AcceptForm({ token }: { token: string }) {
  const [state, action] = useActionState<AcceptState, FormData>(acceptInvitation, {});
  return (
    <form action={action} className="flex flex-col gap-4">
      <input type="hidden" name="token" value={token} />
      {state.error && (
        <p role="alert" className="rounded-xl bg-primary-soft p-3 text-sm text-primary-hover">
          {state.error}
        </p>
      )}
      <SubmitButton pendingText="Uniéndote…">Unirme al equipo</SubmitButton>
    </form>
  );
}
