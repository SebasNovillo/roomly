import Link from "next/link";
import type { Space } from "@/features/spaces/catalog";
import type { Selection } from "../model";
import { BookingSummary } from "./booking-summary";
import { ConfirmForm } from "./confirm-form";

export function ReviewView({ space, selection, requestId, changeHref, issue }: { space: Space; selection: Selection; requestId: string; changeHref: string; issue: string | null }) {
  return <div className="booking-page">
    <header className="catalog-heading"><p className="catalog-eyebrow">One more step</p><h1>Review your booking</h1><p>Check the details before confirming your space.</p></header>
    <BookingSummary space={space} selection={selection} />
    <div className="dashboard-card booking-review-actions">
      {issue && <p role="alert" className="booking-error">{issue}</p>}
      <Link className="text-link" href={changeHref}>Change date or time</Link>
      <ConfirmForm spaceId={space.id} requestId={requestId} selection={selection} disabled={Boolean(issue)} />
    </div>
  </div>;
}
