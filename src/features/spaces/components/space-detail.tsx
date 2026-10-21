import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { catalogHref, spaceTypes, type CatalogFilters, type Space } from "../catalog";
import { SpaceProperties } from "./catalog-view";
import { SpacePhoto } from "./space-photo";

export function SpaceDetail({ space, filters }: { space: Space; filters: CatalogFilters }) {
  return <div className="space-detail"><Link className="text-link catalog-back" href={catalogHref(filters)}><ArrowLeft size={16} aria-hidden="true" />Back to spaces</Link><header className="catalog-heading"><p className="catalog-eyebrow">{spaceTypes[space.type]}</p><h1>{space.name}</h1>{space.is_demo && <p className="catalog-demo-note">Fictional portfolio space · Photos are illustrative.</p>}</header>
    <div className="space-detail-layout"><section className="space-detail-gallery" aria-label="Space photos">{space.images.length ? space.images.map((image, index) => <figure className="dashboard-card" key={image.sort_order}><SpacePhoto image={image} priority={index === 0} /><figcaption>{image.alt_text}{image.source_credit && <span>{image.source_credit}</span>}</figcaption></figure>) : <div className="space-detail-no-photo dashboard-card"><SpacePhoto /></div>}</section><section className="space-information dashboard-card"><h2>About this space</h2><p className="space-description">{space.description}</p><SpaceProperties space={space} /><p className="booking-scope-note">This is the space catalog. Reservations and availability checks are not offered yet.</p></section></div>
  </div>;
}
