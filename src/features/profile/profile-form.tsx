"use client";

import { useActionState, useState } from "react";
import { updateProfile } from "./actions";

export function ProfileForm({ name, email, timezone }: { name: string; email: string; timezone: string }) {
  const [draftName, setName] = useState(name);
  const [draftTimezone, setTimezone] = useState(timezone);
  const [state, action, pending] = useActionState(updateProfile, {});
  const changed = draftName.trim() !== name || draftTimezone.trim() !== timezone;

  return (
    <form action={action} className="dashboard-card min-w-0 p-6" aria-busy={pending}>
      <h2>Personal details</h2>
      <p className="mt-1">Keep your member information up to date.</p>
      <fieldset disabled={pending} className="mt-6 grid min-w-0 gap-5">
        <label className="grid gap-2 text-sm">
          Full name
          <input className="auth-input" name="fullName" value={draftName} onChange={event => setName(event.target.value)} required maxLength={100} autoComplete="name" />
        </label>
        <label className="grid gap-2 text-sm">
          Email address
          <input className="auth-input" value={email} readOnly aria-describedby="profile-email-help" />
          <span id="profile-email-help" className="text-muted">Email changes are not available yet.</span>
        </label>
        <label className="grid gap-2 text-sm">
          Time zone
          <input className="auth-input" name="timezone" value={draftTimezone} onChange={event => setTimezone(event.target.value)} required maxLength={100} aria-describedby="profile-timezone-help" />
          <span id="profile-timezone-help" className="text-muted">Roomly bookings are displayed in America/Chicago.</span>
        </label>
        <div className="flex flex-wrap justify-end gap-3 border-t border-line pt-4">
          <button type="button" className="shell-icon-button px-4 disabled:opacity-50" disabled={!changed} onClick={() => { setName(name); setTimezone(timezone); }}>Discard changes</button>
          <button className="auth-button" disabled={!changed}>{pending ? "Saving…" : "Save changes"}</button>
        </div>
      </fieldset>
      {state.error && <p className="mt-3" role="alert">{state.error}</p>}
      {state.saved && !changed && <p className="mt-3" role="status">Profile saved.</p>}
    </form>
  );
}
