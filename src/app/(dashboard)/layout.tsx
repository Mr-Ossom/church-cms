import { AppShell } from "@/components/layout/app-shell";
import { SetupNotice } from "@/components/setup-notice";
import { getChurchSettings, requireTeam } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const { supabase, profile } = await requireTeam();
  const settings = await getChurchSettings(supabase);

  return (
    <AppShell
      churchName={settings.name}
      fullName={profile.full_name}
      email={profile.email}
      role={profile.role}
    >
      {children}
    </AppShell>
  );
}
