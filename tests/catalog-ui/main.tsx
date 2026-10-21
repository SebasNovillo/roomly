import { createRoot } from "react-dom/client";
import { AppShell } from "../../src/components/app-shell";
import { CatalogView } from "../../src/features/spaces/components/catalog-view";
import { SpaceDetail } from "../../src/features/spaces/components/space-detail";
import { parseFilters, type CatalogResult } from "../../src/features/spaces/catalog";
import { portfolioSpaces } from "../fixtures/spaces";
import SpaceNotFound from "../../src/app/dashboard/spaces/not-found";

const params = new URLSearchParams(location.search);
const filters = parseFilters({ ...Object.fromEntries(params), amenity: params.getAll("amenity") });
const spaces = portfolioSpaces.filter(space => (!filters.q || `${space.name} ${space.description}`.toLowerCase().includes(filters.q.toLowerCase()))
  && (!filters.minCapacity || space.capacity >= filters.minCapacity) && (!filters.type || space.type === filters.type)
  && filters.amenities.every(amenity => space.amenities.includes(amenity)));
const state = params.get("fixtureState");
const result: CatalogResult = state === "setup" || state === "load" ? { ok: false, kind: state }
  : { ok: true, spaces: state === "empty" ? [] : spaces, total: state === "empty" ? 0 : spaces.length };
const slug = location.pathname.split("/")[3];
const space = portfolioSpaces.find(space => space.slug === slug);
createRoot(document.getElementById("root")!).render(<AppShell name="UI test account">{slug ? space ? <SpaceDetail space={space} filters={filters} /> : <SpaceNotFound /> : <CatalogView filters={filters} result={result} />}</AppShell>);
