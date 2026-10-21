import Link from "next/link";
import { Search } from "lucide-react";
import { hasFilters, spaceTypes, type CatalogFilters } from "../catalog";
import { AmenitiesFilter } from "./amenities-filter";

export function CatalogFilterForm({ filters }: { filters: CatalogFilters }) {
  const capacities = [2, 4, 8, 10, 12, 16];
  if (filters.minCapacity && !capacities.includes(filters.minCapacity)) capacities.push(filters.minCapacity);
  return <form method="get" action="/dashboard/spaces" className="catalog-filters dashboard-card" aria-label="Search and filters">
    <div className="catalog-search-field"><label htmlFor="space-search">Search</label><div className="search-input-wrap"><Search size={18} aria-hidden="true" /><input id="space-search" name="q" type="search" placeholder="Search spaces" maxLength={120} defaultValue={filters.q} /></div></div>
    <div className="catalog-filter-row">
      <div className="catalog-field"><label htmlFor="space-capacity">Minimum capacity</label><select id="space-capacity" name="minCapacity" defaultValue={filters.minCapacity ?? ""}><option value="">Any capacity</option>{capacities.sort((a, b) => a - b).map(capacity => <option value={capacity} key={capacity}>{capacity}+ people</option>)}</select></div>
      <div className="catalog-field"><label htmlFor="space-type">Space type</label><select id="space-type" name="type" defaultValue={filters.type}><option value="">All space types</option>{Object.entries(spaceTypes).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></div>
      <div className="catalog-field"><span className="catalog-field-label" id="amenities-label">Amenities</span><AmenitiesFilter selected={filters.amenities} /></div>
    </div>
    <div className="filter-actions"><p>Search by name or description. Apply filters to update results.</p><div>{hasFilters(filters) && <Link className="text-link" href="/dashboard/spaces">Clear filters</Link>}<button type="submit" className="auth-button">Apply filters</button></div></div>
  </form>;
}
