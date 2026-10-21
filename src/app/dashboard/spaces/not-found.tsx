import Link from "next/link";

export default function SpaceNotFound() {
  return <section className="catalog-state dashboard-card"><h1>Space not found</h1><p>This space may have been removed from the catalog, or the link may be incorrect.</p><Link className="auth-button" href="/dashboard/spaces">Explore spaces</Link></section>;
}
