import { getViewer } from "@/features/auth/viewer";
import { DashboardContent } from "@/components/dashboard-content";
import { getDashboardBookings } from "@/features/dashboard/queries";

export default async function DashboardPage() {
  const { name, id } = await getViewer();
  const result=await getDashboardBookings();
  return <DashboardContent key={id} accountId={id} name={name} now={result.ok ? result.dashboard.now : new Date().toISOString()} result={result} />;
}
