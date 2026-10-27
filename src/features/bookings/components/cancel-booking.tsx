"use client";

import { useActionState, useEffect, useId, useRef } from "react";
import { Info } from "lucide-react";
import { cancelReservation } from "../cancellation";
import { reservationDateLabel, type BookingCard } from "../my-bookings";
import { timeLabel } from "../model";

export function CancelBooking({ booking }: {booking:BookingCard}) {
  const dialog = useRef<HTMLDialogElement>(null), trigger = useRef<HTMLButtonElement>(null), keep = useRef<HTMLButtonElement>(null);
  const titleId = useId(), descriptionId = useId();
  const [state,action,pending] = useActionState(cancelReservation,{});
  const busy = pending;
  function close() { dialog.current?.close(); trigger.current?.focus(); }
  useEffect(()=>{
    if(!dialog.current?.open) return;
    if(pending) dialog.current.focus();
    else if(document.activeElement === dialog.current) keep.current?.focus();
  },[pending]);
  return <>
    <button ref={trigger} className="cancel-booking-link" type="button" onClick={() => { dialog.current?.showModal(); keep.current?.focus(); }}>Cancel booking</button>
    <dialog ref={dialog} className="cancellation-dialog" aria-labelledby={titleId} aria-describedby={descriptionId} tabIndex={-1}
      onKeyDown={event=>{
        if(event.key !== "Tab") return;
        const controls=dialog.current?.querySelectorAll<HTMLButtonElement>("button:not([disabled])");
        if(!controls?.length) {event.preventDefault();dialog.current?.focus();return;}
        const first=controls[0],last=controls[controls.length-1];
        if(event.shiftKey && (document.activeElement === first || document.activeElement === dialog.current)) {event.preventDefault();last.focus();}
        else if(!event.shiftKey && (document.activeElement === last || document.activeElement === dialog.current)) {event.preventDefault();first.focus();}
      }}
      onCancel={event => { event.preventDefault(); if (!busy) close(); }} onClose={() => trigger.current?.focus()}>
      <span className="cancellation-icon"><Info size={19} aria-hidden="true" /></span>
      <h2 id={titleId}>Cancel this booking?</h2>
      <p id={descriptionId}>Your reservation will be cancelled. This releases your reserved time, subject to current opening hours and other restrictions.</p>
      <div className="cancellation-summary"><h3>{booking.space?.name ?? "Space details unavailable"}</h3><p>{reservationDateLabel(booking.starts_at)}</p><p>{timeLabel(booking.starts_at)}–{timeLabel(booking.ends_at)}</p><p className="cancellation-timezone">America/Chicago</p></div>
      <form action={action} aria-busy={busy}>
        <input type="hidden" name="reservationId" value={booking.id} />
        {state.message && <p role="alert" className="booking-error">{state.message}</p>}
        <div className="cancellation-actions"><button ref={keep} type="button" className="keep-booking-button" disabled={busy} onClick={close}>Keep booking</button>
          <button type="submit" className="cancel-booking-button" disabled={busy}>{busy ? "Cancelling booking…" : "Cancel booking"}</button></div>
        {busy && <p className="availability-note" role="status">Cancelling your booking. Please wait.</p>}
      </form>
    </dialog>
  </>;
}
