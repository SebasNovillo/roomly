import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";
import { safeDestination } from "@/features/auth/validation";

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const params = await searchParams;
  return <AuthShell><AuthForm mode="sign-in" next={safeDestination(params.next)} confirmationError={params.error === "confirmation"} /></AuthShell>;
}
