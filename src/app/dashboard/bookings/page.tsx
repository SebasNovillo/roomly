import { WorkspacePlaceholder } from "@/components/workspace-placeholder";
import { getViewer } from "@/features/auth/viewer";

export default async function BookingsPage() {
  await getViewer();
  return <WorkspacePlaceholder kind="bookings" />;
}
