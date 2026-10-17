"use client";

import { useActionState } from "react";
import { signOut } from "@/features/auth/actions";
import type { AuthState } from "@/features/auth/validation";
import { LogOut } from "lucide-react";

export function SignOutButton({ compact = false }: { compact?: boolean }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(signOut, {});
  return <form action={action} aria-busy={pending}>
    <button type="submit" disabled={pending} aria-label={compact ? (pending ? "Signing out…" : "Sign out") : undefined} title={compact ? "Sign out" : undefined} className="sign-out-button"><LogOut size={18} aria-hidden="true" />{!compact && <span>{pending ? "Signing out…" : "Sign out"}</span>}</button>
    {state.message && <p role="alert" className="auth-error mt-3">{state.message}</p>}
  </form>;
}
