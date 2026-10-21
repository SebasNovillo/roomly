"use client";

import Link from "next/link";

export default function CatalogError({ reset }: { reset: () => void }) {
  return <section className="catalog-state dashboard-card" role="alert"><h2>We couldn’t open the catalog</h2><p>Please try again, or return to your dashboard.</p><button type="button" className="auth-button" onClick={reset}>Try again</button><Link href="/dashboard" className="text-link">Back to dashboard</Link></section>;
}
