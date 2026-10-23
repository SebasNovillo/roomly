import { notFound } from "next/navigation";
import { getViewer } from "@/features/auth/viewer";
import { detailHref, parseFilters, type SearchParams } from "@/features/spaces/catalog";
import { getSpace } from "@/features/spaces/queries";
import { CatalogProblem } from "@/features/spaces/components/catalog-view";
import { SpaceDetail } from "@/features/spaces/components/space-detail";
import { parseSelection } from "@/features/bookings/model";
import { getBookingDay } from "@/features/bookings/queries";

export default async function SpaceDetailPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<SearchParams> }) {
  await getViewer();
  const { slug } = await params;
  const query = await searchParams;
  const filters = parseFilters(query);
  const result = await getSpace(slug);
  if (!result.ok) return <CatalogProblem kind={result.kind} retryHref={detailHref(slug, filters)} />;
  if (!result.space) notFound();
  const selection = parseSelection(query);
  const day = await getBookingDay(result.space.id,selection.date);
  return <SpaceDetail space={result.space} filters={filters} booking={{ slug, filters, initialSelection: selection, initialDay: day }} />;
}
