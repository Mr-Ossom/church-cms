import Link from "next/link";
import { Church, LayoutDashboard, LogOut } from "lucide-react";
import { getChurchSettings, requireUser } from "@/lib/auth";
import { signOut } from "@/app/actions/auth";
import { PortalNav } from "@/components/portal/portal-nav";
import { PwaInstallPrompt } from "@/components/portal/pwa-install-prompt";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const { supabase, profile } = await requireUser();
  const settings = await getChurchSettings(supabase);
  const isTeam = profile.role !== "member";

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur print:hidden">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-4">
          <Link href="/portal" className="flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <Church className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">{settings.name}</p>
              <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">
                Member portal
              </p>
            </div>
          </Link>
          <div className="flex items-center gap-1">
            {isTeam ? (
              <Link
                href="/dashboard"
                title="Back to dashboard"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-indigo-600"
              >
                <LayoutDashboard className="h-4 w-4" />
              </Link>
            ) : null}
            <form action={signOut}>
              <button
                type="submit"
                title="Sign out"
                className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-rose-600"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6">{children}</main>

      <PwaInstallPrompt />
      <PortalNav />
    </div>
  );
}
