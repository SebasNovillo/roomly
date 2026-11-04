import { getViewer } from "@/features/auth/viewer";
import { ProfileForm } from "@/features/profile/profile-form";

export default async function ProfilePage() {
  const viewer = await getViewer();
  return (
    <>
      <header className="dashboard-heading"><div><h1>My profile</h1><p>Manage your personal details.</p></div></header>
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="dashboard-card min-w-0 p-6">
          <span className="user-avatar mb-4 w-10" aria-hidden="true">{viewer.name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toLocaleUpperCase()}</span>
          <h2 className="break-words">{viewer.name}</h2>
          <p className="break-all">{viewer.email}</p>
          <span className="booking-status status-in-progress mt-2">Member</span>
        </section>
        {viewer.timezone
          ? <ProfileForm name={viewer.name} email={viewer.email} timezone={viewer.timezone} />
          : <section className="dashboard-card p-6" role="alert"><h2>Profile unavailable</h2><p>Reload the page to try again.</p></section>}
      </div>
    </>
  );
}
