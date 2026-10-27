"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  CalendarDays,
  ClipboardCheck,
  HandCoins,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  Users,
  UsersRound,
  Home,
  Church,
  X,
} from "lucide-react";
import { signOut } from "@/app/actions/auth";
import { cn } from "@/lib/utils";
import { roleLabel } from "@/lib/labels";
import type { UserRole } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "pastor", "leader"] },
  { href: "/members", label: "Members", icon: Users, roles: ["admin", "pastor"] },
  { href: "/families", label: "Families", icon: Home, roles: ["admin", "pastor"] },
  { href: "/groups", label: "Groups & ministries", icon: UsersRound, roles: ["admin", "pastor", "leader"] },
  { href: "/events", label: "Events", icon: CalendarDays, roles: ["admin", "pastor", "leader"] },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck, roles: ["admin", "pastor", "leader"] },
  { href: "/giving", label: "Giving", icon: HandCoins, roles: ["admin", "pastor"] },
  { href: "/communication", label: "Communication", icon: Megaphone, roles: ["admin", "pastor", "leader"] },
  { href: "/reports", label: "Reports", icon: BarChart3, roles: ["admin", "pastor"] },
];

export function AppShell({
  children,
  churchName,
  fullName,
  email,
  role,
}: {
  children: React.ReactNode;
  churchName: string;
  fullName: string | null;
  email: string | null;
  role: UserRole;
}) {
  const pathname = usePathname();
  const [openPath, setOpenPath] = useState<string | null>(null);
  const open = openPath === pathname;

  const visibleItems = navItems.filter((item) => item.roles.includes(role));
  const activeItem = visibleItems.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
  const initialsName = (fullName ?? email ?? "User").split(" ");

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="flex h-16 items-center gap-2.5 border-b border-slate-200 px-5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <Church className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-900">{churchName}</p>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">ChurchOS</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Manage
        </p>
        {visibleItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <item.icon className={cn("h-[18px] w-[18px]", active ? "text-indigo-600" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}

        <div className="pt-3">
          <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Personal
          </p>
          <Link
            href="/portal"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              pathname.startsWith("/portal")
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
            )}
          >
            <Home
              className={cn(
                "h-[18px] w-[18px]",
                pathname.startsWith("/portal") ? "text-indigo-600" : "text-slate-400",
              )}
            />
            Member portal
          </Link>
          {role === "admin" ? (
            <Link
              href="/settings"
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                pathname.startsWith("/settings")
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
              )}
            >
              <Settings
                className={cn(
                  "h-[18px] w-[18px]",
                  pathname.startsWith("/settings") ? "text-indigo-600" : "text-slate-400",
                )}
              />
              Settings
            </Link>
          ) : null}
        </div>
      </nav>

      <div className="border-t border-slate-200 p-3">
        <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
          <Avatar
            firstName={initialsName[0]}
            lastName={initialsName[1]}
            size="sm"
            className="ring-slate-100"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{fullName ?? email}</p>
            <p className="text-xs text-slate-500">{roleLabel[role]}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              title="Sign out"
              className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white hover:text-rose-600"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r border-slate-200 bg-white lg:block">
        {sidebar}
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
            onClick={() => setOpenPath(null)}
          />
          <aside
            className="absolute inset-y-0 left-0 w-72 max-w-[85vw] bg-white shadow-2xl"
            onClick={() => setOpenPath(null)}
          >
            <button
              type="button"
              onClick={() => setOpenPath(null)}
              className="absolute right-3 top-4 rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              aria-label="Close menu"
            >
              <X className="h-4 w-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      ) : null}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:px-8">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpenPath(pathname)}
              className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {activeItem?.label ?? "ChurchOS"}
              </p>
              <p className="hidden text-xs text-slate-500 sm:block">{churchName}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600 sm:inline-flex">
              {roleLabel[role]}
            </span>
            <Avatar firstName={initialsName[0]} lastName={initialsName[1]} size="sm" />
          </div>
        </header>
        <main className="mx-auto max-w-7xl px-4 py-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
