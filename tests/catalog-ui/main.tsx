import { createRoot } from "react-dom/client";
import { AppShell } from "../../src/components/app-shell";
import { CatalogView } from "../../src/features/spaces/components/catalog-view";
import { SpaceDetail } from "../../src/features/spaces/components/space-detail";
import { parseFilters, type CatalogResult } from "../../src/features/spaces/catalog";
import { portfolioSpaces } from "../fixtures/spaces";
import { portfolioDetails } from "../fixtures/space-details";
import SpaceNotFound from "../../src/app/dashboard/spaces/not-found";
import { bookingHref, parseSelection, selectionIssue } from "../../src/features/bookings/model";
import { ReviewView } from "../../src/features/bookings/components/review-view";
import { ConfirmationView } from "../../src/features/bookings/components/confirmation-view";
import { bookingFixtureDay, bookingFixtureId } from "../fixtures/bookings";

const params = new URLSearchParams(location.search);
const filters = parseFilters({ ...Object.fromEntries(params), amenity: params.getAll("amenity") });
const spaces = portfolioSpaces.filter(space => (!filters.q || `${space.name} ${space.description}`.toLowerCase().includes(filters.q.toLowerCase()))
  && (!filters.minCapacity || space.capacity >= filters.minCapacity) && (!filters.type || space.type === filters.type)
  && filters.amenities.every(amenity => space.amenities.includes(amenity)));
const state = params.get("fixtureState");
const result: CatalogResult = state === "setup" || state === "load" ? { ok: false, kind: state }
  : { ok: true, spaces: state === "empty" ? [] : spaces, total: state === "empty" ? 0 : spaces.length };
const slug = location.pathname.split("/")[3];
let space = portfolioDetails.find(space => space.slug === slug);
if (space && state === "detail-unavailable") space = { ...space, openingHours: { ok: false }, rules: { ok: false } };
if (space && state === "detail-closed") space = { ...space, openingHours: { ok: true, rows: [{ weekday: 0, is_closed: true, opens_at: null, closes_at: null }] } };
if (space && state === "no-images") space = { ...space, images: [] };
const selection = parseSelection(Object.fromEntries(params));
const day = bookingFixtureDay;
const bookingProps = params.has("bookingPreview") || params.has("date") ? { slug,filters,initialSelection:selection,initialDay:day } : undefined;
const review = location.pathname.endsWith("/review");
const confirmation = location.pathname.includes("/reservations/");
const content = confirmation ? <ConfirmationView reservation={{ id:bookingFixtureId,space_id:portfolioDetails[0].id,starts_at:"2027-01-05T15:00:00Z",ends_at:"2027-01-05T16:00:00Z",status:"confirmed" }} space={portfolioDetails[0]} />
  : review && space ? <ReviewView space={space} selection={selection} requestId={params.get("request") ?? bookingFixtureId} changeHref={bookingHref(space.slug,filters,selection)} issue={selectionIssue(selection,day,Date.parse("2027-01-05T12:00:00Z"))} />
  : slug ? space ? <SpaceDetail space={space} filters={filters} booking={bookingProps} /> : <SpaceNotFound /> : <CatalogView filters={filters} result={result} />;
createRoot(document.getElementById("root")!).render(<AppShell name="UI test account">{content}</AppShell>);
