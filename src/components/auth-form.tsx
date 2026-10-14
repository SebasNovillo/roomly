"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, MailCheck } from "lucide-react";
import { signIn, signUp } from "@/features/auth/actions";
import type { AuthState } from "@/features/auth/validation";

export function AuthForm({ mode, next = "/dashboard", confirmationError = false }: {
  mode: "sign-in" | "sign-up"; next?: string; confirmationError?: boolean;
}) {
  const registering = mode === "sign-up";
  const [state, action, pending] = useActionState<AuthState, FormData>(registering ? signUp : signIn, {});
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const fields = [
    ...(registering ? [{ name: "fullName", label: "Full name", type: "text", autocomplete: "name", placeholder: "Your full name" }] : []),
    { name: "email", label: "Email", type: "email", autocomplete: "email", placeholder: "you@example.com" },
    { name: "password", label: "Password", type: "password", autocomplete: registering ? "new-password" : "current-password", placeholder: "Enter your password" },
    ...(registering ? [{ name: "confirmPassword", label: "Confirm password", type: "password", autocomplete: "new-password", placeholder: "Confirm your password" }] : []),
  ];
  if (state.checkEmail) return (
    <div role="status" className="space-y-5 text-center">
      <MailCheck className="mx-auto text-primary" size={40} aria-hidden="true" />
      <h1 className="font-display text-3xl font-bold">Check your email</h1>
      <p className="leading-relaxed text-muted">If registration can proceed, you’ll receive an email with a link to confirm your account. Check your inbox and spam folder.</p>
      <Link href="/sign-in" className="auth-button">Back to sign in</Link>
    </div>
  );
  return (
    <>
      <h1 className="font-display text-3xl font-bold tracking-tight">{registering ? "Create your account" : "Welcome back"}</h1>
      <p className="mt-3 text-muted">{registering ? "Make room for what comes next." : "Sign in to your Roomly account."}</p>
      {confirmationError && <p role="alert" className="auth-error mt-6">This confirmation link is invalid or has expired. If you already confirmed your email, sign in. Otherwise, contact support for a new confirmation email.</p>}
      <form action={action} noValidate className="mt-8 space-y-5" aria-busy={pending}>
        <input type="hidden" name="next" value={next} />
        {fields.map((field) => {
          const error = state.errors?.[field.name]?.[0];
          const isPassword = field.type === "password";
          const hint = registering && field.name === "password";
          return (
            <div key={field.name}>
              <label htmlFor={field.name} className="mb-2 block text-sm font-semibold">{field.label}</label>
              <div className="relative">
                <input id={field.name} name={field.name} type={isPassword && visible[field.name] ? "text" : field.type}
                  autoComplete={field.autocomplete} placeholder={field.placeholder} required
                  maxLength={field.name === "fullName" ? 100 : field.name === "email" ? 254 : 128}
                  aria-invalid={!!error} aria-describedby={[error ? `${field.name}-error` : "", hint ? "password-hint" : ""].filter(Boolean).join(" ") || undefined}
                  className={`auth-input ${isPassword ? "pr-14" : ""}`} />
                {isPassword && <button type="button" aria-label={`${visible[field.name] ? "Hide" : "Show"} ${field.label.toLowerCase()}`}
                  aria-pressed={!!visible[field.name]} onClick={() => setVisible((current) => ({ ...current, [field.name]: !current[field.name] }))}
                  className="absolute inset-y-0 right-0 flex w-12 items-center justify-center rounded-r-xl text-muted hover:text-primary">
                  {visible[field.name] ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                </button>}
              </div>
              {hint && <p id="password-hint" className="mt-2 text-xs text-muted">Use 8–128 characters.</p>}
              {error && <p id={`${field.name}-error`} role="alert" className="auth-error mt-2">{error}</p>}
            </div>
          );
        })}
        {state.message && <p role="alert" className="auth-error">{state.message}</p>}
        <button className="auth-button w-full" disabled={pending} type="submit">{pending ? (registering ? "Creating account…" : "Signing in…") : (registering ? "Create account" : "Sign in")}</button>
      </form>
      <p className="mt-7 text-center text-sm text-muted">{registering ? "Already have an account?" : "New to Roomly?"}{" "}
        <Link className="font-semibold text-primary underline-offset-4 hover:underline" href={registering ? "/sign-in" : "/sign-up"}>{registering ? "Sign in" : "Create account"}</Link>
      </p>
    </>
  );
}
