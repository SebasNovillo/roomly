# Profile

The dashboard reads the authenticated user's profile. The versioned SQL migration in `supabase/migrations` creates profiles on registration, enforces ownership with RLS, and restricts editable columns. Apply it manually as described in `docs/authentication.md`. A profile editing screen is not implemented.
