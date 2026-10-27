import { Church, Database, KeyRound, Terminal } from "lucide-react";

const steps = [
  {
    icon: KeyRound,
    title: "1. Add your Supabase keys",
    body: "Create a project at supabase.com, then copy .env.example to .env.local and fill in the URL and anon key.",
    code: "cp .env.example .env.local",
  },
  {
    icon: Database,
    title: "2. Create the database",
    body: "Run the migrations and optional demo seed in the Supabase SQL editor (or with the Supabase CLI).",
    code: "supabase db push\n# then run supabase/seed.sql",
  },
  {
    icon: Terminal,
    title: "3. Create your admin account",
    body: "Sign up once in Supabase Authentication, then promote yourself to admin in the SQL editor.",
    code: "update public.profiles\nset role = 'admin'\nwhere email = 'you@example.com';",
  },
];

export function SetupNotice() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-2xl">
        <div className="mb-8 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-600 text-white">
            <Church className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-xl font-semibold text-slate-900">ChurchOS setup</h1>
            <p className="text-sm text-slate-500">Connect Supabase to start managing your church.</p>
          </div>
        </div>

        <div className="space-y-3">
          {steps.map((step) => (
            <div key={step.title} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-3">
                <span className="rounded-xl bg-indigo-50 p-2 text-indigo-600">
                  <step.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold text-slate-900">{step.title}</h2>
                  <p className="mt-1 text-sm text-slate-500">{step.body}</p>
                  <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 px-3 py-2 text-xs text-slate-100">
                    {step.code}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-xs text-slate-500">
          Full instructions are in <span className="font-medium text-slate-700">README.md</span>. Restart the dev
          server after updating .env.local.
        </p>
      </div>
    </div>
  );
}
