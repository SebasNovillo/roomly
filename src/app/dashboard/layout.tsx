import { AppShell } from "@/components/app-shell";
import { getViewer } from "@/features/auth/viewer";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const viewer = await getViewer();
  return <AppShell name={viewer.name}>
    {viewer.profileUnavailable && <p role="status" className="profile-notice">Your profile is unavailable. Your account is signed in, but profile setup needs to be checked.</p>}
    {children}
  </AppShell>;
}
