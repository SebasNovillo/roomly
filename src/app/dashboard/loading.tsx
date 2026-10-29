import { DashboardContent } from "@/components/dashboard-content";

export default function DashboardLoading() {
  return <DashboardContent name="" now={new Date().toISOString()} result={null} />;
}
