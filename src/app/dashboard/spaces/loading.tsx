export default function SpacesLoading() {
  return <div className="catalog-loading" role="status" aria-busy="true"><p>Loading spaces…</p><div className="catalog-skeleton-panel" /><div className="space-grid">{[0, 1, 2].map(index => <div className="catalog-skeleton-card" key={index} />)}</div></div>;
}
