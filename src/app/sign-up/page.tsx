import { AuthShell } from "@/components/auth-shell";
import { AuthForm } from "@/components/auth-form";

export default function SignUpPage() {
  return <AuthShell><AuthForm mode="sign-up" /></AuthShell>;
}
