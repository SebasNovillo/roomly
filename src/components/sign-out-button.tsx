"use client";

import { useActionState } from "react";
import { signOut } from "@/features/auth/actions";
import type { AuthState } from "@/features/auth/validation";

export function SignOutButton() {
  const [state, action, pending] = useActionState<AuthState, FormData>(signOut, {});
  return <form action={action} aria-busy={pending}>
    <button type="submit" disabled={pending} className="auth-button">{pending ? "Signing out…" : "Sign out"}</button>
    {state.message && <p role="alert" className="auth-error mt-3">{state.message}</p>}
  </form>;
}
