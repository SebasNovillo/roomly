import { getViewer } from "@/features/auth/viewer";
import { DashboardContent } from "@/components/dashboard-content";

export default async function DashboardPage() {
  const { name } = await getViewer();
  return <DashboardContent name={name} now={new Date().toISOString()} />;
}
