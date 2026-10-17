import { WorkspacePlaceholder } from "@/components/workspace-placeholder";
import { getViewer } from "@/features/auth/viewer";

export default async function SpacesPage() {
  await getViewer();
  return <WorkspacePlaceholder kind="spaces" />;
}
