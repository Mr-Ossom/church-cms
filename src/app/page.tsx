import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/auth";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { SetupNotice } from "@/components/setup-notice";

export default async function Home() {
  if (!isSupabaseConfigured) {
    return <SetupNotice />;
  }

  const context = await getSessionContext();
  if (!context) {
    redirect("/login");
  }

  redirect(context.profile.role === "member" ? "/portal" : "/dashboard");
}
