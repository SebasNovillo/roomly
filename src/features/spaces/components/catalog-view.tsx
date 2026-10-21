import Link from "next/link";
import { ChevronRight, Compass, MapPin, SearchX, Users } from "lucide-react";
import { amenityLabels, catalogHref, detailHref, filterQuery, hasFilters, PAGE_SIZE, spaceTypes, type CatalogFailure, type CatalogFilters, type CatalogResult, type Space } from "../catalog";
import { CatalogFilterForm } from "./catalog-filters";
import { SpacePhoto } from "./space-photo";

export function CatalogHeading() {
  return <header className="catalog-heading"><p className="catalog-eyebrow">Your space, your schedule</p><h1>Find your next space</h1><p>A quiet place to focus or a room to bring everyone together.</p></header>;
}

export function SpaceProperties({ space }: { space: Space }) {
  return <><div className="space-meta"><span><MapPin size={15} aria-hidden="true" />Floor {space.floor}</span><span><Users size={16} aria-hidden="true" />{space.capacity} {space.capacity === 1 ? "person" : "people"}</span></div><ul className="space-amenities" aria-label="Amenities">{space.amenities.map(key => <li key={key}>{amenityLabels[key]}</li>)}</ul>{!space.amenities.length && <p className="space-no-amenities">No amenities listed.</p>}</>;
}

export function CatalogProblem({ kind, retryHref }: { kind: CatalogFailure["kind"]; retryHref: string }) {
  return <section className="catalog-state dashboard-card" role="alert"><Compass size={30} aria-hidden="true" /><h2>{kind === "setup" ? "Catalog setup needed" : "We couldn’t load the spaces"}</h2><p>{kind === "setup" ? "The catalog database is not ready or access needs to be checked. This is a setup issue, not an empty catalog." : "The catalog could not be reached or its records could not be read. Please try again."}</p><a className="auth-button" href={retryHref}>Try again</a><Link className="text-link" href="/dashboard">Back to dashboard</Link></section>;
}

export function CatalogView({ filters, result }: { filters: CatalogFilters; result: CatalogResult }) {
  return <div className="spaces-catalog"><CatalogHeading /><CatalogFilterForm key={filterQuery(filters)} filters={filters} />
    {!result.ok ? <CatalogProblem kind={result.kind} retryHref={catalogHref(filters)} /> : <>
      <div className="catalog-results-heading" role="status"><h2>{result.total} {result.total === 1 ? "space" : "spaces"} found</h2><p>Showing spaces that match your preferences</p></div>
      {result.spaces.some(space => space.is_demo) && <p className="catalog-demo-note">Fictional portfolio spaces · Photos are illustrative.</p>}
      {!result.spaces.length ? <section className="catalog-state dashboard-card"><SearchX size={30} aria-hidden="true" /><h2>{result.total > 0 ? "No spaces on this page" : hasFilters(filters) ? "No spaces match your filters" : "The catalog is empty"}</h2><p>{result.total > 0 ? "Return to the first page to see the matching spaces." : hasFilters(filters) ? "Try a different search, lower capacity, or fewer amenities." : "No active spaces have been published yet. Please check back later."}</p>{result.total > 0 ? <Link className="auth-button" href={catalogHref({ ...filters, page: 1 })}>First page</Link> : hasFilters(filters) ? <Link className="auth-button" href="/dashboard/spaces">Clear filters</Link> : <Link className="auth-button" href="/dashboard">Back to dashboard</Link>}</section> : <div className="space-grid">{result.spaces.map((space, index) => <article className="space-card" key={space.id} aria-labelledby={`space-${space.slug}`}><div className="space-card-photo"><SpacePhoto image={space.images[0]} priority={index < 3} /></div><div className="space-card-body"><p className="space-type">{spaceTypes[space.type]}</p><h2 id={`space-${space.slug}`}>{space.name}</h2><SpaceProperties space={space} /><Link href={detailHref(space.slug, filters)} className="auth-button" aria-label={`View space: ${space.name}`}>View space<ChevronRight size={17} aria-hidden="true" /></Link></div></article>)}</div>}
      {result.total > PAGE_SIZE && <nav className="catalog-pagination" aria-label="Catalog pages">{filters.page > 1 && <Link className="text-link" href={catalogHref({ ...filters, page: filters.page - 1 })}>Previous page</Link>}<span>Page {filters.page} of {Math.ceil(result.total / PAGE_SIZE)}</span>{filters.page * PAGE_SIZE < result.total && <Link className="text-link" href={catalogHref({ ...filters, page: filters.page + 1 })}>Next page</Link>}</nav>}
    </>}
  </div>;
}
