"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, Compass, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { RoomlyLogo } from "./roomly-logo";
import { SignOutButton } from "./sign-out-button";

const destinations = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/spaces", label: "Explore spaces", icon: Compass },
  { href: "/dashboard/bookings", label: "My bookings", icon: CalendarDays },
];

export function AppShell({ name, children }: { name: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => { if (desktop.matches) dialog.current?.close(); };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  useEffect(() => {
    if (!mobileOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mobileOpen]);
  const initials = name.trim().split(/\s+/).slice(0, 2).map(part => Array.from(part)[0]).join("").toLocaleUpperCase();
  function navigation(mobile = false) {
    return <>
      <div className="sidebar-brand"><RoomlyLogo />{mobile && <button className="shell-icon-button" aria-label="Close navigation" onClick={() => dialog.current?.close()}><X size={20} aria-hidden="true" /></button>}</div>
      <nav aria-label={mobile ? "Mobile navigation" : "Main navigation"}>
        {destinations.map(({ href, label, icon: Icon }) => <Link key={href} href={href} className="sidebar-link" aria-current={pathname === href ? "page" : undefined} title={collapsed && !mobile ? label : undefined} onClick={() => dialog.current?.close()}><Icon size={19} aria-hidden="true" /><span className="sidebar-label">{label}</span></Link>)}
      </nav>
      <div className="sidebar-bottom">
        <div className="sidebar-user"><span className="user-avatar" aria-hidden="true">{initials}</span><div className="sidebar-label"><p className="user-name">{name}</p><p className="user-caption">Member</p></div></div>
        <SignOutButton compact={collapsed && !mobile} />
      </div>
    </>;
  }
  return <div className={`roomly-app${collapsed ? " sidebar-collapsed" : ""}`}>
    <a className="skip-link" href="#main-content">Skip to content</a>
    <aside className="desktop-sidebar" aria-label="Workspace sidebar">
      {navigation()}
      <button className="sidebar-collapse shell-icon-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)}>{collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}<span className="sidebar-label">Collapse sidebar</span></button>
    </aside>
    <div className="workspace">
      <header className="mobile-header"><RoomlyLogo /><button className="shell-icon-button" aria-label="Open navigation" aria-haspopup="dialog" aria-controls="workspace-navigation" aria-expanded={mobileOpen} onClick={() => dialog.current?.showModal()}><Menu size={22} aria-hidden="true" /></button></header>
      <main id="main-content" tabIndex={-1} className="workspace-main">{children}</main>
    </div>
    <dialog ref={dialog} id="workspace-navigation" className="mobile-navigation" aria-label="Workspace navigation" onToggle={event => setMobileOpen(event.newState === "open")} onClick={event => { if (event.target === dialog.current) dialog.current.close(); }}>
      <div className="mobile-sidebar">{navigation(true)}</div>
    </dialog>
  </div>;
}
