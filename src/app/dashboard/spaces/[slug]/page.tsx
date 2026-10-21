import { notFound } from "next/navigation";
import { getViewer } from "@/features/auth/viewer";
import { detailHref, parseFilters, type SearchParams } from "@/features/spaces/catalog";
import { getSpace } from "@/features/spaces/queries";
import { CatalogProblem } from "@/features/spaces/components/catalog-view";
import { SpaceDetail } from "@/features/spaces/components/space-detail";

export default async function SpaceDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  await getViewer();
  const { slug } = await params;
  const filters = parseFilters(await searchParams);
  const result = await getSpace(slug);
  if (!result.ok) return <CatalogProblem kind={result.kind} retryHref={detailHref(slug, filters)} />;
  if (!result.space) notFound();
  return <SpaceDetail space={result.space} filters={filters} />;
}
