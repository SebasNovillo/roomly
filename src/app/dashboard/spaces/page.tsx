import { getViewer } from "@/features/auth/viewer";
import { parseFilters, type SearchParams } from "@/features/spaces/catalog";
import { getCatalog } from "@/features/spaces/queries";
import { CatalogView } from "@/features/spaces/components/catalog-view";

export default async function SpacesPage({ searchParams }: { searchParams?: Promise<SearchParams> }) {
  await getViewer();
  const filters = parseFilters(await searchParams ?? {});
  const result = await getCatalog(filters);
  return <CatalogView filters={filters} result={result} />;
}
