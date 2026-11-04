"use client";

import { useEffect, useId, useRef } from "react";
import Link from "next/link";
import { UserRound } from "lucide-react";
import { SignOutButton } from "./sign-out-button";

export function AccountMenu({ name, email, initials, collapsed }: {
  name: string;
  email: string;
  initials: string;
  collapsed: boolean;
}) {
  const id = useId();
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const popover = panel.current;
    const sidebar = popover?.closest("aside");
    function dismiss() {
      if (popover?.matches(":popover-open")) popover.hidePopover();
    }
    window.addEventListener("resize", dismiss);
    sidebar?.addEventListener("scroll", dismiss);
    return () => {
      window.removeEventListener("resize", dismiss);
      sidebar?.removeEventListener("scroll", dismiss);
    };
  }, []);

  return (
    <>
      <button
        type="button"
        className="sidebar-user account-trigger"
        aria-label={`Account options for ${name}`}
        title={collapsed ? "Account options" : undefined}
        popoverTarget={id}
        onClick={event => {
          const trigger = event.currentTarget.getBoundingClientRect();
          panel.current?.style.setProperty("--account-left", `${trigger.left}px`);
          panel.current?.style.setProperty("--account-top", `${trigger.top}px`);
        }}
      >
        <span className="user-avatar" aria-hidden="true">{initials}</span>
        <span className="sidebar-label">
          <span className="user-name block">{name}</span>
          <span className="user-caption block">Member</span>
        </span>
      </button>
      <div id={id} ref={panel} popover="auto" className="account-popover" aria-label="Account options">
        <div className="account-identity">
          <p className="user-name">{name}</p>
          <p className="user-caption">{email}</p>
          <p className="account-role">Member</p>
        </div>
        <Link className="account-profile sign-out-button" href="/dashboard/profile" onClick={() => panel.current?.hidePopover()}>
          <UserRound size={18} aria-hidden="true" />My profile
        </Link>
        <SignOutButton />
      </div>
    </>
  );
}
