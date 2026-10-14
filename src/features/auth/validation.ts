import { z } from "zod";

const email = z.string().trim().pipe(z.email("Enter a valid email address.").max(254));
const password = z.string().min(1, "Enter your password.").max(128, "Use at most 128 characters.");

export const signInSchema = z.object({ email, password });
export const signUpSchema = signInSchema.extend({
  fullName: z.string().trim().min(2, "Enter your full name (at least 2 characters).").max(100, "Use at most 100 characters."),
  password: password.min(8, "Use at least 8 characters."),
  confirmPassword: z.string(),
}).refine((value) => value.password === value.confirmPassword, {
  path: ["confirmPassword"], message: "Passwords do not match.",
});

// Deliberately allow only destinations implemented by this application.
export function safeDestination(value: unknown): string {
  return value === "/" || value === "/dashboard" ? value : "/dashboard";
}

export type AuthState = {
  errors?: Record<string, string[] | undefined>;
  message?: string;
  checkEmail?: boolean;
};
