"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, HandCoins, Home, Megaphone, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const items = [
  { href: "/portal", label: "Home", icon: Home },
  { href: "/portal/events", label: "Events", icon: CalendarDays },
  { href: "/portal/announcements", label: "News", icon: Megaphone },
  { href: "/portal/giving", label: "Giving", icon: HandCoins },
  { href: "/portal/profile", label: "Profile", icon: UserRound },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur print:hidden">
      <div className="mx-auto grid max-w-xl grid-cols-5">
        {items.map((item) => {
          const active =
            item.href === "/portal"
              ? pathname === "/portal"
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium transition-colors",
                active ? "text-indigo-600" : "text-slate-500 hover:text-slate-900",
              )}
            >
              <item.icon className={cn("h-5 w-5", active ? "text-indigo-600" : "text-slate-400")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
