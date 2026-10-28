"use client";

import { useActionState } from "react";
import Link from "next/link";
import { confirmBooking } from "../actions";
import type { Selection } from "../model";

export function ConfirmForm({ spaceId, requestId, selection, disabled = false }: { spaceId: string; requestId: string; selection: Selection; disabled?: boolean }) {
  const [state, action, pending] = useActionState(confirmBooking, {});
  return <form action={action} className="confirm-booking-form">
    <input type="hidden" name="spaceId" value={spaceId} />
    <input type="hidden" name="requestId" value={requestId} />
    {Object.entries(selection).map(([key,value]) => <input type="hidden" key={key} name={key} value={value} />)}
    {state.message && <p role="alert" className="booking-error">{state.message}{state.conflict === "user-schedule" && <><br /><Link className="text-link" href="/dashboard/bookings?tab=upcoming">My bookings</Link></>}</p>}
    <button className="auth-button" disabled={pending || disabled}>{pending ? "Confirming booking…" : "Confirm booking"}</button>
    <p className="availability-note">Your booking is confirmed only after this step succeeds.</p>
  </form>;
}
